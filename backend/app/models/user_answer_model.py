# backend/app/models/user_answer_model.py
import uuid
from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db import Base

class UserAnswer(Base):
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=True) # Removed ForeignKey, set nullable to True
    question_id = Column(Integer, ForeignKey('questions.id'), nullable=False)
    selected_word_answer = Column(Text, nullable=True, comment="用户选择的单词答案")
    selected_translation_answer = Column(Text, nullable=True, comment="用户选择的翻译答案")
    is_correct = Column(Boolean, nullable=False, comment="是否正确")
    answered_at = Column(DateTime(timezone=True), server_default=func.now(), comment="答题时间戳")

    # Relationships (optional, if needed for direct navigation from UserAnswer)
    # user = relationship("User") # Comment out or remove if ForeignKey is removed and relationship is no longer desired
    question = relationship("Question", back_populates="user_answers")

    def __repr__(self):
        return f"<UserAnswer(id={self.id}, user_id='{self.user_id}', question_id='{self.question_id}', correct={self.is_correct})>"