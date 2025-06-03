# backend/app/routers/vocab_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, services, models
from ..db import get_db
from ..services import auth_service # For protecting routes

router = APIRouter(
    prefix="/vocab",
    tags=["Vocabulary"],
    dependencies=[Depends(auth_service.get_current_active_user)]
)

@router.post("/", response_model=schemas.UserVocabRead, status_code=status.HTTP_201_CREATED)
async def add_word_to_vocab(
    vocab_entry: schemas.UserVocabCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    # Check if word (and sentence context) already exists for this user
    # existing_entry = services.vocab_service.get_vocab_entry_by_word_and_sentence(
    #     db, user_id=current_user.id, word=vocab_entry.word, sentence_id=vocab_entry.sentence_id
    # )
    # if existing_entry:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Word already in vocabulary for this context")
    # created_entry = services.vocab_service.add_vocab_entry(db, user_id=current_user.id, vocab_entry=vocab_entry)
    # return created_entry
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Endpoint not yet implemented")

@router.get("/", response_model=List[schemas.UserVocabRead])
async def get_user_vocab(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    # vocab_list = services.vocab_service.get_user_vocab_entries(db, user_id=current_user.id, skip=skip, limit=limit)
    # return vocab_list
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Endpoint not yet implemented")

@router.put("/{vocab_id}", response_model=schemas.UserVocabRead)
async def update_vocab_entry_status(
    vocab_id: str, 
    vocab_update: schemas.UserVocabUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    # updated_entry = services.vocab_service.update_vocab_status(db, vocab_id=vocab_id, user_id=current_user.id, status=vocab_update.status)
    # if not updated_entry:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocabulary entry not found or not owned by user")
    # return updated_entry
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Endpoint not yet implemented")

@router.delete("/{vocab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vocab_entry(
    vocab_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    # success = services.vocab_service.delete_vocab_entry(db, vocab_id=vocab_id, user_id=current_user.id)
    # if not success:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocabulary entry not found or not owned by user")
    # return
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Endpoint not yet implemented")

@router.get("/word/{word}/explanation", response_model=schemas.WordExplanation)
async def get_word_explanation(
    word: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """Get explanation for a specific word"""
    try:
        # Call the vocabulary service to get word explanation
        explanation = services.vocab_service.get_word_explanation(db, word)
        if not explanation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No explanation found for word: {word}")
        return explanation
    except Exception as e:
        print(f"[VocabRouter] Error getting explanation for word {word}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to get explanation for word: {word}"
        )