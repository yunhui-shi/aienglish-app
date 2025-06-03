from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.pool import QueuePool
from sqlalchemy import text
from typing import Dict, Any
import time
from datetime import datetime

from ..db import engine, get_db
from ..services import auth_service
from .. import models

router = APIRouter(
    prefix="/monitor",
    tags=["Monitor"],
)

@router.get("/db/pool-status")
async def get_database_pool_status(
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """获取数据库连接池状态信息"""
    try:
        pool = engine.pool
        
        # 基本连接池信息
        pool_info = {
            "timestamp": datetime.utcnow().isoformat(),
            "pool_class": pool.__class__.__name__,
            "database_url": str(engine.url).replace(engine.url.password or "", "***") if engine.url.password else str(engine.url),
        }
        
        # 如果是QueuePool，获取详细状态
        if isinstance(pool, QueuePool):
            overflow_count = max(0, pool.overflow())  # 确保溢出连接数不为负数
            pool_info.update({
                "pool_size": pool.size(),
                "checked_in_connections": pool.checkedin(),
                "checked_out_connections": pool.checkedout(),
                "overflow_connections": overflow_count,
                "total_connections": pool.size() + overflow_count,
                "available_connections": pool.checkedin(),
                "busy_connections": pool.checkedout(),
                "pool_timeout": getattr(pool, '_timeout', None),
                "max_overflow": getattr(pool, '_max_overflow', None),
                "pool_recycle": getattr(pool, '_recycle', None),
                "pool_pre_ping": getattr(pool, '_pre_ping', None),
            })
            
            # 计算使用率
            total_capacity = pool.size() + getattr(pool, '_max_overflow', 0)
            current_usage = pool.checkedout()
            usage_percentage = (current_usage / total_capacity * 100) if total_capacity > 0 else 0
            
            pool_info["usage_percentage"] = round(usage_percentage, 2)
            pool_info["health_status"] = "healthy" if usage_percentage < 80 else "warning" if usage_percentage < 95 else "critical"
        else:
            pool_info["note"] = "Detailed pool statistics only available for QueuePool"
            
        return {
            "status": "success",
            "data": pool_info
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to get pool status: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/db/connection-test")
async def test_database_connection(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """测试数据库连接"""
    try:
        start_time = time.time()
        
        # 执行一个简单的查询来测试连接
        result = db.execute(text("SELECT 1 as test_value")).fetchone()
        
        end_time = time.time()
        response_time = round((end_time - start_time) * 1000, 2)  # 转换为毫秒
        
        return {
            "status": "success",
            "message": "Database connection is healthy",
            "response_time_ms": response_time,
            "test_result": result[0] if result else None,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/db/health")
async def get_database_health(
    current_user: models.User = Depends(auth_service.get_current_active_user)
):
    """获取数据库整体健康状态"""
    try:
        # 获取连接池状态
        pool_response = await get_database_pool_status(current_user)
        
        # 测试连接
        db_gen = get_db()
        db = next(db_gen)
        try:
            connection_response = await test_database_connection(db, current_user)
        finally:
            db.close()
        
        # 综合健康状态
        overall_status = "healthy"
        issues = []
        
        if pool_response["status"] == "error":
            overall_status = "critical"
            issues.append("Pool status check failed")
        elif "data" in pool_response and "health_status" in pool_response["data"]:
            pool_health = pool_response["data"]["health_status"]
            if pool_health == "critical":
                overall_status = "critical"
                issues.append("Connection pool usage is critical")
            elif pool_health == "warning" and overall_status == "healthy":
                overall_status = "warning"
                issues.append("Connection pool usage is high")
        
        if connection_response["status"] == "error":
            overall_status = "critical"
            issues.append("Database connection test failed")
        
        return {
            "status": "success",
            "data": {
                "overall_health": overall_status,
                "issues": issues,
                "pool_status": pool_response,
                "connection_test": connection_response,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }