# backend/app/models/question_model.py
from sqlalchemy import Column, Text, Enum as SQLAlchemyEnum, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship
from ..db import Base
import enum

class QuestionType(str, enum.Enum):
    WORD_CHOICE = "word_choice"
    TRANSLATION = "translation"

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sentence_id = Column(Integer, ForeignKey('sentences.id'), nullable=False)
    type = Column(SQLAlchemyEnum(QuestionType), nullable=False, comment="题目类型：词语选择 / 翻译选择")
    options = Column(JSON, nullable=False, comment="四个选项，JSON 格式，例如: [\"option1\", \"option2\"]") # Storing as JSON array of strings
    correct_answer = Column(Text, nullable=False, comment="正确答案")
    explanation = Column(Text, nullable=True, comment="答案解析")

    # Fields for fill-in-the-blank type questions or general question text
    question_text = Column(Text, nullable=True, comment="带有空格的句子原文 (例如填空题题干)")

    # Fields specific to translation questions
    translation_text = Column(Text, nullable=True, comment="需要翻译的原文 (通常是完整句子, 可能与 sentence.text 一致)")
    translation_options = Column(JSON, nullable=True, comment="翻译题选项 (中文)")
    correct_translation = Column(Text, nullable=True, comment="正确的翻译答案")

    # General metadata
    difficulty = Column(String(50), nullable=True, comment="题目难度") 
    knowledge_point = Column(String(255), nullable=True, comment="知识点")

    order = Column(Integer, nullable=False, default=1, comment="题目在句子中的顺序 (例如，1 for word_choice, 2 for translation)")

    sentence = relationship("Sentence", back_populates="questions")
    user_answers = relationship("UserAnswer", back_populates="question")

    def __repr__(self):
        return f"<Question(id={self.id}, type='{self.type}', sentence_id='{self.sentence_id}')>"