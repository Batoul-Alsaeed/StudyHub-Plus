from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas
from .database import SessionLocal
import json

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
# Helper: Format Final Response
# ============================================================
def format_challenge_response(challenge, current_user_id=None):
    """Prepare ChallengeResponse object with full formatting."""

    participants_count = len(challenge.participants or [])

    is_creator = (
        current_user_id is not None
        and challenge.creator_id == current_user_id
    )

    is_joined = (
        current_user_id is not None
        and current_user_id in (challenge.participants or [])
    )

    today = datetime.utcnow().date()
    if challenge.start_date and today < challenge.start_date:
        status = "Upcoming"
    elif challenge.end_date and today > challenge.end_date:
        status = "Ended"
    else:
        status = "Active"

    tasks = challenge.tasks if isinstance(challenge.tasks, list) else []
    progress = challenge.progress if isinstance(challenge.progress, dict) else {}

    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "level": challenge.level,
        "creator_name": challenge.creator_name,
        "creator_id": challenge.creator_id,
        "start_date": challenge.start_date,
        "end_date": challenge.end_date,
        "tasks": tasks,
        "participants": challenge.participants or [],
        "participants_count": participants_count,
        "progress": progress,
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
        tasks=challenge.tasks or [],
        progress={},
        group_progress=0,
    )

    # Creator is auto-joined
    if challenge.creator_id not in new_challenge.participants:
        new_challenge.participants.append(challenge.creator_id)

    # Initialize progress for creator
    new_challenge.progress[str(challenge.creator_id)] = [False] * len(new_challenge.tasks)

    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)

    return format_challenge_response(new_challenge, challenge.creator_id)


# ============================================================
# Get All Challenges
# ============================================================
@router.get("", response_model=list[schemas.ChallengeResponse])
def get_challenges(
    current_user_id: int = Query(None),
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return format_challenge_response(challenge, current_user_id)


# ============================================================
# Join Challenge
# ============================================================
@router.post("/{challenge_id}/join")
def join_challenge(
    challenge_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    # ================================
    # FIX: normalize participants JSONB
    # ================================
    raw_participants = challenge.participants

    if isinstance(raw_participants, str):
        try:
            participants = json.loads(raw_participants)
        except:
            participants = []
    elif isinstance(raw_participants, list):
        participants = raw_participants
    else:
        participants = []

    participants = [int(p) for p in participants if str(p).isdigit()]
    # ================================

    if user_id in participants:
        raise HTTPException(status_code=400, detail="User already joined")

    if len(participants) >= challenge.max_participants:
        raise HTTPException(status_code=400, detail="Challenge is full")

    participants.append(user_id)
    challenge.participants = participants

    # progress
    challenge.progress[str(user_id)] = [False] * len(challenge.tasks)

    # group progress
    all_p = []
    for arr in challenge.progress.values():
        if len(arr) > 0:
            pct = (sum(arr) / len(arr)) * 100
            all_p.append(pct)

    challenge.group_progress = round(sum(all_p) / len(all_p), 2) if all_p else 0

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Toggle Task
# ============================================================
@router.patch("/{challenge_id}/task-toggle")
def toggle_task(
    challenge_id: int,
    user_id: int = Query(...),
    task_index: int = Query(...),
    db: Session = Depends(get_db)
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    if user_id not in challenge.participants:
        raise HTTPException(status_code=403, detail="You must join first")

    user_key = str(user_id)

    if user_key not in challenge.progress:
        challenge.progress[user_key] = [False] * len(challenge.tasks)

    if task_index < 0 or task_index >= len(challenge.tasks):
        raise HTTPException(status_code=400, detail="Invalid task index")

    challenge.progress[user_key][task_index] = not challenge.progress[user_key][task_index]

    # recalc group progress
    all_p = []
    for arr in challenge.progress.values():
        if len(arr) > 0:
            pct = (sum(arr) / len(arr)) * 100
            all_p.append(pct)

    challenge.group_progress = round(
        sum(all_p) / len(all_p), 2
    ) if all_p else 0

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Leave Challenge
# ============================================================
@router.delete("/{challenge_id}/leave")
def leave_challenge(
    challenge_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
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

    challenge.progress.pop(str(user_id), None)

    all_p = []
    for arr in challenge.progress.values():
        if len(arr) > 0:
            pct = (sum(arr) / len(arr)) * 100
            all_p.append(pct)

    challenge.group_progress = round(
        sum(all_p) / len(all_p), 2
    ) if all_p else 0

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Update Challenge
# ============================================================
@router.put("/{challenge_id}", response_model=schemas.ChallengeResponse)
def update_challenge(
    challenge_id: int,
    challenge_data: schemas.ChallengeCreate,
    db: Session = Depends(get_db)
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge already ended")

    if challenge_data.max_participants < len(challenge.participants):
        raise HTTPException(status_code=400, detail="max_participants too small")

    challenge.title = challenge_data.title
    challenge.description = challenge_data.description
    challenge.level = challenge_data.level
    challenge.start_date = challenge_data.start_date
    challenge.end_date = challenge_data.end_date
    challenge.max_participants = challenge_data.max_participants

    old_count = len(challenge.tasks)
    new_count = len(challenge_data.tasks)

    if challenge_data.tasks:
        challenge.tasks = challenge_data.tasks

    if new_count != old_count:
        new_progress = {}
        for uid in challenge.participants:
            new_progress[str(uid)] = [False] * new_count
        challenge.progress = new_progress
        challenge.group_progress = 0

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
    db: Session = Depends(get_db)
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
# Comments System (Database Based)
# ============================================================
@router.get("/{challenge_id}/comments", response_model=list[schemas.CommentResponse])
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
    db: Session = Depends(get_db)
):
    if not content.strip():
        raise HTTPException(status_code=400, detail="Empty comment")

    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(status_code=400, detail="Challenge ended")

    if user_id not in challenge.participants:
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    challenge = db.query(models.Challenge).filter(models.Challenge.id == comment.challenge_id).first()

    if user_id != comment.user_id and user_id != challenge.creator_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted"}
