# backend/app/models/sentence_model.py
from sqlalchemy import Column, String, Text, Enum as SQLAlchemyEnum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from ..db import Base
import enum

class DifficultyLevel(str, enum.Enum):
    ADVANCED = "advanced"
    MEDIUM = "medium"
    HARD = "hard"

class Sentence(Base):
    __tablename__ = "sentences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    text = Column(Text, nullable=False, comment="英文句子原文")
    translation = Column(Text, nullable=False, comment="正确中文翻译")
    grammar_point = Column(String, nullable=True, comment="对应语法点")
    difficulty = Column(SQLAlchemyEnum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    # created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, comment="管理员或系统创建人") # Optional: if sentences are tied to creators

    questions = relationship("Question", back_populates="sentence")
    user_mistakes = relationship("UserMistake", back_populates="sentence")
    user_vocabs = relationship("UserVocab", back_populates="sentence")

    def __repr__(self):
        return f"<Sentence(id={self.id}, text='{self.text[:30]}...')>"