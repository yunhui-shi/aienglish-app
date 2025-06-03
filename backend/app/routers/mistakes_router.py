# backend/app/routers/mistakes_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, services, models
from ..db import get_db
from ..services import auth_service # For protecting routes

router = APIRouter(
    prefix="/mistakes",
    tags=["Mistakes"],
    dependencies=[Depends(auth_service.get_current_active_user)]
)

@router.get("/")
async def get_user_mistakes(
    skip: int = 0, limit: int = 100,
    grammar_point: str = None, # Optional filter by grammar point
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """
    获取用户的错题记录，基于user_answers和questions表的联合查询
    """
    mistakes = services.mistake_service.get_user_incorrect_answers(
        db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit
    )
    
    # 如果指定了语法点过滤，则进行过滤
    if grammar_point:
        mistakes = [
            mistake for mistake in mistakes 
            if grammar_point.lower() in (mistake.get('topic', '').lower() or 
                                        any(gp.lower().find(grammar_point.lower()) != -1 
                                           for gp in mistake.get('grammar_points', [])))
        ]
    
    return mistakes

@router.get("/{answer_id}")
async def get_mistake_details(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user) # Ensure user owns the mistake
):
    """
    根据答案ID获取特定的错题详情
    """
    mistake = services.mistake_service.get_user_incorrect_answer_by_id(
        db, 
        user_id=current_user.id, 
        answer_id=answer_id
    )
    if not mistake:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Mistake not found or not owned by user"
        )
    return mistake

@router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mistake(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """
    删除特定的错题记录（删除user_answer记录）
    """
    # 首先检查记录是否存在且属于当前用户
    user_answer = db.query(models.UserAnswer).filter(
        models.UserAnswer.id == answer_id,
        models.UserAnswer.user_id == current_user.id,
        models.UserAnswer.is_correct == False
    ).first()
    
    if not user_answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Mistake not found or not owned by user"
        )
    
    # 删除记录
    db.delete(user_answer)
    db.commit()
    return