from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    challenges_created = relationship("Challenge", back_populates="creator")


# (Challenge Table)

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    level = Column(String, nullable=True)
    creator_name = Column(String, nullable=False)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    participants = Column(JSON, default=[])
    #participants = Column(Integer, default=0)
    max_participants = Column(Integer, nullable=False, default=10)
    tasks = Column(JSON, default=[])
    progress = Column(JSON, default={})
    group_progress = Column(Integer, default=0)
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", back_populates="challenges_created")
