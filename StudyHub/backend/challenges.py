from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from . import models, schemas
from .database import SessionLocal
import json
from typing import List


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
# 🏁 Create Challenge
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
        progress=challenge.progress or {},
        group_progress=challenge.group_progress or 0
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)
    return new_challenge

# ============================================================
# 📋 Get All Challenges
# ============================================================
@router.get("", response_model=List[schemas.ChallengeResponse])
def get_challenges(db: Session = Depends(get_db)):
    challenges = db.query(models.Challenge).all()
    return challenges

# ============================================================
# 🔍 Get Single Challenge by ID
# ============================================================
@router.get("/{challenge_id}", response_model=schemas.ChallengeResponse)
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge

# ============================================================
# 🤝 Join Challenge
# ============================================================
@router.post("/{challenge_id}/join")
def join_challenge(challenge_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Convert to list if needed
    participants = challenge.participants or []

    if user_id in participants:
        raise HTTPException(status_code=400, detail="User already joined this challenge")

    if len(participants) >= challenge.max_participants:
        raise HTTPException(status_code=400, detail="This challenge is already full")

    participants.append(user_id)
    challenge.participants = participants
    progress_map = challenge.progress or {}
    progress_map[str(user_id)] = 0.0
    challenge.progress = progress_map

    # recompute group progress
    progresses = list(progress_map.values())
    challenge.group_progress = (
        round(sum(progresses) / len(progresses), 2) if progresses else 0.0
    )

    db.commit()
    db.refresh(challenge)
    return {"message": "Joined successfully", "participants": participants}


# ============================================================
# 🚪 Leave Challenge
# ============================================================
@router.delete("/{challenge_id}/leave")
def leave_challenge(challenge_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    participants = challenge.participants or []

    if user_id not in participants:
        raise HTTPException(status_code=400, detail="User not in this challenge")

    participants.remove(user_id)
    challenge.participants = participants

    # Remove user progress entry
    progress_map = challenge.progress or {}
    progress_map.pop(str(user_id), None)
    challenge.progress = progress_map

    # Update group progress safely
    progresses = list(progress_map.values())
    challenge.group_progress = (
        round(sum(progresses) / len(progresses), 2) if progresses else 0.0
    )

    db.commit()
    db.refresh(challenge)
    return {"message": "Left challenge successfully", "participants": participants}

# ============================================================
# ✏️ Update Challenge
# ============================================================
@router.put("/{challenge_id}", response_model=schemas.ChallengeResponse)
def update_challenge(challenge_id: int, challenge_data: schemas.ChallengeCreate, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge.title = challenge_data.title
    challenge.description = challenge_data.description
    challenge.level = challenge_data.level
    challenge.start_date = challenge_data.start_date
    challenge.end_date = challenge_data.end_date
    challenge.max_participants = challenge_data.max_participants

    # ✅ Safely update tasks
    if challenge_data.tasks is not None:
        challenge.tasks = challenge_data.tasks

    db.commit()
    db.refresh(challenge)
    return challenge

# ============================================================
# ❌ Delete Challenge
# ============================================================
@router.delete("/{challenge_id}")
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    db.delete(challenge)
    db.commit()
    return {"message": "Challenge deleted successfully"}


# ============================================================
# 💬 Comments System (per challenge)
# ============================================================

from datetime import datetime

# Temporary in-memory store (you can later move to a Comment model)
COMMENTS = {}  # { challenge_id: [ {id, user_name, content, timestamp} ] }
COMMENT_COUNTER = 1


@router.get("/{challenge_id}/comments")
def get_comments(challenge_id: int):
    """Get all comments for a challenge"""
    return COMMENTS.get(challenge_id, [])


@router.post("/{challenge_id}/comments")
def add_comment(
    challenge_id: int,
    user_id: int = Query(...),
    content: str = Query(...),
):
    """Add a new comment"""
    global COMMENT_COUNTER
    if not content.strip():
        raise HTTPException(status_code=400, detail="Empty comment")

    comment = {
        "id": COMMENT_COUNTER,
        "user_id": user_id,
        "user_name": f"User {user_id}",
        "content": content.strip(),
        "timestamp": datetime.utcnow().isoformat(),
    }
    COMMENT_COUNTER += 1

    if challenge_id not in COMMENTS:
        COMMENTS[challenge_id] = []
    COMMENTS[challenge_id].append(comment)
    return {"message": "Comment added successfully", "comment": comment}


@router.patch("/comments/{comment_id}")
def update_comment(comment_id: int, content: str = Query(...)):
    """Update comment content"""
    for challenge_id, items in COMMENTS.items():
        for comment in items:
            if comment["id"] == comment_id:
                comment["content"] = content.strip()
                return {"message": "Comment updated", "comment": comment}
    raise HTTPException(status_code=404, detail="Comment not found")


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int):
    """Delete a comment"""
    for challenge_id, items in COMMENTS.items():
        for comment in items:
            if comment["id"] == comment_id:
                COMMENTS[challenge_id] = [
                    c for c in items if c["id"] != comment_id
                ]
                return {"message": "Comment deleted"}
    raise HTTPException(status_code=404, detail="Comment not found")



# ============================================================
# ✅ Tasks + Progress update
# ============================================================
@router.patch(
    "/{challenge_id}/tasks",
    response_model=schemas.ChallengeResponse,
)
def update_tasks(
    challenge_id: int,
    updated_tasks: List[schemas.ChallengeTaskUpdate],
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    challenge = (
        db.query(models.Challenge)
        .filter(models.Challenge.id == challenge_id)
        .first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # convert Pydantic models to plain dicts for storage
    tasks_payload = [t.model_dump() for t in updated_tasks]
    challenge.tasks = tasks_payload

    # only valid tasks with non-empty title
    valid_tasks = [t for t in tasks_payload if t.get("title")]

    total = len(valid_tasks)
    if total == 0:
        user_progress = 0.0
    else:
        completed = len([t for t in valid_tasks if bool(t.get("done"))])
        user_progress = round((completed / total) * 100.0, 2)

    progress_map = challenge.progress or {}
    progress_map[str(user_id)] = user_progress
    challenge.progress = progress_map

    # recompute group progress (average of all users)
    progresses = list(progress_map.values())
    challenge.group_progress = (
        round(sum(progresses) / len(progresses), 2) if progresses else 0.0
    )

    db.commit()
    db.refresh(challenge)
    return challenge