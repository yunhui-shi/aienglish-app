# backend/app/services/mistake_service.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional

from .. import models, schemas

def add_user_mistake(db: Session, user_id, mistake_data: schemas.question_schema) -> models.UserMistake:
    # Potentially check if a similar mistake for the same sentence already exists to avoid duplicates
    # existing_mistake = db.query(models.UserMistake).filter(
    #     models.UserMistake.user_id == user_id,
    #     models.UserMistake.sentence_id == mistake_data.sentence_id,
    #     models.UserMistake.grammar_point == mistake_data.grammar_point # Or other criteria
    # ).first()
    # if existing_mistake:
    #     return existing_mistake # Or update timestamp, etc.

    db_mistake = models.UserMistake(
        **mistake_data.model_dump(),
        user_id=user_id
    )
    db.add(db_mistake)
    db.commit()
    db.refresh(db_mistake)
    return db_mistake

def get_user_mistakes_list(db: Session, user_id, grammar_point: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[models.UserMistake]:
    query = db.query(models.UserMistake).filter(models.UserMistake.user_id == user_id)
    if grammar_point:
        query = query.filter(models.UserMistake.grammar_point.ilike(f"%{grammar_point}%")) # Case-insensitive search
    return query.order_by(models.UserMistake.created_at.desc()).offset(skip).limit(limit).all()

def get_mistake_by_id_for_user(db: Session, mistake_id: str, user_id) -> Optional[models.UserMistake]:
    return db.query(models.UserMistake).filter(
        models.UserMistake.id == mistake_id,
        models.UserMistake.user_id == user_id
    ).first()

def delete_user_mistake(db: Session, mistake_id: str, user_id) -> bool:
    db_mistake = get_mistake_by_id_for_user(db, mistake_id=mistake_id, user_id=user_id)
    if db_mistake:
        db.delete(db_mistake)
        db.commit()
        return True
    return False

def get_user_incorrect_answers(db: Session, user_id, skip: int = 0, limit: int = 100) -> List[dict]:
    """
    获取用户的错题记录，通过联合user_answers和questions表查询is_correct为false的记录
    """
    # 联合查询user_answers和questions表，获取错题信息
    query = db.query(
        models.UserAnswer,
        models.Question,
        models.Sentence
    ).join(
        models.Question, models.UserAnswer.question_id == models.Question.id
    ).join(
        models.Sentence, models.Question.sentence_id == models.Sentence.id
    ).filter(
        and_(
            models.UserAnswer.user_id == user_id,
            models.UserAnswer.is_correct == False
        )
    ).order_by(
        models.UserAnswer.answered_at.desc()
    ).offset(skip).limit(limit)
    
    results = query.all()
    
    # 格式化返回数据
    mistake_records = []
    for user_answer, question, sentence in results:
        mistake_record = {
            "id": str(user_answer.id),
            "question_id": str(question.id),
            "sentence": sentence.text,
            "question_type": question.type.value,
            "question_text": question.question_text or "",
             "selected_word_answer": user_answer.selected_word_answer,
             "selected_translation_answer": user_answer.selected_translation_answer,
             "correct_answer": question.correct_answer,
            "explanation": question.explanation or "",
            "grammar_points": [question.knowledge_point] if question.knowledge_point else [],
            "answered_at": user_answer.answered_at.isoformat(),
            "difficulty": question.difficulty or "medium",
            "topic": sentence.grammar_point or "general",
            "options": question.options if question.options else [],
            "translation_text": question.translation_text,
            "translation_options": question.translation_options if question.translation_options else [],
            "correct_translation": question.correct_translation
        }
        mistake_records.append(mistake_record)
    
    return mistake_records

def get_user_incorrect_answer_by_id(db: Session, user_id, answer_id: int) -> Optional[dict]:
    """
    根据答案ID获取特定的错题记录
    """
    result = db.query(
        models.UserAnswer,
        models.Question,
        models.Sentence
    ).join(
        models.Question, models.UserAnswer.question_id == models.Question.id
    ).join(
        models.Sentence, models.Question.sentence_id == models.Sentence.id
    ).filter(
        and_(
            models.UserAnswer.id == answer_id,
            models.UserAnswer.user_id == user_id,
            models.UserAnswer.is_correct == False
        )
    ).first()
    
    if not result:
        return None
    
    user_answer, question, sentence = result
    
    return {
        "id": str(user_answer.id),
        "question_id": str(question.id),
        "sentence": sentence.text,
        "question_type": question.type.value,
        "question_text": question.question_text or "",
         "selected_word_answer": user_answer.selected_word_answer,
         "selected_translation_answer": user_answer.selected_translation_answer,
         "correct_answer": question.correct_answer,
        "explanation": question.explanation or "",
        "grammar_points": [question.knowledge_point] if question.knowledge_point else [],
        "answered_at": user_answer.answered_at.isoformat(),
        "difficulty": question.difficulty or "medium",
        "topic": sentence.grammar_point or "general",
        "options": question.options if question.options else [],
        "translation_text": question.translation_text,
        "translation_options": question.translation_options if question.translation_options else [],
        "correct_translation": question.correct_translation
    }