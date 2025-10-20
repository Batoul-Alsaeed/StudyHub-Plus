from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        orm_mode = True

# (Request Body)
class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    creator_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

# (Response Body)
class ChallengeResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    level: Optional[str]
    creator_name: str
    start_date: Optional[str]
    end_date: Optional[str]
    participants: int

    class Config:
        orm_mode = True

# (JOIN)
class ChallengeJoin(BaseModel):
    username: str