# backend/app/services/auth_service.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from .. import models, schemas
from ..core import security
from ..db import get_db
from . import user_service # Use the user_service we created

# OAuth2PasswordBearer for token dependency
# tokenUrl should point to your login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login/token") 

def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    user = user_service.get_user_by_email(db, email=email)
    if not user:
        return None
    if not security.verify_password(password, user.password_hash):
        return None
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = security.decode_access_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    user = user_service.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    # if current_user.disabled: # If you add a 'disabled' field to your User model
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user