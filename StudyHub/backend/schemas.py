from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from typing import Optional, List, Dict, Any


class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True
        orm_mode = True




class GoalBase(BaseModel):
    title: str
    completed: bool = False
    date: str
    user_id: int
    color: Optional[str] = None


class GoalCreate(GoalBase):
    user_id: int


class GoalResponse(GoalBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
        orm_mode = True


class FocusCreate(BaseModel):
    title: str
    duration_min: int
    user_id: Optional[int] = None

class FocusResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    duration_min: int
    elapsed_sec: float
    pauses_count: int
    did_pause: bool
    status: Literal["created","running","paused","completed","canceled"]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    updated_at: Optional[datetime]
    plant_growth: float

    class Config:
        from_attributes = True

class FocusTick(BaseModel):
    """Sent by client only when pausing or completing, to sync elapsed time."""
    elapsed_sec: float = Field(ge=0)

class FocusSummary(BaseModel):
    date: str
    total_elapsed_sec: float
    active_timer: Optional[int] = None       # remaining seconds for the latest running session (if any)
    daily_plant_growth: float                      

# (Request Body)

class ChallengeTaskOut(BaseModel):
    id: int
    title: str
    done: bool

    class Config:
        orm_mode = True

class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    creator_name: str
    creator_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_participants: int = 10
    tasks: List[str] = Field(default_factory=list)
    participants: List[int] = Field(default_factory=list)
    progress: Dict[str, float] = Field(default_factory=dict)
    group_progress: float = 0.0

class ChallengeTaskUpdate(BaseModel):
    title: str
    done: bool = False


# (Response Body)
class ChallengeResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    level: Optional[str]
    creator_name: str
    creator_id: Optional[int] = None
    start_date: Optional[str]
    end_date: Optional[str]
    tasks: List[ChallengeTaskUpdate] = Field(default_factory=list)
    participants: List[int] = Field(default_factory=list)
    progress: Dict[str, float] = Field(default_factory=dict)
    group_progress: float = 0.0
    max_participants: int

    class Config:
        from_attributes = True
        orm_mode = True
    
class ChallengeJoin(BaseModel):
    user_id: int


