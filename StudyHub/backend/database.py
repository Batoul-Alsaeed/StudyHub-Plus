from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# نقرأ رابط القاعدة من متغير البيئة
DATABASE_URL = os.getenv("DATABASE_URL")

# إنشاء الاتصال
engine = create_engine(DATABASE_URL)

# إعداد الـ Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# الأساس لجميع النماذج
Base = declarative_base()

#SQLALCHEMY_DATABASE_URL = "sqlite:///./users.db"

#engine = create_engine(
#    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
#)
#SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
#Base = declarative_base()

#def get_db():
#    db = SessionLocal()
#    try:
#        yield db
#    finally:
#        db.close()
