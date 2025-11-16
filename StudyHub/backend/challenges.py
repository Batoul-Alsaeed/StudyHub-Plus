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
# Group Progress
# ============================================================
def recompute_group_progress(challenge: models.Challenge) -> None:
    """
    متوسط نسبة إنجاز جميع المشاركين
    progress = { "user_id": [0/1, 0/1, ...] }
    """
    progress = challenge.progress or {}
    all_pcts: List[float] = []

    for arr in progress.values():
        if not isinstance(arr, list) or not arr:
            continue
        vals = [1 if bool(x) else 0 for x in arr]
        pct = (sum(vals) / len(vals)) * 100
        all_pcts.append(pct)

    challenge.group_progress = round(sum(all_pcts) / len(all_pcts), 2) if all_pcts else 0.0


# ============================================================
# Prepare Output for Frontend
# ============================================================
def format_challenge_response(challenge: models.Challenge, current_user_id: Optional[int]):
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

    # progress map
    progress_map = challenge.progress or {}
    user_key = str(current_user_id) if current_user_id else None
    user_progress_arr = progress_map.get(user_key, []) if user_key else []

    # ترتيب المهام حسب ID
    all_tasks = sorted(challenge.tasks, key=lambda t: t.id)

    tasks_out = []
    for idx, t in enumerate(all_tasks):
        done = False
        if user_key and idx < len(user_progress_arr):
            done = bool(user_progress_arr[idx])

        tasks_out.append({
            "id": t.id,
            "title": t.title,
            "done": done,
        })

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

    # Auto join creator
    if challenge.creator_id not in new_challenge.participants:
        new_challenge.participants.append(challenge.creator_id)

    # Create tasks
    for title in challenge.tasks or []:
        title = title.strip()
        if title:
            new_challenge.tasks.append(models.ChallengeTask(title=title))

    # Prepare progress arrays
    tasks_count = len(new_challenge.tasks)
    progress_map = {}
    for uid in new_challenge.participants:
        progress_map[str(uid)] = [0] * tasks_count

    new_challenge.progress = progress_map
    recompute_group_progress(new_challenge)

    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)

    return format_challenge_response(new_challenge, challenge.creator_id)


# ============================================================
# Get Challenges
# ============================================================
@router.get("", response_model=List[schemas.ChallengeResponse])
def get_challenges(current_user_id: int = Query(None), db: Session = Depends(get_db)):
    challenges = db.query(models.Challenge).all()
    return [format_challenge_response(c, current_user_id) for c in challenges]


# ============================================================
# Get Single
# ============================================================
@router.get("/{challenge_id}", response_model=schemas.ChallengeResponse)
def get_challenge(challenge_id: int, current_user_id: int = Query(None), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    return format_challenge_response(challenge, current_user_id)


# ============================================================
# Join Challenge
# ============================================================
@router.post("/{challenge_id}/join", response_model=schemas.ChallengeResponse)
def join_challenge(challenge_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(400, "Challenge already ended")

    # Clean participants
    raw_participants = challenge.participants
    if isinstance(raw_participants, str):
        try:
            participants = json.loads(raw_participants)
        except:
            participants = []
    else:
        participants = list(raw_participants or [])

    participants = [int(p) for p in participants]

    if user_id in participants:
        raise HTTPException(400, "User already joined")

    if len(participants) >= challenge.max_participants:
        raise HTTPException(400, "Challenge is full")

    participants.append(user_id)
    challenge.participants = participants

    # Add progress row
    tasks_count = len(challenge.tasks)
    progress_map = challenge.progress or {}
    progress_map[str(user_id)] = [0] * tasks_count
    challenge.progress = progress_map

    recompute_group_progress(challenge)

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Toggle Task
# ============================================================
@router.patch("/{challenge_id}/task-toggle", response_model=schemas.ChallengeResponse)
def toggle_task(challenge_id: int, user_id: int = Query(...), task_id: int = Query(...), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    today = datetime.utcnow().date()
    if challenge.end_date and today > challenge.end_date:
        raise HTTPException(400, "Challenge ended")

    if user_id not in (challenge.participants or []):
        raise HTTPException(403, "Join first")

    # Get all tasks sorted
    all_tasks = sorted(challenge.tasks, key=lambda t: t.id)
    tasks_count = len(all_tasks)

    # Build progress row
    progress_map = challenge.progress or {}
    user_key = str(user_id)

    if user_key not in progress_map or len(progress_map[user_key]) != tasks_count:
        progress_map[user_key] = [0] * tasks_count

    # Find task index
    index = None
    for idx, t in enumerate(all_tasks):
        if t.id == task_id:
            index = idx
            break

    if index is None:
        raise HTTPException(404, "Task not found")

    # Toggle (0/1)
    progress_map[user_key][index] = 1 - progress_map[user_key][index]

    challenge.progress = progress_map
    recompute_group_progress(challenge)

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Leave Challenge
# ============================================================
@router.delete("/{challenge_id}/leave", response_model=schemas.ChallengeResponse)
def leave_challenge(challenge_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    participants = list(challenge.participants or [])
    if user_id not in participants:
        raise HTTPException(400, "User not joined")

    participants.remove(user_id)
    challenge.participants = participants

    # Remove from progress
    progress_map = challenge.progress or {}
    progress_map.pop(str(user_id), None)
    challenge.progress = progress_map

    recompute_group_progress(challenge)

    db.commit()
    db.refresh(challenge)

    return format_challenge_response(challenge, user_id)


# ============================================================
# Leaderboard
# ============================================================
@router.get("/{challenge_id}/leaderboard")
def get_leaderboard(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    progress = challenge.progress or {}
    participants = challenge.participants or []

    all_tasks = sorted(challenge.tasks, key=lambda t: t.id)
    total = len(all_tasks)

    leaderboard = []

    for uid in participants:
        arr = progress.get(str(uid), [])
        if len(arr) != total or total == 0:
            pct = 0.0
        else:
            vals = [1 if bool(x) else 0 for x in arr]
            pct = round((sum(vals) / total) * 100, 2)

        user = db.query(models.User).filter(models.User.id == uid).first()
        name = user.name if user else f"User {uid}"

        leaderboard.append({
            "user_id": uid,
            "user_name": name,
            "progress": pct,
        })

    leaderboard.sort(key=lambda x: x["progress"], reverse=True)
    return leaderboard


# ============================================================
# Comments
# ============================================================
@router.get("/{challenge_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(challenge_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(
        models.Comment.challenge_id == challenge_id
    ).order_by(models.Comment.timestamp.asc()).all()
    return comments


@router.post("/{challenge_id}/comments", response_model=schemas.CommentResponse)
def add_comment(challenge_id: int, user_id: int = Query(...), content: str = Query(...), db: Session = Depends(get_db)):
    if not content.strip():
        raise HTTPException(400, "Empty comment")

    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(404, "Not found")

    if user_id not in (challenge.participants or []):
        raise HTTPException(403, "Join first")

    user = db.query(models.User).filter(models.User.id == user_id).first()

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
def update_comment(comment_id: int, user_id: int = Query(...), content: str = Query(...), db: Session = Depends(get_db)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(404, "Comment not found")

    if comment.user_id != user_id:
        raise HTTPException(403, "Not allowed")

    comment.content = content.strip()
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(404, "Comment not found")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
