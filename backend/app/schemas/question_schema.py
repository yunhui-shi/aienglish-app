# backend/app/schemas/question_schema.py
from pydantic import BaseModel, Field
from typing import List, Any, Optional
import enum

class QuestionType(str, enum.Enum):
    WORD_CHOICE = "word_choice"
    TRANSLATION = "translation"

# Base Question schema
class QuestionBase(BaseModel):
    sentence_id: int = Field(..., example=1)
    type: QuestionType = Field(..., example=QuestionType.WORD_CHOICE)
    options: List[str] = Field(..., min_items=4, max_items=4, example=["was", "is", "were", "be"])
    correct_answer: str = Field(..., example="be")
    explanation: Optional[str] = Field(None, example="'insisted that' 引导虚拟语气，用原形 be。")
    order: int = Field(..., ge=1, example=1)

    # New fields from models.Question
    question_text: Optional[str] = Field(None, example="He insisted that the work ____ done by Friday.")
    translation_text: Optional[str] = Field(None, example="He insisted that the work be done by Friday.")
    translation_options: Optional[List[str]] = Field(None, example=["他坚持要求工作在周五前完成。", "他坚持工作已经在周五前完成了。", "他坚持工作将在周五前完成。"])
    correct_translation: Optional[str] = Field(None, example="他坚持要求工作在周五前完成。")
    difficulty: Optional[str] = Field(None, example="medium")
    knowledge_point: Optional[str] = Field(None, example="虚拟语气 (Subjunctive Mood)")

# Schema for question creation
class QuestionCreate(QuestionBase):
    pass

# Schema for question update
class QuestionUpdate(BaseModel):
    options: Optional[List[str]] = Field(None, min_items=4, max_items=4)
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    order: Optional[int] = Field(None, ge=1)

# Import SentenceRead for nested sentence data
from .sentence_schema import SentenceRead

# Schema for reading question data
class QuestionRead(QuestionBase):
    id: int = Field(..., example=1)
    sentence: SentenceRead = Field(..., description="Associated sentence data")
    # All fields from QuestionBase are inherited. 
    # If there are fields in Question model that are in QuestionRead but not QuestionBase,
    # they should be added here. In this case, all new fields were added to QuestionBase.

    class Config:
        from_attributes = True # Pydantic V2