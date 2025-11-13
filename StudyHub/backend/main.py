from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path
from .focusTime import router as focus_router
from .challenges import router as challenges_router



from . import models, schemas
from .database import engine, SessionLocal

print("✅ Loaded: backend/main.py")


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
app.include_router(focus_router)
app.include_router(challenges_router)



# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


#DB_FILE = Path("db.json")

#def save_to_json(data):
#    """Save all users to db.json"""
#    if DB_FILE.exists():
#        with open(DB_FILE, "r") as f:
#            content = json.load(f)
#    else:
#        content = {"users": []}
#    content["users"].append(data)
#    with open(DB_FILE, "w") as f:
#        json.dump(content, f, indent=4)


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
    # save_to_json({"id": new_user.id, "name": new_user.name, "email": new_user.email, "password": user.password})

    return {"message": "User registered successfully", "id": new_user.id, "name": new_user.name, "email": new_user.email}


# Login endpoint
@app.post("/api/login")
def login(user: dict, db: Session = Depends(get_db)):
    email = user.get("email")
    password = user.get("password")

        # Read from db.json
    #if not DB_FILE.exists():
        #raise HTTPException(status_code=404, detail="Database not found")

    #with open(DB_FILE, "r") as f:
        #data = json.load(f)

    #found_user = next((u for u in data["users"] if u["email"] == email and u["password"] == password), None)

    #if not found_user:
        #raise HTTPException(status_code=401, detail="Invalid email or password")
    
    db_user = db.query(models.User).filter(models.User.email == email).first()

    if not db_user or not pwd_context.verify(password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")


    return {
        "message": "Login successful",
        "id": db_user.id,
        "name": db_user.name,
        "email": db_user.email
    }



# Goals endpoint
@app.post("/api/goals", response_model=schemas.GoalResponse)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == goal.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_goal = models.Goal(
        title=goal.title,
        completed=goal.completed,
        date=goal.date,
        user_id=goal.user_id,
        color=goal.color 
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal


@app.get("/api/goals/{user_id}", response_model=list[schemas.GoalResponse])
def get_user_goals(user_id: int, db: Session = Depends(get_db)):
    if not isinstance(user_id, int) or user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    return db.query(models.Goal).filter(models.Goal.user_id == user_id).all()


@app.put("/api/goals/{goal_id}", response_model=schemas.GoalResponse)
def update_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.completed = not goal.completed
    db.commit()
    db.refresh(goal)
    return goal

@app.on_event("startup")
def show_routes():
    print("\n🚀 Registered FastAPI Routes:")
    for route in app.routes:
        print(" →", route.path)
