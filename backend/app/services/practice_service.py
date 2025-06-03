# backend/app/services/practice_service.py
import uuid
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Deque
import random # For basic random selection, can be replaced with more sophisticated logic
from collections import deque
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json,os
import redis
from datetime import datetime

from .. import models, schemas

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)

# Define a cache key prefix
# CACHE_KEY_PREFIX = "practice_question:" # Removed as per user request
CACHE_EXPIRATION_SECONDS = 3600*48  # 48 hour
CACHE_MONITOR_RUNNING=False
CACHE_MONITOR_THREAD = None
REDIS_PUBSUB = None
# Global cache monitoring configuration using Redis notifications
# Removed USER_CACHE_INITIALIZED as per user request, initialization check is done by r.exists()
# USER_CACHE_INITIALIZED = set()

# Define cacheable combinations (topic, difficulty)
CACHE_COMBINATIONS = [
    ('general', 'medium'),
    ('general', 'hard'),
    ('general', 'advanced'),
    ('culture', 'medium'),
    ('culture', 'hard'),
    ('culture', 'advanced'),
    ('technology', 'medium'),
    ('technology', 'hard'),
    ('technology', 'advanced'),
    ('life', 'medium'),
    ('life', 'hard'),
    ('life', 'advanced'),
    ('history', 'medium'),
    ('history', 'hard'),
    ('history', 'advanced'),
]

def _setup_redis_notifications():
    """Setup Redis keyspace notifications for cache monitoring."""
    try:
        # Enable keyevent notifications for expired and deleted keys
        # Ex: expired events, Kx: keyspace events for expired keys
        # AKE: all keyspace and keyevent notifications
        r.config_set('notify-keyspace-events', 'AKE')
        print("[CacheService] Redis keyevent notifications enabled for all events")
        
        # Verify the configuration
        config_value = r.config_get('notify-keyspace-events')
        print(f"[CacheService] Current notify-keyspace-events config: {config_value}")
        return True
    except Exception as e:
        print(f"[CacheService] Failed to enable Redis notifications: {e}")
        return False

