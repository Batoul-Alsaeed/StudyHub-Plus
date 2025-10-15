from sqlalchemy import Column, Integer, String
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

# -----------------------------
# (Challenge Table)
# -----------------------------

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)  # رقم التحدي (أساسي وأوتوماتيكي)
    title = Column(String, nullable=False)              # عنوان التحدي (إجباري)
    description = Column(Text, nullable=True)           # وصف التحدي (اختياري)
    level = Column(String, nullable=True)               # مستوى التحدي (Easy / Medium / Hard)
    creator_name = Column(String, nullable=False)       # اسم الشخص الذي أنشأ التحدي (مؤقتًا بدون user_id)
    start_date = Column(String, nullable=True)          # تاريخ بداية التحدي
    end_date = Column(String, nullable=True)            # تاريخ نهاية التحدي
    participants = Column(Integer, default=0)           # عدد المشاركين في التحدي (يبدأ من 0)
