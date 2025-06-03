# backend/app/db.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv() # .env 파일에서 환경 변수 로드

# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@host:port/database")
# Use absolute path to project root's database file
import pathlib
project_root = pathlib.Path(__file__).parent.parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{project_root}/aienglish.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    pool_size=10,  # 连接池大小
    max_overflow=20,  # 最大溢出连接数
    pool_timeout=30,  # 连接超时时间（秒）
    pool_recycle=60,  # 连接回收时间（秒）
    pool_pre_ping=True,  # 连接前检查连接是否有效
    echo=False  # 设置为True可以看到SQL日志，生产环境建议False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Import all models so they are registered with SQLAlchemy
from .models import user_model, sentence_model, question_model, user_answer_model, user_vocab_model, user_mistake_model

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()