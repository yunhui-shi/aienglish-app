# backend/app/routers/__init__.py
# This file makes the 'routers' directory a Python package.

# You can import your router modules here for easier access from app.main, e.g.:
# from .items_router import router as items_router
# from .users_router import router as users_router

from .auth_router import router as auth_router
from .practice_router import router as practice_router
from .vocab_router import router as vocab_router
from .mistakes_router import router as mistakes_router
from .monitor_router import router as monitor_router

__all__ = [
    "auth_router",
    "practice_router",
    "vocab_router",
    "mistakes_router",
    "monitor_router",
]