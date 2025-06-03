# backend/app/schemas/__init__.py
# This file makes the 'schemas' directory a Python package.
import enum # <--- Added import for enum

# You can import your Pydantic schemas here for easier access, e.g.:
from .user_schema import UserBase, UserCreate, UserUpdate, UserRead, UserInDB, UserPlan, Token, TokenData
from .sentence_schema import SentenceBase, SentenceCreate, SentenceUpdate, SentenceRead, DifficultyLevel
from .question_schema import QuestionBase, QuestionCreate, QuestionUpdate, QuestionRead, QuestionType
from .user_answer_schema import UserAnswerBase, UserAnswerCreate, UserAnswerRead
from .user_vocab_schema import UserVocabBase, UserVocabCreate, UserVocabUpdate, UserVocabRead, VocabStatus, WordExplanation

__all__ = [
    "UserBase", "UserCreate", "UserUpdate", "UserRead", "UserInDB", "UserPlan", "Token", "TokenData",
    "SentenceBase", "SentenceCreate", "SentenceUpdate", "SentenceRead", "DifficultyLevel",
    "QuestionBase", "QuestionCreate", "QuestionUpdate", "QuestionRead", "QuestionType",
    "UserAnswerBase", "UserAnswerCreate", "UserAnswerRead",
    "UserVocabBase", "UserVocabCreate", "UserVocabUpdate", "UserVocabRead", "VocabStatus", "WordExplanation",
]