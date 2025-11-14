from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import FocusSession, SessionStatus
from .schemas import FocusCreate, FocusResponse, FocusTick, FocusSummary

router = APIRouter(prefix="/focus", tags=["Focus Timer"])


# ---------- helpers ----------
def _cap(v: float, lo: float, hi: float) -> float:
    return min(max(v, lo), hi)


def _compute_growth(
    duration_min: int, elapsed_sec: float, did_pause: bool, status: SessionStatus
) -> float:
    """
    plant growth logic (4 levels):
    - 0.0: Incomplete / abandoned session
    - 0.33: Session completed but with multiple pauses/breaks
    - 0.66: Session completed with 1 short pause
    - 1.0: Session completed fully with no pauses
    """
    if status != SessionStatus.completed:
        return 0.0

    full_required = duration_min * 60
    if elapsed_sec + 0.5 < full_required * 0.7:
        return 0.0

    if not did_pause:
        return 1.0
    elif did_pause and elapsed_sec >= full_required * 0.9:
        return 0.66
    elif did_pause and elapsed_sec >= full_required * 0.6:
        return 0.33
    else:
        return 0.0


def _today_bounds():
    now = datetime.utcnow()
    start = datetime.combine(date.today(), datetime.min.time())
    end = datetime.combine(date.today(), datetime.max.time())
    return start, end


# ---------- endpoints ----------
@router.post("/sessions", response_model=FocusResponse)
def create_session(payload: FocusCreate, db: Session = Depends(get_db)):
    sess = FocusSession(
        title=payload.title, duration_min=payload.duration_min, user_id=payload.user_id
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


@router.post("/sessions/{sid}/start", response_model=FocusResponse)
def start_session(sid: int, db: Session = Depends(get_db)):
    sess = db.get(FocusSession, sid)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.status not in (SessionStatus.created, SessionStatus.paused):
        raise HTTPException(409, f"Cannot start from status {sess.status}")
    if sess.status == SessionStatus.created:
        sess.started_at = datetime.utcnow()
    sess.status = SessionStatus.running
    db.commit()
    db.refresh(sess)
    return sess


@router.post("/sessions/{sid}/pause", response_model=FocusResponse)
def pause_session(sid: int, tick: FocusTick, db: Session = Depends(get_db)):
    sess = db.get(FocusSession, sid)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.status != SessionStatus.running:
        raise HTTPException(409, "Only running sessions can be paused")
    max_sec = sess.duration_min * 60
    sess.elapsed_sec = _cap(tick.elapsed_sec, 0, max_sec)
    sess.pauses_count += 1
    sess.did_pause = True
    sess.status = SessionStatus.paused
    db.commit()
    db.refresh(sess)
    return sess


@router.post("/sessions/{sid}/resume", response_model=FocusResponse)
def resume_session(sid: int, db: Session = Depends(get_db)):
    sess = db.get(FocusSession, sid)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.status != SessionStatus.paused:
        raise HTTPException(409, "Only paused sessions can be resumed")
    sess.status = SessionStatus.running
    db.commit()
    db.refresh(sess)
    return sess


@router.post("/sessions/{sid}/complete", response_model=FocusResponse)
def complete_session(sid: int, tick: FocusTick, db: Session = Depends(get_db)):
    sess = db.get(FocusSession, sid)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.status not in (SessionStatus.running, SessionStatus.paused):
        raise HTTPException(409, "Only running/paused sessions can be completed")
    max_sec = sess.duration_min * 60
    sess.elapsed_sec = _cap(tick.elapsed_sec, 0, max_sec)
    sess.status = SessionStatus.completed
    sess.completed_at = datetime.utcnow()
    sess.plant_growth = _compute_growth(
        sess.duration_min, sess.elapsed_sec, sess.did_pause, sess.status
    )
    db.commit()
    db.refresh(sess)
    return sess


@router.get("/sessions", response_model=list[FocusResponse])
def list_sessions(user_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(FocusSession)
    if user_id is not None:
        q = q.filter(FocusSession.user_id == user_id)
    return q.order_by(
        FocusSession.started_at.desc().nullslast(), FocusSession.id.desc()
    ).all()


@router.get("/summary", response_model=FocusSummary)
def daily_summary(
    user_id: int | None = None,
    day: str | None = Query(None, description="YYYY-MM-DD (UTC). Defaults to today."),
    db: Session = Depends(get_db),
):
    if day:
        y, m, d = map(int, day.split("-"))
        start = datetime(y, m, d, 0, 0, 0)
        end = datetime(y, m, d, 23, 59, 59, 999999)
    else:
        start, end = _today_bounds()

    q = db.query(FocusSession).filter(
        FocusSession.started_at >= start, FocusSession.started_at <= end
    )
    if user_id is not None:
        q = q.filter(FocusSession.user_id == user_id)
    sessions = q.all()

    if not sessions:
        return FocusSummary(
            date=(day or date.today().isoformat()),
            total_elapsed_sec=0,
            active_timer=None,
            daily_plant_growth=0.0,
        )

    total_elapsed = sum(s.elapsed_sec for s in sessions)

    completed_sessions = [s for s in sessions if s.status == SessionStatus.completed]
    if completed_sessions:
        daily_growth = sum(s.plant_growth for s in completed_sessions) / len(
            completed_sessions
        )
    else:
        daily_growth = 0.0

    # active timer (remaining) from most recent running session
    running = [s for s in sessions if s.status == SessionStatus.running]
    active_remaining = None
    if running:
        latest = sorted(
            running, key=lambda s: s.updated_at or s.started_at or datetime.min
        )[-1]
        active_remaining = int(max(0, latest.duration_min * 60 - latest.elapsed_sec))

    return FocusSummary(
        date=(day or date.today().isoformat()),
        total_elapsed_sec=total_elapsed,
        active_timer=active_remaining,
        daily_plant_growth=daily_growth,
    )


@router.get("/status")
def get_focus_status(db: Session = Depends(get_db)):

    active = (
        db.query(FocusSession)
        .filter(FocusSession.status == SessionStatus.running)
        .first()
    )
    if active:
        remaining = int(max(0, active.duration_min * 60 - active.elapsed_sec))
        return {"active": True, "remaining": remaining}
    return {"active": False}
