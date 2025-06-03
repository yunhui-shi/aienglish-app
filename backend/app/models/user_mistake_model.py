# backend/app/models/user_mistake_model.py
import uuid
from sqlalchemy import Column, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db import Base

class UserMistake(Base):
    __tablename__ = "user_mistakes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    sentence_id = Column(Integer, ForeignKey('sentences.id'), nullable=False, comment="哪句话出错")
    # question_id = Column(UUID(as_uuid=True), ForeignKey('questions.id'), nullable=False) # More specific: which question was wrong
    grammar_point = Column(Text, nullable=True, comment="出错语法点 (can be derived from sentence or question)")
    # user_answer_id = Column(UUID(as_uuid=True), ForeignKey('user_answers.id'), nullable=True, comment="Link to the specific wrong answer")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="错误记录时间")

    user = relationship("User") # Add back_populates in User model if needed
    sentence = relationship("Sentence", back_populates="user_mistakes")
    # question = relationship("Question")
    # user_answer = relationship("UserAnswer")

    def __repr__(self):
        return f"<UserMistake(id={self.id}, user_id='{self.user_id}', sentence_id='{self.sentence_id}')>"