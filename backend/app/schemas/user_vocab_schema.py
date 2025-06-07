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
    phonetic: Optional[str] = Field(None, example="/ɪnˈsɪst/", description="音标")
    definition: Optional[str] = Field(None, description="释义（JSON格式）")
    sentence_id: Optional[int] = Field(None, example=1, description="ID of the sentence where the word was encountered")
    status: Optional[VocabStatus] = Field(None, example=VocabStatus.LEARNING, description="学习状态")
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

# Schema for word definitions
class WordDefinition(BaseModel):
    part_of_speech: str = Field(..., example="v.", description="词性")
    meanings: List[str] = Field(..., example=["跑，奔跑", "操作，运行", "管理"], description="词义列表")

# Schema for word explanation request
class WordExplanationRequest(BaseModel):
    word: str = Field(..., example="run", description="要查询的单词")
    sentence: Optional[str] = Field(None, example="I like to run in the morning.", description="单词所在的句子上下文")

# Schema for word explanations
class WordExplanation(BaseModel):
    word: str = Field(..., example="run")
    phonetic: Optional[str] = Field(None, example="/rʌn/", description="音标")
    definitions: List[WordDefinition] = Field(..., description="词义定义列表")
    
    class Config:
        orm_mode = True # Pydantic V1