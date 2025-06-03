# backend/app/schemas/user_schema.py
import uuid
import enum
from pydantic import BaseModel, EmailStr, validator,Field
from datetime import datetime
from typing import Optional

class UserPlan(str, enum.Enum):
    FREE = "free"
    PREMIUM = "premium"

# Base User schema
class UserBase(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")

# Schema for user creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, example="strongpassword123")

# Schema for user update (e.g. plan change)
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    plan: Optional[UserPlan] = None

# Schema for reading user data (excluding password)
class UserRead(UserBase):
    id: uuid.UUID = Field(..., example=uuid.uuid4())
    created_at: datetime = Field(..., example=datetime.utcnow())
    plan: UserPlan = Field(..., example=UserPlan.FREE)

    class Config:
        orm_mode = True # Pydantic V1 way, for Pydantic V2 use from_attributes=True
        # from_attributes = True # For Pydantic V2

# Schema for user in DB (including hashed password, for internal use)
class UserInDB(UserRead):
    password_hash: str

# Schema for JWT token
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Schema for data in token (e.g., user ID or email)
class TokenData(BaseModel):
    email: Optional[str] = None
    # Add other fields if needed, e.g., user_id: Optional[uuid.UUID] = None