def _start_cache_monitor():
    """Start the global cache monitoring using Redis notifications."""
    global CACHE_MONITOR_RUNNING, CACHE_MONITOR_THREAD, REDIS_PUBSUB
    
    if CACHE_MONITOR_RUNNING:
        print("[CacheService] Cache monitor already running")
        return
    
    if not _setup_redis_notifications():
        print("[CacheService] Failed to setup Redis notifications, cache monitor not started")
        return
    
    def monitor_cache():
        global REDIS_PUBSUB
        try:
            # Create a separate Redis connection for pubsub
            pubsub_redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
            REDIS_PUBSUB = pubsub_redis.pubsub()
            
            # Subscribe to both keyevent and keyspace notifications
            # __keyevent@0__:expired - for expired keys
            # __keyevent@0__:del - for deleted keys
            # __keyspace@0__:* - for all keyspace events
            REDIS_PUBSUB.psubscribe(
                '__keyevent@0__:expired', 
                '__keyevent@0__:del',
                '__keyspace@0__:*'
            )
            
            print("[CacheService] Cache monitor started, listening for Redis notifications")
            print(f"[CacheService] Monitoring cache combinations: {CACHE_COMBINATIONS}")
            
            for message in REDIS_PUBSUB.listen():
                # print(f"[CacheService] Raw Redis message: {message}")
                
                if message['type'] == 'pmessage':
                    channel = message['channel']
                    key = message['data']  # In keyevent, the data is the key name
                    
                    print(f"[CacheService] Received Redis event: {channel} for key '{key}'")
                    
                    # Handle keyspace events (extract key from channel)
                    if '__keyspace@0__:' in channel:
                        key = channel.split('__keyspace@0__:', 1)[1]
                        operation = message['data']
                        print(f"[CacheService] Keyspace event - Key: '{key}', Operation: '{operation}'")
                        
                        if operation in ['del', 'expired'] and _is_cache_key(key):
                            print(f"[CacheService] Cache key '{key}' was {operation}, triggering replenishment")
                            # Parse user_id, topic and difficulty from the key
                            # Assumes keys are in 'user_id:topic_difficulty' or 'global:topic_difficulty' format
                            if ':' in key:
                                user_prefix, rest_of_key = key.split(':', 1)
                                parts = rest_of_key.split('_')
                                if len(parts) == 2:  # topic_difficulty
                                    topic, difficulty = parts[0], parts[1]
                                    user_id_for_replenish = None if user_prefix == 'global' else user_prefix
                                    replenish_cache(user_id_for_replenish, topic, difficulty)
                                else:
                                    print(f"[CacheService] Key '{key}' does not match expected format 'user_id:topic_difficulty', not replenishing.")                    
                    # Handle keyevent events
                    # elif '__keyevent@0__:' in channel:
                    #     print(f"[CacheService] Keyevent event - Key: '{key}', Channel: '{channel}'")
                        
                    #     # Check if this is one of our cache keys
                    #     if _is_cache_key(key):
                    #         event_type = 'expired' if 'expired' in channel else 'deleted'
                    #         print(f"[CacheService] Cache key '{key}' was {event_type}, triggering replenishment")
                    #         replenish_cache(user_id, topic, difficulty)
                    #     else:
                    #         print(f"[CacheService] Ignoring keyevent for non-cache key: {key}")
                            
        except Exception as e:
            print(f"[CacheService] Cache monitor error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if REDIS_PUBSUB:
                REDIS_PUBSUB.close()
    
    CACHE_MONITOR_RUNNING = True
    CACHE_MONITOR_THREAD = threading.Thread(target=monitor_cache, daemon=True)
    CACHE_MONITOR_THREAD.start()
    print("[CacheService] Global cache monitor thread started")

def _is_cache_key(key: str) -> bool:
    """Check if a key is one of our monitored cache keys."""
    # Check both with and without cache prefix
    key_clean = key.split(':')[-1]  # Remove the prefix
    for topic, difficulty in CACHE_COMBINATIONS:
        expected_key = f"{topic}_{difficulty}"        
        if key_clean == expected_key:
            print(f"[CacheService] Detected cache key event for {topic}_{difficulty}")
            return True
    
    return False

def replenish_cache(user_id: Optional[str], topic: str, difficulty: str, async_mode: bool = True):
    """统一的缓存补充函数，支持同步和异步模式。
    
    Args:
        user_id: 用户ID，None表示全局缓存
        topic: 主题
        difficulty: 难度
        async_mode: 是否异步执行，默认True
    """
    def replenish_task():
        db = None
        try:
            print(f"[CacheService] 开始补充缓存 - 用户: {user_id or 'global'}, 主题: {topic}, 难度: {difficulty}")
            
            # 在后台线程中创建新的数据库连接
            from ..db import get_db
            db = next(get_db())
            
            user_prefix = user_id if user_id else "global"
            cache_key = f"{user_prefix}:{topic}_{difficulty}"
            
            # 只有当缓存键不存在时才补充，避免覆盖现有数据
            if not r.exists(cache_key):
                print(f"[CacheService] 开始为缓存键补充内容: {cache_key}")
                result = _generate_and_cache_question(db, user_id, topic, difficulty)
                if result:
                    print(f"[CacheService] 成功补充缓存键: {cache_key}")
                else:
                    print(f"[CacheService] 补充缓存键失败: {cache_key}")
            else:
                print(f"[CacheService] 缓存键 {cache_key} 已存在，跳过补充")
                
        except Exception as e:
            print(f"[CacheService] 缓存补充过程中出错，缓存键 {cache_key}: {e}")
            if db:
                try:
                    db.rollback()
                except Exception as rollback_error:
                    print(f"[CacheService] 回滚事务时出错: {rollback_error}")
        finally:
            if db:
                try:
                    db.close()
                    print(f"[CacheService] 数据库连接已关闭")
                except Exception as close_error:
                    print(f"[CacheService] 关闭数据库连接时出错: {close_error}")
    
    if async_mode:
        # 在后台线程中异步执行
        import threading
        thread = threading.Thread(target=replenish_task, daemon=True)
        thread.start()
    else:
        # 同步执行
        replenish_task()

def _stop_cache_monitor():
    """Stop the global cache monitoring."""
    global CACHE_MONITOR_RUNNING, REDIS_PUBSUB
    
    CACHE_MONITOR_RUNNING = False
    if REDIS_PUBSUB:
        REDIS_PUBSUB.close()
    print("[CacheService] Cache monitor stopped")

def _initialize_cache_pool(db: Session, user_id: str):
    """Initialize the cache pool with questions for all combinations for a specific user."""
    # Removed check for user_id in USER_CACHE_INITIALIZED
    # if user_id in USER_CACHE_INITIALIZED:
    #     print(f"[CacheService] Cache pool already initialized or checked for user {user_id}.")
    #     return
    
    print(f"[CacheService] Initializing cache pool for user {user_id}...")
    
    try:
        for topic, difficulty in CACHE_COMBINATIONS:
            cache_key = f"{user_id}:{topic}_{difficulty}"
            if not r.exists(cache_key):
                print(f"[CacheService] Pre-generating cache for user {user_id}, key {cache_key}")
                replenish_cache(user_id, topic, difficulty)
        # Removed USER_CACHE_INITIALIZED.add(user_id)
        print(f"[CacheService] Cache pool initialization check for user {user_id} completed.")
    except Exception as e:
        print(f"[CacheService] Error initializing cache pool for user {user_id}: {e}")
    # Removed finally db.close() as db is passed in and should be managed by the caller

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
import uuid
import os
from pathlib import Path

# Pydantic model for the expected JSON structure of a question
class GeneratedQuestion(BaseModel):
    sentence_with_blank: str = Field(description="The sentence with a blank to be filled")
    options: List[str] = Field(description="List of four options for the blank-filling question")
    answer: str = Field(description="The correct option for the blank-filling question")
    explanation: str = Field(description="Explanation of why the answer for the blank-filling question is correct, in Chinese")
    original_English_sentence: str = Field(description="The original English sentence to be translated into Chinese")
    translation_options: List[str] = Field(description="List of three Chinese translation options for the sentence")
    correct_translation_option: str = Field(description="The correct Chinese translation option from the list")
    difficulty: str = Field(description="The difficulty level of the question (e.g., medium, hard, advanced)")
    knowledge_point: str = Field(description="The main knowledge point or grammar rule tested by this question (e.g., past tense, phrasal verbs)")

def _generate_and_cache_question(db: Session, user_id: Optional[str], topic: Optional[str], difficulty: Optional[str]) -> Optional[dict]:
    """Generates a single question and caches it with nested sentence data, returns cached dict."""
    question = generate_single_question(db, user_id, topic, difficulty)
    if question:
        user_prefix = user_id if user_id else "global"
        cache_key = f"{user_prefix}:{topic or 'general'}_{difficulty or 'medium'}" # Changed _ to : for user_id separation
        from .. import schemas
        try:
            question_read = schemas.QuestionRead.model_validate(question)
            cached_question = question_read.model_dump(mode='json')
            question_data = json.dumps(cached_question, ensure_ascii=False)
            r.setex(cache_key, CACHE_EXPIRATION_SECONDS, question_data)
            print(f"[CacheService] Cached question {question.id} with nested sentence data, key: {cache_key}")
            return cached_question
        except Exception as e:
            print(f"[CacheService] Error caching question {question.id}: {e}")
            return None



def get_new_questions(
    db: Session, 
    user_id: Optional[str], 
    topic: Optional[str] = None, 
    difficulty: Optional[str] = None
) -> Optional[dict]:
    """Fetches a new question from cache, with Redis notifications handling replenishment."""
    print(f"[PracticeService] get_new_questions called with user_id: {user_id}, topic: {topic}, difficulty: {difficulty}")

    if user_id: # Check if user_id is provided before attempting to initialize its cache pool
        # Initialize cache pool for this user if not already done.
        # The r.exists() check within _initialize_cache_pool and replenish_cache handles idempotency.
        print(f"[PracticeService] Checking/Initializing cache pool for user {user_id}.")
        _initialize_cache_pool(db, user_id)
    
    actual_topic = topic or 'general'
    actual_difficulty = difficulty or 'medium'
    # Simplified cache key format: topic_difficulty
    cache_key = f"{user_id}:{actual_topic}_{actual_difficulty}"
    
    # Try to get cached question with a few attempts for history conflicts
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            cached_question_data = r.getdel(cache_key)
            if cached_question_data:
                question_dict = json.loads(cached_question_data)
                return question_dict
        except (json.JSONDecodeError, Exception) as e:
            print(f"[CacheService] Error reading cached data for key {cache_key}: {e}, trying again (attempt {attempt + 1})")
        
        # Small delay between attempts
        import time
        time.sleep(0.1)
    
    # If no suitable cached question found, generate directly
    print(f"[CacheService] No suitable cached question found for key: {cache_key}, generating directly")
    # Ensure all elements are strings before joining
    question = generate_single_question(db, user_id, actual_topic, actual_difficulty)
    if question:
        try:
            # Use Pydantic serialization instead of _create_question_dict
            from .. import schemas
            question_read = schemas.QuestionRead.model_validate(question)
            # Use model_dump with mode='json' to properly serialize UUID objects
            question_dict = question_read.model_dump(mode='json')
            print(f"[CacheService] Generated question {question.id} without caching (cache miss scenario)")
            return question_dict
        except Exception as e:
            print(f"[CacheService] Error creating question dict {question.id}: {e}")
    return None




def get_question_by_id(db: Session, question_id: str) -> Optional[models.Question]:
    """Fetches a question by its ID from the database."""
    try:
        question_int_id = int(question_id)
        return db.query(models.Question).filter(models.Question.id == question_int_id).first()
    except ValueError:
        print(f"[PracticeService] Invalid integer format: {question_id}")
        return None


def generate_single_question(db: Session, user_id: Optional[str], topic: Optional[str] = None, difficulty: Optional[str] = None) -> Optional[models.Question]:
    # ... existing code ...
    """Generates a new question for a user using Langchain ChatModel."""
    print(f"[PracticeService] generate_single_question called with user_id: {user_id}, topic: {topic}, difficulty: {difficulty}")
    print(f"[PracticeService] get_new_questions called with user_id: {user_id} (generates 1 question)")

    # Get OpenAI configurations from environment variables
    api_key = os.getenv("OPENAI_API_KEY")
    model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-3.5-turbo")
    api_base = os.getenv("OPENAI_API_BASE")

    if not api_key:
        print("[PracticeService] ERROR: OPENAI_API_KEY environment variable not set.")
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    
    print(f"[PracticeService] OpenAI API Key: {'*' * (len(api_key) - 4) + api_key[-4:] if api_key else 'Not Set'}")
    print(f"[PracticeService] OpenAI Model Name: {model_name}")
    print(f"[PracticeService] OpenAI API Base: {api_base if api_base else 'Default'}")

    llm_params = {
        "model": model_name,
        "temperature": 0.8,
        "api_key": api_key
    }
    if api_base:
        llm_params["base_url"] = api_base

    llm = ChatOpenAI(**llm_params)
    parser = JsonOutputParser(pydantic_object=GeneratedQuestion)

    schema_str = GeneratedQuestion.model_json_schema()
    escaped_schema_str = str(schema_str).replace('{', '{{').replace('}', '}}')

    difficulty_description = "intermediate to advanced difficulty (B1-C1 CEFR level)"
    sentence_length_guidance = ""
    
    if difficulty:
        difficulty_lower = difficulty.lower()
        if difficulty_lower == 'medium':
            difficulty_description = "medium difficulty (A2-B1 CEFR level)"
            sentence_length_guidance = " Sentences should not exceed 20 words."
        elif difficulty_lower == 'hard':
            difficulty_description = "hard difficulty (B2 CEFR level)"
            sentence_length_guidance = " Sentences can be more complex and longer, suitable for B2 level."
        elif difficulty_lower == 'advanced':
            difficulty_description = "advanced difficulty (C1 CEFR level)"
            sentence_length_guidance = " Sentences should be complex and demonstrate a wide range of vocabulary and structure, suitable for C1 level."

    system_prompt_base = (
        f"You are an assistant that generates English learning questions of {difficulty_description}. Provide exactly 1 question. "
        f"The generated English sentences should be reasonably complex, utilizing varied sentence structures (e.g., compound sentences, complex sentences with subordinate clauses) and a good range of vocabulary suitable for the specified CEFR level.{sentence_length_guidance} "
        f"For the blank-filling part (sentence_with_blank), ensure the blank can appear in various grammatical positions within the sentence, such as for a predicate, object, attribute, conjunction, etc., to test different grammatical understanding. "
        f"Avoid overly simplistic sentences unless 'easy' (A1-A2) difficulty is specified. The question should be challenging yet educational. "
        f"For this question, include: a sentence with a blank (sentence_with_blank), "
        f"four options for the blank (options), the correct option for the blank (answer), "
        f"an explanation in Chinese of why the blank-filling answer is correct (explanation), "
        f"the original English sentence to be translated (original_English_sentence, which should be the same as sentence_with_blank with the blank filled by the answer), "
        f"three Chinese translation options for this sentence (translation_options) - these options should exhibit clear differences in logic and sentence structure, not just minor word changes, "
        f"the correct Chinese translation option (correct_translation_option), "
        f"the difficulty level (difficulty, e.g., medium, hard, advanced), "
        f"and the main knowledge point tested (knowledge_point, e.g., advanced grammar, idiomatic expressions, nuanced vocabulary). "
        f"Ensure the output is a single JSON object matching the following schema, do NOT nest it under any other keys: {escaped_schema_str}"
    )

    human_prompt_content = "Generate a challenging English learning question suitable for an intermediate to advanced learner."
    history_prompt_addition = ""
    topic_prompt_addition = ""

    if topic and topic.lower() != 'general':
        topic_prompt_addition = f" The question should be related to the topic: '{topic}'."
        # 查询用户最近回答的10个问题
    # Convert user_id string to UUID if it's not None
    user_uuid = None
    if user_id:
        try:
            import uuid
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        except ValueError:
            print(f"[PracticeService] Invalid UUID format for user_id: {user_id}")
            user_uuid = None
    
    historical_questions = db.query(models.Question)\
        .join(models.UserAnswer)\
        .filter(models.UserAnswer.user_id == user_uuid)\
        .order_by(models.UserAnswer.answered_at.desc())\
        .limit(10)\
        .all()
    print(f"[PracticeService] Retrieved {len(historical_questions)} historical questions for user {user_id}")
    historical_sentences_texts = []
    for q in historical_questions:
        if q.translation_text:
            historical_sentences_texts.append(q.translation_text)
        elif q.question_text and q.correct_answer:
            # Ensure question_text is a string before calling replace
            question_text_str = str(q.question_text)
            historical_sentences_texts.append(f"{question_text_str.replace('____', q.correct_answer)}")

    if historical_sentences_texts:
        sentences_to_avoid_str = "\n".join([f'- {s}' for s in historical_sentences_texts])
        history_prompt_addition = f"\n\nBased on the following historical questions, avoid generating questions that are similar or identical to them:\n{sentences_to_avoid_str}"
        print(f"[PracticeService] Generated history_prompt_addition: {history_prompt_addition}")    
    system_prompt_final = system_prompt_base + topic_prompt_addition + history_prompt_addition

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt_final),
        ("human", human_prompt_content)
    ])

    chain = prompt | llm | parser

    print(f"[PracticeService] Invoking Langchain chain to generate 1 question.")
    raw_generated_data: Optional[GeneratedQuestion] = None
    try:
        raw_generated_data = chain.invoke({})
        print(f"[PracticeService] Raw generated data from LLM: {raw_generated_data}")
        if not isinstance(raw_generated_data, GeneratedQuestion):
            if isinstance(raw_generated_data, dict):
                try:
                    raw_generated_data = GeneratedQuestion(**raw_generated_data)
                    print(f"[PracticeService] Successfully parsed dict into GeneratedQuestion")
                except Exception as parse_exc:
                    print(f"[PracticeService] Error parsing dict into GeneratedQuestion: {parse_exc}. Data: {raw_generated_data}")
                    return None
            else:
                print(f"[PracticeService] LLM did not return a GeneratedQuestion or a parsable dict. Type: {type(raw_generated_data)}")
                return None

    except Exception as e:
        print(f"[PracticeService] Error generating or parsing question from LLM: {e}")
        return None

    if not raw_generated_data:
        print(f"[PracticeService] No valid question data received from LLM.")
        return None

    q_data = raw_generated_data

    print(f"[PracticeService] Processing generated question data")
    
    full_sentence_text = q_data.original_English_sentence
    if not full_sentence_text:
        print(f"[PracticeService] ERROR: original_English_sentence is empty in LLM response. Cannot proceed.")
        return None

    # 1. Create or find the sentence
    sentence = db.query(models.Sentence).filter(models.Sentence.text == full_sentence_text).first()
    if not sentence:
        print(f"[PracticeService] Sentence not found, creating new: {full_sentence_text}")
        sentence = models.Sentence(
            text=full_sentence_text,
            translation=q_data.correct_translation_option,
            difficulty=q_data.difficulty
        )
        db.add(sentence)
        db.flush()
        print(f"[PracticeService] New sentence created with ID: {sentence.id}")
    else:
        print(f"[PracticeService] Found existing sentence with ID: {sentence.id}")

    # 2. Create the question
    question_type = models.QuestionType.WORD_CHOICE

    new_question_db = models.Question(
        sentence_id=sentence.id,
        type=question_type,
        
        # Fields for word choice / fill-in-the-blank
        question_text=q_data.sentence_with_blank, 
        options=q_data.options, 
        correct_answer=q_data.answer, 
        explanation=q_data.explanation, 
        
        # Fields for translation aspects
        translation_text=q_data.original_English_sentence, 
        translation_options=q_data.translation_options, 
        correct_translation=q_data.correct_translation_option, 
        
        # Common metadata fields
        difficulty=q_data.difficulty,
        knowledge_point=q_data.knowledge_point,
        order=1
    )
    print(f"[PracticeService] Creating new question object: {new_question_db.id} for sentence_id: {sentence.id}")
    db.add(new_question_db)
    
    try:
        db.commit()
        db.refresh(new_question_db)
        _ = new_question_db.sentence
        print(f"[PracticeService] Committed 1 new question to DB. ID: {new_question_db.id}")
        return new_question_db
    except Exception as commit_exc:
        db.rollback()
        print(f"[PracticeService] Error committing question to DB: {commit_exc}")
        return None

