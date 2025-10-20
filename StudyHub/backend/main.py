from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
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


# Register endpoint
@app.post("/api/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(name=user.name, email=user.email, password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Save to db.json
    save_to_json({"name": user.name, "email": user.email, "password": user.password})

    return {"message": "User registered successfully", "name": user.name}


# Login endpoint
@app.post("/api/login")
def login(data: dict, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.get("email")).first()
    if not user or not pwd_context.verify(data.get("password"), user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"message": "Login successful", "user": user.name}



# Create a new Challenge (POST)
@app.post("/api/challenges", response_model=schemas.ChallengeResponse)
def create_challenge(challenge: schemas.ChallengeCreate, db: Session = Depends(get_db)):
    new_challenge = models.Challenge(
        title=challenge.title,
        description=challenge.description,
        level=challenge.level,
        creator_name=challenge.creator_name,
        start_date=challenge.start_date,
        end_date=challenge.end_date
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)

    return new_challenge

# Get All Challenges (GET)
@app.get("/api/challenges", response_model=list[schemas.ChallengeResponse])
def get_challenges(db: Session = Depends(get_db)):
    challenges = db.query(models.Challenge).all()
    return challenges


# Join Challenge (POST)
@app.post("/api/challenges/{challenge_id}/join")
def join_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge.participants += 1
    db.commit()
    db.refresh(challenge)

    return {"message": "Joined challenge successfully", "participants": challenge.participants}

# Get Single Challenge by ID (GET)
@app.get("/api/challenges/{challenge_id}", response_model=schemas.ChallengeResponse)
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return challenge

