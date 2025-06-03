# backend/app/schemas/sentence_schema.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime # Though not directly in Sentence, might be in related schemas
import enum
# Enum for difficulty, mirroring the model's enum
class DifficultyLevel(str, enum.Enum):
    ADVANCED = "advanced"
    MEDIUM = "medium"
    HARD = "hard"

# Base Sentence schema
class SentenceBase(BaseModel):
    text: str = Field(..., example="Although the committee had been in discussion for three hours, the chairman insisted that the motion ______ put to a vote.")
    translation: str = Field(..., example="尽管委员会已经讨论了三个小时，主席仍然坚持将议案付诸表决。")
    grammar_point: Optional[str] = Field(None, example="虚拟语气")
    difficulty: Optional[DifficultyLevel] = Field(DifficultyLevel.MEDIUM, example=DifficultyLevel.MEDIUM)

# Schema for sentence creation
class SentenceCreate(SentenceBase):
    pass

# Schema for sentence update
class SentenceUpdate(SentenceBase):
    text: Optional[str] = None
    translation: Optional[str] = None
    # Other fields can be made optional as needed

# Schema for reading sentence data
class SentenceRead(SentenceBase):
    id: int = Field(..., example=1)
    # created_by: Optional[uuid.UUID] = None # If you add created_by to the model and want to expose it

    class Config:
        from_attributes = True # Pydantic V2

# You might also want a schema that includes related questions when fetching a sentence
# from .question_schema import QuestionRead # Forward declaration, define QuestionRead first

# class SentenceWithQuestionsRead(SentenceRead):
#     questions: List[QuestionRead] = []