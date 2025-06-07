# backend/app/models/user_vocab_model.py
import uuid
from sqlalchemy import Column, Text, DateTime, Enum as SQLAlchemyEnum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db import Base
import enum

class VocabStatus(str, enum.Enum):
    NEW = "new"
    LEARNING = "learning"
    MASTERED = "mastered"

class UserVocab(Base):
    __tablename__ = "user_vocab"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    word = Column(Text, nullable=False, comment="生词")
    phonetic = Column(Text, nullable=True, comment="音标")
    definition = Column(Text, nullable=True, comment="释义（JSON格式存储）")
    sentence_id = Column(Integer, ForeignKey('sentences.id'), nullable=True, comment="来自哪个句子（可追踪）")
    status = Column(SQLAlchemyEnum(VocabStatus), default=VocabStatus.NEW, nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), comment="添加时间")
    # last_reviewed_at = Column(DateTime(timezone=True), nullable=True) # Optional for spaced repetition

    user = relationship("User") # Add back_populates in User model if needed
    sentence = relationship("Sentence", back_populates="user_vocabs")

    def __repr__(self):
        return f"<UserVocab(id={self.id}, user_id='{self.user_id}', word='{self.word}')>"