def submit_answers(db: Session, user_id: str, answers: List[schemas.UserAnswerCreate]) -> List[models.UserAnswer]:
    """Submits a list of user answers, evaluates them, and stores them in the database."""
    created_user_answers = []
    for answer_data in answers:
        question = db.query(models.Question).filter(models.Question.id == answer_data.question_id).first()
        if not question:
            continue

        is_correct = False
        selected_word_answer = None
        selected_translation_answer = None
        
        if question.type == models.QuestionType.WORD_CHOICE:
            selected_word_answer = answer_data.selected_word_answer
            is_correct = (selected_word_answer == question.correct_answer)
        elif question.type == models.QuestionType.TRANSLATION:
            selected_translation_answer = answer_data.selected_translation_answer
            if question.correct_translation is not None:
                is_correct = (selected_translation_answer == question.correct_translation)
            else:
                is_correct = False
        else:
            is_correct = False

        db_user_answer_data = {
            "user_id": user_id,
            "question_id": answer_data.question_id,
            "selected_word_answer": selected_word_answer,
            "selected_translation_answer": selected_translation_answer,
            "is_correct": is_correct,
            "answered_at": answer_data.answered_at if answer_data.answered_at else datetime.utcnow()
        }
        
        db_user_answer = models.UserAnswer(**db_user_answer_data)
        
        db.add(db_user_answer)
        created_user_answers.append(db_user_answer)

    try:
        db.commit()
        for ua in created_user_answers:
            db.refresh(ua)
    except Exception as e:
        db.rollback()
        return []
        
    return created_user_answers


