from fastapi import FastAPI, Depends, HTTPException
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path

from . import models, schemas
from .database import engine, SessionLocal

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DB_FILE = Path("db.json")

def save_to_json(data):
    """Save all users to db.json"""
    if DB_FILE.exists():
        with open(DB_FILE, "r") as f:
            content = json.load(f)
    else:
        content = {"users": []}
    content["users"].append(data)
    with open(DB_FILE, "w") as f:
        json.dump(content, f, indent=4)


@app.get("/")
def root():
    return {"message": "FastAPI backend is working!"}


# ============================================================
# 👤 Register endpoint
# ============================================================
@app.post("/api/register")
def register(user: schemas.UserCreate, db: SessionLocal = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(name=user.name, email=user.email, password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    save_to_json({"name": user.name, "email": user.email, "password": user.password})
    return {"message": "User registered successfully", "name": user.name}


# ============================================================
# 🔐 Login endpoint
# ============================================================
@app.post("/api/login")
def login(data: dict, db: SessionLocal = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.get("email")).first()
    if not user or not pwd_context.verify(data.get("password"), user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"message": "Login successful", "user": user.name}


# ============================================================
# 🏁 Challenges Endpoints
# ============================================================

# Create a new Challenge (POST)
@app.post("/api/challenges", response_model=schemas.ChallengeResponse)
def create_challenge(challenge: schemas.ChallengeCreate, db: SessionLocal = Depends(get_db)):
    new_challenge = models.Challenge(
        title=challenge.title,
        description=challenge.description,
        level=challenge.level,
        creator_name=challenge.creator_name,
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


# Get All Challenges (GET)
@app.get("/api/challenges", response_model=list[schemas.ChallengeResponse])
def get_challenges(db: SessionLocal = Depends(get_db)):
    return db.query(models.Challenge).all()


# Get Single Challenge by ID (GET)
@app.get("/api/challenges/{challenge_id}", response_model=schemas.ChallengeResponse)
def get_challenge(challenge_id: int, db: SessionLocal = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


# ============================================================
# 🤝 Join Challenge
# ============================================================
@app.post("/api/challenges/{challenge_id}/join")
def join_challenge(challenge_id: int, user_id: int, db: SessionLocal = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    participants = challenge.participants or []

    if user_id in participants:
        raise HTTPException(status_code=400, detail="User already joined this challenge")

    if len(participants) >= challenge.max_participants:
        raise HTTPException(status_code=400, detail="This challenge is already full")

    participants.append(user_id)
    challenge.participants = participants
    challenge.progress[str(user_id)] = 0  # يبدأ التقدم من 0%
    db.commit()
    db.refresh(challenge)

    return {"message": "Joined successfully", "participants": len(participants)}


# ============================================================
# 🚪 Leave Challenge
# ============================================================
@app.delete("/api/challenges/{challenge_id}/leave")
def leave_challenge(challenge_id: int, user_id: int, db: SessionLocal = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    participants = challenge.participants or []

    if user_id not in participants:
        raise HTTPException(status_code=400, detail="User not in this challenge")

    participants.remove(user_id)
    challenge.participants = participants
    challenge.progress.pop(str(user_id), None)

    # تحديث التقدم الجماعي
    progresses = list(challenge.progress.values())
    challenge.group_progress = round(sum(progresses) / len(progresses), 2) if progresses else 0

    db.commit()
    db.refresh(challenge)

    return {"message": "Left challenge successfully", "participants": len(participants)}


# ============================================================
# 📈 Update Progress
# ============================================================
@app.patch("/api/challenges/{challenge_id}/progress")
def update_progress(challenge_id: int, user_id: int, progress: float, db: SessionLocal = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # تحديث تقدم المستخدم
    challenge.progress[str(user_id)] = progress

    # تحديث متوسط تقدم المجموعة
    progresses = list(challenge.progress.values())
    challenge.group_progress = round(sum(progresses) / len(progresses), 2) if progresses else 0

    db.commit()
    db.refresh(challenge)

    return {
        "message": "Progress updated successfully",
        "user_progress": challenge.progress[str(user_id)],
        "group_progress": challenge.group_progress
    }


# ============================================================
# ✏️ Update Challenge (PUT)
# ============================================================
@app.put("/api/challenges/{challenge_id}", response_model=schemas.ChallengeResponse)
def update_challenge(challenge_id: int, challenge_data: schemas.ChallengeCreate, db: SessionLocal = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # تحديث البيانات
    challenge.title = challenge_data.title
    challenge.description = challenge_data.description
    challenge.level = challenge_data.level
    challenge.start_date = challenge_data.start_date
    challenge.end_date = challenge_data.end_date
    challenge.max_participants = challenge_data.max_participants
    challenge.tasks = challenge_data.tasks or challenge.tasks

    db.commit()
    db.refresh(challenge)
    return challenge


# ============================================================
# ❌ Delete Challenge
# ============================================================
@app.delete("/api/challenges/{challenge_id}")
def delete_challenge(challenge_id: int, db: SessionLocal = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    db.delete(challenge)
    db.commit()
    return {"message": "Challenge deleted successfully"}
