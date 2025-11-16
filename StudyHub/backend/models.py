from sqlalchemy import (Column,Integer,String,Boolean,Float,DateTime,Enum,ForeignKey,Date,Text)
import enum
from datetime import datetime
from sqlalchemy.orm import relationship
from .database import Base
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB


# ---------------- USERS -----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    challenges_created = relationship("Challenge", back_populates="creator")

    # Link to goals
    goals = relationship("Goal", back_populates="user")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")


# ---------------- GOALS -----------------
class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    date = Column(String, nullable=False)
    color = Column(String, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="goals")


# ---------------- FOCUS SESSION -----------------
class SessionStatus(str, enum.Enum):
    created = "created"  # saved but not started
    running = "running"
    paused = "paused"
    completed = "completed"
    canceled = "canceled"


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(Integer, primary_key=True, index=True)
    # If you have auth/users, keep user_id. Otherwise remove it.
    user_id = Column(Integer, nullable=True, index=True)

    title = Column(String, nullable=False)
    duration_min = Column(Integer, nullable=False)  # planned minutes
    elapsed_sec = Column(Float, default=0.0)  # server-tracked
    pauses_count = Column(Integer, default=0)
    did_pause = Column(Boolean, default=False)

    status = Column(Enum(SessionStatus), default=SessionStatus.created, nullable=False)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # final growth score for this session (0, 0.5, 1) set at completion
    plant_growth = Column(Float, default=0.0)


# ---------------- CHALLENGES -----------------
class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    level = Column(String, nullable=True)
    creator_name = Column(String, nullable=False)
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    participants = Column(JSONB, default=list)
    #tasks = Column(JSONB, default=list)
    progress = Column(JSONB, default=dict)

    max_participants = Column(Integer, nullable=False, default=10)
    #tasks = Column(JSON, default=[])
    #progress = Column(JSON, default=dict)
    group_progress = Column(Integer, default=0)

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="challenges_created")

    tasks = relationship(
        "ChallengeTask",
        back_populates="challenge",
        cascade="all, delete-orphan",
        lazy="joined",    
    )

    comments = relationship("Comment", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeTask(Base):
    __tablename__ = "challenge_tasks"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    done = Column(Boolean, default=False)

    challenge = relationship("Challenge", back_populates="tasks")


# ---------------- COMMENT -----------------
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String, nullable=False)

    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="comments")
    challenge = relationship("Challenge", back_populates="comments")