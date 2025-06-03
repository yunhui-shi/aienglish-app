# backend/app/routers/practice_router.py
"""
练习相关的路由模块

包含以下功能：
- 获取新的练习题目集
- 提交练习答案
- 获取特定问题的详情
- 获取用户的练习历史记录
- 获取用户的练习统计信息
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from .. import schemas, services, models
from ..db import get_db
from ..services import auth_service # For protecting routes

router = APIRouter(
    prefix="/practice",
    tags=["Practice"],
)

# Initialize cache pool when entering the page
@router.post("/cache/initialize")
async def initialize_cache_pool(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """初始化用户缓存池，在用户访问或刷新页面时调用"""
    try:
        # Call the practice service to initialize cache pool for this user
        services.practice_service._initialize_cache_pool(db, current_user.id)
        return {"message": "Cache pool initialization completed", "user_id": current_user.id}
    except Exception as e:
        print(f"[PracticeRouter] Error initializing cache pool for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to initialize cache pool"
        )

# Get a new practice set
@router.get("/set/new", response_model=schemas.QuestionRead)
async def get_new_practice_set(
    topic: Optional[str] = Query(None, description="The desired topic for the question"),
    difficulty: Optional[str] = Query(None, description="The desired difficulty level for the question (e.g., medium, hard, advanced)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """从 Redis 缓存或生成一个新的练习题目，历史记录从数据库中自动获取"""
    question = services.get_new_questions(
        db=db, 
        user_id=current_user.id, 
        topic=topic, 
        difficulty=difficulty
    )
    if not question:
        # Log this event or handle it more gracefully
        print(f"[PracticeRouter] /set/new failed to get or generate a question for user {current_user.id}, topic: {topic}, difficulty: {difficulty}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Could not retrieve or generate a new question at this time.")
    
    # Ensure the question object is correctly serialized by schemas.QuestionRead
    # This might involve eager loading relationships if QuestionRead expects them
    # For example, if options are related and needed:
    # _ = question.options # Accessing options to trigger lazy load if not already loaded
    
    return question
# Submit answers for a practice set
@router.post("/set/submit", response_model=List[schemas.UserAnswerRead])
async def submit_practice_set_answers(
    answers: List[schemas.UserAnswerCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """提交一组练习题的答案"""
    print(f"[PracticeRouter] /set/submit received answers: {answers} for user: {current_user.id}") # DEBUG PRINT
    if not answers:
        print("[PracticeRouter] /set/submit error: No answers provided.") # DEBUG PRINT
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No answers provided")
    
    # Pass current_user.id to the service layer
    evaluated_answers = services.submit_answers(db, user_id=current_user.id, answers=answers)
    print(f"[PracticeRouter] /set/submit processed answers, result: {evaluated_answers}") # DEBUG PRINT
    return evaluated_answers

# Get a specific question by ID (for review or detail)
@router.get("/question/{question_id}", response_model=schemas.QuestionRead)
async def get_question_by_id(
    question_id: str, 
    db: Session = Depends(get_db)
    # current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """获取特定问题的详细信息"""
    question = services.get_question_by_id(db, question_id=question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question

# Get user's practice history
@router.get("/history", response_model=List[schemas.UserAnswerRead])
async def get_practice_history(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db)
    # current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """获取用户的练习历史记录"""
    # 查询用户的答题记录，按时间倒序排列
    user_answers = db.query(models.UserAnswer).filter(
        models.UserAnswer.user_id == "temp_user_id_for_testing" # Placeholder
    ).order_by(
        models.UserAnswer.answered_at.desc()
    ).offset(offset).limit(limit).all()
    
    return user_answers

# Get user's practice statistics
@router.get("/stats")
async def get_practice_stats(
    db: Session = Depends(get_db)
    # current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """获取用户的练习统计信息"""
    # 查询用户的总答题数
    total_answers = db.query(models.UserAnswer).filter(
        models.UserAnswer.user_id == "temp_user_id_for_testing" # Placeholder
    ).count()
    
    # 查询用户的正确答题数
    correct_answers = db.query(models.UserAnswer).filter(
        models.UserAnswer.user_id == "temp_user_id_for_testing", # Placeholder
        models.UserAnswer.is_correct == True
    ).count()
    
    # 计算正确率
    accuracy = 0 if total_answers == 0 else (correct_answers / total_answers) * 100
    
    # 查询用户最近一周的答题情况
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    recent_answers = db.query(models.UserAnswer).filter(
        models.UserAnswer.user_id == "temp_user_id_for_testing", # Placeholder
        models.UserAnswer.answered_at >= one_week_ago
    ).count()
    
    return {
        "total_answers": total_answers,
        "correct_answers": correct_answers,
        "accuracy": round(accuracy, 2),  # 保留两位小数
        "recent_answers": recent_answers
    }
