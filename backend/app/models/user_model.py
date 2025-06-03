# backend/app/models/user_model.py
import uuid
from sqlalchemy import Column, String, DateTime, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..db import Base
import enum

class UserPlan(str, enum.Enum):
    FREE = "free"
    PREMIUM = "premium"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plan = Column(SQLAlchemyEnum(UserPlan), default=UserPlan.FREE)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"