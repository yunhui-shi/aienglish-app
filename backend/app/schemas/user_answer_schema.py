# backend/app/schemas/user_answer_schema.py
import uuid
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Base UserAnswer schema
class UserAnswerBase(BaseModel):
    user_id: uuid.UUID = Field(..., example=uuid.uuid4())
    question_id: int = Field(..., example=1)
    selected_word_answer: Optional[str] = Field(None, example="be")
    selected_translation_answer: Optional[str] = Field(None, example="是")
    is_correct: bool = Field(..., example=True)

# Schema for user answer creation (usually submitted by user)
class UserAnswerCreate(BaseModel):
    question_id: int = Field(..., example=1)
    selected_word_answer: Optional[str] = Field(None, example="be")
    selected_translation_answer: Optional[str] = Field(None, example="是")
    answered_at: Optional[datetime] = None # Add this line
    question_type: Optional[str] = None # Also adding question_type as it's sent by frontend
    # user_id will be taken from authenticated user
    # is_correct will be determined by the backend logic

# Schema for reading user answer data
class UserAnswerRead(UserAnswerBase):
    id: int = Field(..., example=1)
    answered_at: datetime = Field(..., example=datetime.utcnow())

    class Config:
        orm_mode = True # Pydantic V1
        # from_attributes = True # Pydantic V2