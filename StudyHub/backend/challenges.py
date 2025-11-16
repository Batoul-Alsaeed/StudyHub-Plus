from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas
from .database import SessionLocal
import json
from typing import List, Optional


router = APIRouter(prefix="/api/challenges", tags=["challenges"])


# ============================================================
# Database Dependency
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# Helper: Recompute Group Progress
# ============================================================
def recompute_group_progress(challenge: models.Challenge) -> None:
    """
    يحسب متوسط التقدم لكل المشاركين بناءً على challenge.progress
    progress = { "user_id": [0/1, 0/1, ...] }
    """
    progress = challenge.progress or {}
    all_pcts: List[float] = []

    for arr in progress.values():
        if not isinstance(arr, list) or not arr:
            continue
        # تأكد أن العناصر 0/1 أو bool
        vals = [1 if bool(x) else 0 for x in arr]
        pct = (sum(vals) / len(vals)) * 100
        all_pcts.append(pct)

    challenge.group_progress = round(sum(all_pcts) / len(all_pcts), 2) if all_pcts else 0.0


# ============================================================
# Helper: Format Final Response
# ============================================================
def format_challenge_response(challenge: models.Challenge, current_user_id: Optional[int] = None):
    """يجهّز ChallengeResponse مع المهام + التقدم حسب المستخدم الحالي."""

    participants = challenge.participants or []
    participants_count = len(participants)

    is_creator = current_user_id is not None and challenge.creator_id == current_user_id
    is_joined = current_user_id is not None and current_user_id in participants

    today = datetime.utcnow().date()
    if challenge.start_date and today < challenge.start_date:
        status = "Upcoming"
    elif challenge.end_date and today > challenge.end_date:
        status = "Ended"
    else:
        status = "Active"

    # progress per user
    progress_map = challenge.progress or {}
    user_key = str(current_user_id) if current_user_id is not None else None
    user_progress_list = progress_map.get(user_key, []) if user_key else []

    # نحول relationship Challenge.tasks إلى list[{"title": ..., "done": ...}]
    tasks_out = []
    for idx, t in enumerate(challenge.tasks or []):
        if user_key and idx < len(user_progress_list):
            done = bool(user_progress_list[idx])
        else:
            done = False
        tasks_out.append(
            {
                "title": t.title,
                "done": done,
            }
        )

    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "level": challenge.level,
        "creator_name": challenge.creator_name,
        "creator_id": challenge.creator_id,
        "start_date": challenge.start_date,
        "end_date": challenge.end_date,
        "tasks": tasks_out,
        "participants": participants,
        "participants_count": participants_count,
        "progress": progress_map,
        "group_progress": challenge.group_progress or 0,
        "max_participants": challenge.max_participants,
        "status": status,
        "is_creator": is_creator,
        "is_joined": is_joined,
    }


# ============================================================
# Create Challenge
# ============================================================
@router.post("", response_model=schemas.ChallengeResponse)
def create_challenge(challenge: schemas.ChallengeCreate, db: Session = Depends(get_db)):
    """
    - ينشئ Challenge
    - ينشئ ChallengeTask لكل عنوان في challenge.tasks
    - يضيف المنشئ كـ participant
    - يهيئ progress للمشاركين
    """

    # نبدأ بتحدي بدون tasks (لأن tasks صارت relationship)
    new_challenge = models.Challenge(
        title=challenge.title,
        description=challenge.description,
        level=challenge.level,
        creator_name=challenge.creator_name,
        creator_id=challenge.creator_id,
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        participants=challenge.participants or [],
        max_participants=challenge.max_participants,
        progress={},
        group_progress=0,
    )

    # Creator auto join
    if challenge.creator_id not in new_challenge.participants:
        new_challenge.participants.append(challenge.creator_id)

    # إنشاء المهام كـ ChallengeTask objects
    for title in challenge.tasks or []:
        title = title.strip()
        if not title:
            continue
        new_challenge.tasks.append(models.ChallengeTask(title=title))

    # تهيئة progress لكل مشارك
    tasks_count = len(new_challenge.tasks or [])
    progress_map = {}
    for uid in new_challenge.participants:
        progress_map[str(uid)] = [0] * tasks_count  # كل المهام غير منجزة

    new_challenge.progress = progress_map
    recompute_group_progress(new_challenge)

    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)

    return format_challenge_response(new_challenge, challenge.creator_id)


