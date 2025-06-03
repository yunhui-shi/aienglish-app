# backend/app/services/__init__.py
# This file makes the 'services' directory a Python package.

# You can import your service modules here for easier access, e.g.:
# from .item_service import ItemService

from .user_service import (
    get_user,
    get_user_by_email,
    get_users,
    create_user,
    update_user,
    delete_user
)
from .auth_service import (
    authenticate_user,
    get_current_user,
    get_current_active_user,
    oauth2_scheme
)
from .practice_service import (
    get_new_questions,
    submit_answers,
    get_question_by_id,
    generate_single_question
)
from .vocab_service import (
    add_vocab_entry,
    get_user_vocab_entries,
    get_vocab_entry_by_id,
    get_vocab_entry_by_word_and_sentence,
    update_vocab_status,
    delete_vocab_entry
)
from .mistake_service import (
    add_user_mistake,
    get_user_mistakes_list,
    get_mistake_by_id_for_user,
    delete_user_mistake
)

__all__ = [
    # User Service
    "get_user",
    "get_user_by_email",
    "get_users",
    "create_user",
    "update_user",
    "delete_user",
    # Auth Service
    "authenticate_user",
    "get_current_user",
    "get_current_active_user",
    "oauth2_scheme",
    # Practice Service
    "get_new_questions",
    "submit_answers",
    "get_question_by_id",
    "generate_single_question",
    "get_queue_length",
     "manage_user_queues",
    "save_user_queues_to_json",
    "load_user_queues_from_json",
    # Vocab Service
    "add_vocab_entry",
    "get_user_vocab_entries",
    "get_vocab_entry_by_id",
    "get_vocab_entry_by_word_and_sentence",
    "update_vocab_status",
    "delete_vocab_entry",
    # Mistake Service
    "add_user_mistake",
    "get_user_mistakes_list",
    "get_mistake_by_id_for_user",
    "delete_user_mistake",
]