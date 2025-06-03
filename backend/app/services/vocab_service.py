# backend/app/services/vocab_service.py
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas

def add_vocab_entry(db: Session, user_id: str, vocab_entry: schemas.UserVocabCreate) -> models.UserVocab:
    db_vocab_entry = models.UserVocab(
        **vocab_entry.model_dump(),
        user_id=user_id
    )
    db.add(db_vocab_entry)
    db.commit()
    db.refresh(db_vocab_entry)
    return db_vocab_entry

def get_user_vocab_entries(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[models.UserVocab]:
    return db.query(models.UserVocab).filter(models.UserVocab.user_id == user_id).offset(skip).limit(limit).all()

def get_vocab_entry_by_id(db: Session, vocab_id: str, user_id: str) -> Optional[models.UserVocab]:
    return db.query(models.UserVocab).filter(models.UserVocab.id == vocab_id, models.UserVocab.user_id == user_id).first()

def get_vocab_entry_by_word_and_sentence(db: Session, user_id: str, word: str, sentence_id: Optional[str] = None) -> Optional[models.UserVocab]:
    query = db.query(models.UserVocab).filter(
        models.UserVocab.user_id == user_id,
        models.UserVocab.word == word
    )
    if sentence_id:
        query = query.filter(models.UserVocab.sentence_id == sentence_id)
    else:
        query = query.filter(models.UserVocab.sentence_id.is_(None))
    return query.first()

def update_vocab_status(db: Session, vocab_id: str, user_id: str, status: schemas.VocabStatus) -> Optional[models.UserVocab]:
    db_vocab_entry = get_vocab_entry_by_id(db, vocab_id=vocab_id, user_id=user_id)
    if db_vocab_entry:
        db_vocab_entry.status = status
        db.commit()
        db.refresh(db_vocab_entry)
    return db_vocab_entry

def delete_vocab_entry(db: Session, vocab_id: str, user_id: str) -> bool:
    db_vocab_entry = get_vocab_entry_by_id(db, vocab_id=vocab_id, user_id=user_id)
    if db_vocab_entry:
        db.delete(db_vocab_entry)
        db.commit()
        return True
    return False

def get_word_explanation(db: Session, word: str) -> schemas.WordExplanation:
    """
    Get explanation for a specific word.
    This is a mock implementation that returns hardcoded explanations for a few common words
    and a generic response for others.
    In a real application, this would call an external dictionary API or query a database.
    """
    # Convert word to lowercase for case-insensitive matching
    word_lower = word.lower()
    
    # Dictionary of common words with their explanations
    word_dict = {
        "hello": {
            "word": "hello",
            "explanation": "Used as a greeting or to begin a conversation.",
            "pronunciation": "/həˈloʊ/",
            "example_sentence": "Hello, how are you today?"
        },
        "world": {
            "word": "world",
            "explanation": "The earth, together with all of its countries and peoples.",
            "pronunciation": "/wɜːrld/",
            "example_sentence": "He wants to travel around the world."
        },
        "computer": {
            "word": "computer",
            "explanation": "An electronic device for storing and processing data.",
            "pronunciation": "/kəmˈpjuːtər/",
            "example_sentence": "She bought a new computer for her studies."
        },
        "language": {
            "word": "language",
            "explanation": "The method of human communication, either spoken or written, consisting of the use of words in a structured and conventional way.",
            "pronunciation": "/ˈlæŋɡwɪdʒ/",
            "example_sentence": "English is a global language."
        },
        "programming": {
            "word": "programming",
            "explanation": "The process of writing computer programs.",
            "pronunciation": "/ˈproʊɡræmɪŋ/",
            "example_sentence": "She enjoys programming in Python."
        }
    }
    
    # Return the explanation if the word is in our dictionary
    if word_lower in word_dict:
        return schemas.WordExplanation(**word_dict[word_lower])
    
    # For words not in our dictionary, return a generic explanation
    return schemas.WordExplanation(
        word=word,
        explanation=f"Definition for '{word}' is not available in our dictionary yet.",
        pronunciation=None,
        example_sentence=None
    )