# ============================================================
# Get All Challenges
# ============================================================
@router.get("", response_model=List[schemas.ChallengeResponse])
def get_challenges(
    current_user_id: int = Query(None),
    db: Session = Depends(get_db),
):
    challenges = db.query(models.Challenge).all()
    return [format_challenge_response(c, current_user_id) for c in challenges]


# ============================================================
# Get Single Challenge
# ============================================================
@router.get("/{challenge_id}", response_model=schemas.ChallengeResponse)
def get_challenge(
    challenge_id: int,
    current_user_id: int = Query(None),
    db: Session = Depends(get_db),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return format_challenge_response(challenge, current_user_id)


# ============================================================
# Join Challenge
# ============================================================
@router.post("/{challenge_id}/join", response_model=schemas.ChallengeResponse)
def join_challenge(
    challenge_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    # ================================
    # Normalize participants JSONB
    # ================================
    raw_participants = challenge.participants

    if isinstance(raw_participants, str):
        try:
            participants = json.loads(raw_participants)
        except Exception:
            participants = []
    elif isinstance(raw_participants, list):
        participants = raw_participants
    else:
        participants = []

    # تأكد أنهم أعداد صحيحة
    participants = [int(p) for p in participants if str(p).isdigit()]

    if user_id in participants:
        raise HTTPException(status_code=400, detail="User already joined")

    if len(participants) >= challenge.max_participants:
        raise HTTPException(status_code=400, detail="Challenge is full")

    participants.append(user_id)
    challenge.participants = participants

    # progress: نضيف مستخدم جديد بـ list طولها عدد المهام كلها 0
    tasks_count = len(challenge.tasks or [])
    progress_map = challenge.progress or {}
    progress_map[str(user_id)] = [0] * tasks_count
    challenge.progress = progress_map

    # إعادة حساب group_progress
    recompute_group_progress(challenge)

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Toggle Task (per-user)
# ============================================================
@router.patch("/{challenge_id}/task-toggle", response_model=schemas.ChallengeResponse)
def toggle_task(
    challenge_id: int,
    user_id: int = Query(...),
    task_id: int = Query(...),
    db: Session = Depends(get_db),
):
    challenge = (
        db.query(models.Challenge)
        .filter(models.Challenge.id == challenge_id)
        .first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Ensure challenge active
    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    # User must be joined
    if user_id not in (challenge.participants or []):
        raise HTTPException(status_code=403, detail="You must join first")

    # ===== Get the task from the DB =====
    task = (
        db.query(models.ChallengeTask)
        .filter(
            models.ChallengeTask.id == task_id,
            models.ChallengeTask.challenge_id == challenge_id
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Toggle database task
    task.done = not task.done

    # ===== Update user progress =====
    # Count all valid tasks
    all_tasks = challenge.tasks
    total = len(all_tasks)

    if total == 0:
        user_progress = 0.0
    else:
        completed = len([t for t in all_tasks if t.done])
        user_progress = round((completed / total) * 100.0, 2)

    progress_map = challenge.progress or {}
    progress_map[str(user_id)] = user_progress
    challenge.progress = progress_map

    # ===== Update group progress (average) =====
    progresses = list(progress_map.values())
    challenge.group_progress = (
        round(sum(progresses) / len(progresses), 2)
        if progresses else 0.0
    )

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Leave Challenge
# ============================================================
@router.delete("/{challenge_id}/leave", response_model=schemas.ChallengeResponse)
def leave_challenge(
    challenge_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    participants = challenge.participants or []
    if user_id not in participants:
        raise HTTPException(status_code=400, detail="User not joined")

    participants.remove(user_id)
    challenge.participants = participants

    # Remove user progress entry
    progress_map = challenge.progress or {}
    progress_map.pop(str(user_id), None)
    challenge.progress = progress_map

    # Update group progress safely
    recompute_group_progress(challenge)

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Update Challenge (meta + tasks)
# ============================================================
@router.put("/{challenge_id}", response_model=schemas.ChallengeResponse)
def update_challenge(
    challenge_id: int,
    challenge_data: schemas.ChallengeCreate,
    db: Session = Depends(get_db),
):
    """
    - منشئ التحدي يقدر يعدل العنوان/الوصف/التواريخ/العدد
    - يقدر يغير قائمة المهام (نمسح القديمة وننشئ الجديدة)
    - مع تغيير المهام نعيد تهيئة progress لكل المشاركين (تقدم جديد صفر)
    """
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    if challenge_data.max_participants < len(challenge.participants or []):
        raise HTTPException(status_code=400, detail="max_participants too small")

    challenge.title = challenge_data.title
    challenge.description = challenge_data.description
    challenge.level = challenge_data.level
    challenge.start_date = challenge_data.start_date
    challenge.end_date = challenge_data.end_date
    challenge.max_participants = challenge_data.max_participants

    # تحديث المهام:
    if challenge_data.tasks is not None:
        # نحذف المهام القديمة (cascade يحذف ChallengeTask)
        challenge.tasks.clear()

        # ننشئ مهام جديدة
        for title in challenge_data.tasks:
            title = title.strip()
            if not title:
                continue
            challenge.tasks.append(models.ChallengeTask(title=title))

        # عدد المهام الجديد
        new_count = len(challenge.tasks or [])
        # نعيد تهيئة progress لكل المشاركين
        new_progress = {}
        for uid in (challenge.participants or []):
            new_progress[str(uid)] = [0] * new_count

        challenge.progress = new_progress
        recompute_group_progress(challenge)

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, challenge.creator_id)


# ============================================================
# Delete Challenge
# ============================================================
@router.delete("/{challenge_id}")
def delete_challenge(
    challenge_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.creator_id != user_id:
        raise HTTPException(status_code=403, detail="Only the creator can delete")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    db.delete(challenge)
    db.commit()

    return {"message": "Challenge deleted", "challenge_id": challenge_id}


# ============================================================
# Leaderboard
# ============================================================
@router.get("/{challenge_id}/leaderboard")
def get_leaderboard(
    challenge_id: int,
    db: Session = Depends(get_db),
):
    challenge = (
        db.query(models.Challenge)
        .filter(models.Challenge.id == challenge_id)
        .first()
    )

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    participants = challenge.participants or []
    progress = challenge.progress or {}

    leaderboard = []

    for uid in participants:
        uid_str = str(uid)
        user_prog_arr = progress.get(uid_str, [])

        if isinstance(user_prog_arr, list) and len(user_prog_arr) > 0:
            vals = [1 if bool(x) else 0 for x in user_prog_arr]
            pct = round((sum(vals) / len(vals)) * 100, 2)
        else:
            pct = 0.0

        user = db.query(models.User).filter(models.User.id == uid).first()
        username = user.name if user else f"User {uid}"

        leaderboard.append({
            "user_id": uid,
            "user_name": username,
            "progress": pct
        })

    # ترتيب الأعلى أولاً
    leaderboard.sort(key=lambda x: x["progress"], reverse=True)

    return leaderboard


# ============================================================
# Comments System (Database Based)
# ============================================================
@router.get("/{challenge_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(challenge_id: int, db: Session = Depends(get_db)):
    comments = (
        db.query(models.Comment)
        .filter(models.Comment.challenge_id == challenge_id)
        .order_by(models.Comment.timestamp.asc())
        .all()
    )
    return comments


@router.post("/{challenge_id}/comments", response_model=schemas.CommentResponse)
def add_comment(
    challenge_id: int,
    user_id: int = Query(...),
    content: str = Query(...),
    db: Session = Depends(get_db),
):
    if not content.strip():
        raise HTTPException(status_code=400, detail="Empty comment")

    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge ended")

    if user_id not in (challenge.participants or []):
        raise HTTPException(status_code=403, detail="Join challenge first")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    comment = models.Comment(
        challenge_id=challenge_id,
        user_id=user_id,
        user_name=user.name,
        content=content.strip()
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


@router.patch("/comments/{comment_id}", response_model=schemas.CommentResponse)
def update_comment(
    comment_id: int,
    user_id: int = Query(...),
    content: str = Query(...),
    db: Session = Depends(get_db),
):
    if not content.strip():
        raise HTTPException(status_code=400, detail="Empty comment")

    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="You can edit only your comment")

    comment.content = content.strip()
    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # هنا تقدر تضيف شرط إذا حبيتي: صاحب الكومنت أو صاحب التحدي
    # challenge = db.query(models.Challenge).filter(models.Challenge.id == comment.challenge_id).first()
    # if user_id != comment.user_id and user_id != challenge.creator_id:
    #     raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted", "comment_id": comment_id}
