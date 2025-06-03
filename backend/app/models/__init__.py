# backend/app/models/__init__.py
# This file makes the 'models' directory a Python package.

# You can import your models here to make them easily accessible, e.g.:
from .user_model import User, UserPlan
from .sentence_model import Sentence, DifficultyLevel
from .question_model import Question, QuestionType
from .user_answer_model import UserAnswer
from .user_vocab_model import UserVocab, VocabStatus
from .user_mistake_model import UserMistake

__all__ = [
    "User", "UserPlan",
    "Sentence", "DifficultyLevel",
    "Question", "QuestionType",
    "UserAnswer",
    "UserVocab", "VocabStatus",
    "UserMistake",
]