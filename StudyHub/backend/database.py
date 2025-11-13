from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = "postgresql://postgres:B4709903atoul@db.guyoesmoykuioothbewe.supabase.co:5432/postgres"

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
