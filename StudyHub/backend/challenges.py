from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
        progress=challenge.progress or {},
        group_progress=challenge.group_progress or 0,
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)
    return new_challenge


# ============================================================
# Get All Challenges
# ============================================================
@router.get("", response_model=list[schemas.ChallengeResponse])
def get_challenges(db: Session = Depends(get_db)):
    challenges = db.query(models.Challenge).all()
    for c in challenges:
        if isinstance(c.tasks, str):
            try:
                c.tasks = json.loads(c.tasks)
            except:
                c.tasks = []
        if not isinstance(c.tasks, list):
            c.tasks = []
    return challenges


# ============================================================
# Get Single Challenge by ID
# ============================================================
@router.get("/{challenge_id}", response_model=schemas.ChallengeResponse)
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = (
        db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Always return tasks as a list
    if isinstance(challenge.tasks, str):
        try:
            challenge.tasks = json.loads(challenge.tasks)
        except Exception:
            challenge.tasks = []
    elif challenge.tasks is None:
        challenge.tasks = []
    elif not isinstance(challenge.tasks, list):
        challenge.tasks = []

    return challenge


# ============================================================
# Join Challenge
# ============================================================
@router.post("/{challenge_id}/join")
def join_challenge(
    challenge_id: int, user_id: int = Query(...), db: Session = Depends(get_db)
):
    challenge = (
        db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    )
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Participants list
    participants = challenge.participants or []

    # Already joined?
    if user_id in participants:
        raise HTTPException(
            status_code=400, detail="User already joined this challenge"
        )
    
    # Check max capacity
    if len(participants) >= challenge.max_participants:
        raise HTTPException(status_code=400, detail="This challenge is already full")
    
    # Add participant
    participants.append(user_id)
    challenge.participants = participants

    # Initialize user progress array for tasks
    if challenge.tasks:
        challenge.progress[str(user_id)] = [False] * len(challenge.tasks)
    else:
        challenge.progress[str(user_id)] = []

    #Recalculate group progress
    all_progress_values = []
    for p in challenge.progress.values():
        # Each p is: list of booleans for tasks
        if isinstance(p, list) and p:
            percentage = round((p.count(True) / len(p)) * 100, 2)
            all_progress_values.append(percentage)

    challenge.group_progress = (
        round(sum(all_progress_values) / len(all_progress_values), 2)
        if all_progress_values
        else 0
    )
    
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return {"message": "Joined successfully", "participants": challenge.participants}

# ============================================================
# task-toggle
# ============================================================
@router.patch("/{challenge_id}/task-toggle")
def toggle_task(
    challenge_id: int,
    user_id: int = Query(...),
    task_index: int = Query(...)
    , db: Session = Depends(get_db)
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # تحقّق من أن المستخدم منضمّ
    if user_id not in challenge.participants:
        raise HTTPException(status_code=400, detail="User not in challenge")

    # جهّز progress
    user_key = str(user_id)

    if user_key not in challenge.progress:
        raise HTTPException(status_code=400, detail="User performance not initialized")

    tasks_count = len(challenge.tasks)
    if task_index < 0 or task_index >= tasks_count:
        raise HTTPException(status_code=400, detail="Invalid task index")

    # قلب حالة المهمة
    challenge.progress[user_key][task_index] = not challenge.progress[user_key][task_index]

    # حساب التقدّم الفردي
    user_progress = challenge.progress[user_key]
    progress_percentage = round( (sum(1 for x in user_progress if x) / len(user_progress)) * 100 , 2)

    # حساب تقدّم المجموعة
    all_progresses = []
    for user, task_list in challenge.progress.items():
        if len(task_list) > 0:
            all_progresses.append(sum(task_list) / len(task_list))

    challenge.group_progress = round( (sum(all_progresses) / len(all_progresses)) * 100 , 2 ) if all_progresses else 0

    db.commit()
    db.refresh(challenge)

    return {
        "message": "Task toggled",
        "user_progress": progress_percentage,
        "group_progress": challenge.group_progress,
        "progress": challenge.progress[user_key]
    }

# ============================================================
# Leave Challenge
# ============================================================
@router.delete("/{challenge_id}/leave")
def leave_challenge(
    challenge_id: int, user_id: int = Query(...), db: Session = Depends(get_db)
):
    challenge = (
        db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    participants = challenge.participants or []

    if user_id not in participants:
        raise HTTPException(status_code=400, detail="User not in this challenge")

    participants.remove(user_id)
    challenge.participants = participants

    # Remove user progress entry
    challenge.progress.pop(str(user_id), None)

    # Update group progress safely
    progresses = list(challenge.progress.values())
    challenge.group_progress = (
        round(sum(progresses) / len(progresses), 2) if progresses else 0
    )

    db.commit()
    db.refresh(challenge)
    return {"message": "Left challenge successfully", "participants": participants}


# ============================================================
# ✏️ Update Challenge
# ============================================================
@router.put("/{challenge_id}", response_model=schemas.ChallengeResponse)
def update_challenge(
    challenge_id: int,
    challenge_data: schemas.ChallengeCreate,
    db: Session = Depends(get_db),
):
    challenge = (
        db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge.title = challenge_data.title
    challenge.description = challenge_data.description
    challenge.level = challenge_data.level
    challenge.start_date = challenge_data.start_date
    challenge.end_date = challenge_data.end_date
    challenge.max_participants = challenge_data.max_participants

    # ✅ Safely update tasks
    if challenge_data.tasks:
        challenge.tasks = challenge_data.tasks

    db.commit()
    db.refresh(challenge)
    return challenge


# ============================================================
# ❌ Delete Challenge
# ============================================================
@router.delete("/{challenge_id}")
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = (
        db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    )
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
                COMMENTS[challenge_id] = [c for c in items if c["id"] != comment_id]
                return {"message": "Comment deleted"}
    raise HTTPException(status_code=404, detail="Comment not found")