def _cache_event_handler(message):
    """Handle cache events from Redis keyspace notifications."""
    if message and message['type'] == 'message':
        channel = message['channel'] # e.g. __keyspace@0__:general_medium
        key_event_info = channel.split(':', 1)
        if len(key_event_info) > 1:
            key = key_event_info[1]
            operation = message['data'] # e.g. del, expired, set
            
            print(f"[CacheListener] Event: Key '{key}' operation '{operation}'")

            if operation in ['del', 'expired']:
                # Attempt to parse user_id, topic and difficulty from the key
                # Assumes keys are in 'user_id:topic_difficulty' or 'global:topic_difficulty' format
                if ':' in key:
                    user_prefix, rest_of_key = key.split(':', 1)
                    parts = rest_of_key.split('_')
                    if len(parts) == 2: # topic_difficulty
                        topic, difficulty = parts[0], parts[1]
                        print(f"[CacheListener] Key '{key}' (user_prefix: {user_prefix}, topic: {topic}, difficulty: {difficulty}) was deleted or expired. Triggering replenishment.")
                        user_id_for_replenish = None if user_prefix == 'global' else user_prefix
                        replenish_cache(user_id_for_replenish, topic, difficulty)
                    else:
                        print(f"[CacheListener] Key '{key}' (after splitting by ':') does not match expected format 'topic_difficulty', not replenishing.")
                else:
                    print(f"[CacheListener] Key '{key}' does not contain ':' separator, not replenishing.")

def _stop_cache_monitor():
    """Stop the global cache monitoring."""
    global CACHE_MONITOR_RUNNING, REDIS_PUBSUB
    
    CACHE_MONITOR_RUNNING = False
    if REDIS_PUBSUB:
        REDIS_PUBSUB.close()
    print("[CacheService] Cache monitor stopped")