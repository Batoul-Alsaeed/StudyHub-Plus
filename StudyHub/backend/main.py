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

# Allow React frontend
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
