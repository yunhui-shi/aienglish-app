# backend/app/schemas/user_vocab_schema.py
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class VocabStatus(str, Enum):
    NEW = "new"
    LEARNING = "learning"
    MASTERED = "mastered"

# Base UserVocab schema
class UserVocabBase(BaseModel):
    word: str = Field(..., example="insist")
    sentence_id: Optional[int] = Field(None, example=1, description="ID of the sentence where the word was encountered")
    # user_id will be taken from authenticated user

# Schema for adding a new word to vocab
class UserVocabCreate(UserVocabBase):
    pass

# Schema for updating a vocab entry (e.g., status)
class UserVocabUpdate(BaseModel):
    status: Optional[VocabStatus] = Field(None, example=VocabStatus.LEARNING)
    # sentence_id: Optional[uuid.UUID] = None # If allowing to change source sentence
    # word: Optional[str] = None # Usually word itself is not changed, but deleted and re-added

# Schema for reading vocab data
class UserVocabRead(UserVocabBase):
    id: int = Field(..., example=1)
    user_id: UUID = Field(..., example="123e4567-e89b-12d3-a456-426614174000")
    status: VocabStatus = Field(..., example=VocabStatus.NEW)
    added_at: datetime = Field(..., example=datetime.utcnow())
    # last_reviewed_at: Optional[datetime] = None

    class Config:
        orm_mode = True # Pydantic V1
        # from_attributes = True # Pydantic V2

# Schema for word explanations
class WordExplanation(BaseModel):
    word: str = Field(..., example="insist")
    explanation: str = Field(..., example="to state firmly that something is true")
    pronunciation: Optional[str] = Field(None, example="/ɪnˈsɪst/")
    example_sentence: Optional[str] = Field(None, example="She insisted that she was right.")
    
    class Config:
        orm_mode = True # Pydantic V1