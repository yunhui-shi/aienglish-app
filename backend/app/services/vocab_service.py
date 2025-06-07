# backend/app/services/vocab_service.py
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas

def add_vocab_entry(db: Session, user_id: str, vocab_data: schemas.UserVocabCreate) -> models.UserVocab:
    """
    Add a new vocabulary entry for a user
    """
    # Check if the word already exists for this user
    existing_entry = db.query(models.UserVocab).filter(
        models.UserVocab.user_id == user_id,
        models.UserVocab.word == vocab_data.word
    ).first()
    
    if existing_entry:
        raise ValueError(f"Word '{vocab_data.word}' already exists in vocabulary")
    
    # Create new vocabulary entry
    db_vocab = models.UserVocab(
        user_id=user_id,
        word=vocab_data.word,
        phonetic=vocab_data.phonetic,
        definition=vocab_data.definition,
        sentence_id=vocab_data.sentence_id,
        status=vocab_data.status or schemas.VocabStatus.NEW
    )
    
    db.add(db_vocab)
    db.commit()
    db.refresh(db_vocab)
    
    return db_vocab

def get_user_vocab_entries(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[models.UserVocab]:
    return db.query(models.UserVocab).filter(models.UserVocab.user_id == user_id).offset(skip).limit(limit).all()

def get_vocab_entry_by_id(db: Session, vocab_id: str, user_id: str) -> Optional[models.UserVocab]:
    return db.query(models.UserVocab).filter(models.UserVocab.id == vocab_id, models.UserVocab.user_id == user_id).first()

def get_vocab_entry_by_word(db: Session, user_id: str, word: str) -> Optional[models.UserVocab]:
    return db.query(models.UserVocab).filter(
        models.UserVocab.user_id == user_id,
        models.UserVocab.word == word
    ).first()

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

def get_word_explanation(db: Session, word: str, sentence:str) -> schemas.WordExplanation:
    """
    Get explanation for a specific word using LLM with JSON mode structured outputs.
    Calls OpenAI/OpenRouter to generate word explanations in the specified format.
    """
    import os
    import json
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from typing import List, Dict, Any
    
    try:
        # Get OpenAI configurations from environment variables
        api_key = os.getenv("OPENAI_API_KEY_WORD")
        api_base = os.getenv("OPENAI_API_BASE")
        
        if not api_key:
            print("[VocabService] ERROR: OPENAI_API_KEY environment variable not set.")
            raise ValueError("OPENAI_API_KEY environment variable not set.")
        
        # Define JSON schema for structured outputs
        json_schema = {
            "type": "object",
            "properties": {
                "word": {
                    "type": "string",
                    "description": "The English word being explained"
                },
                "phonetic": {
                    "type": "string",
                    "description": "Phonetic transcription of the word (e.g., /wɜːrld/)"
                },
                "definitions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "part_of_speech": {
                                "type": "string",
                                "description": "Part of speech (e.g., n., v., adj., adv., prep., conj., int.)"
                            },
                            "meanings": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                },
                                "description": "List of Chinese meanings for this part of speech"
                            }
                        },
                        "required": ["part_of_speech", "meanings"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["word", "phonetic", "definitions"],
            "additionalProperties": False
        }
        
        # Setup LLM with JSON mode
        llm_params = {
            "model": "openai/gpt-4o-mini",
            "temperature": 0.3,
            "api_key": api_key,
            "model_kwargs": {
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "word_explanation",
                        "strict": True,
                        "schema": json_schema
                    }
                }
            }
        }
        if api_base:
            llm_params["base_url"] = api_base
        
        llm = ChatOpenAI(**llm_params)
        
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个专业的英语词典助手。请为给定的英语单词提供详细的中文释义。你必须返回有效的JSON格式。"),
            ("user", """
请为我提供句子 "{sentence}" 中"{word}"的详细信息。

**重要说明：**
* 请根据句子上下文来消除单词的时态、语态、单复数。
* 在 `word` 字段中始终返回这个**原形**。
* 音标、词性与释义应**基于这个原形**给出。请**完整列出该原形作为所有可能词性时的所有含义**，不限于在给定句子中的特定含义。

请以 **JSON 格式**输出，具体格式如下：

```json
{{
  "word": "[单词的原形]",
  "phonetic": "[音标]",
  "definitions": [
    {{
      "part_of_speech": "[词性1]",
      "meanings": [
        "[释义1-1]",
        "[释义1-2]"
      ]
    }},
    {{
      "part_of_speech": "[词性2]",
      "meanings": [
        "[释义2-1]"
      ]
    }}
    // ... 如果存在多个词性和多个释义，请按此格式继续
  ]
}}
```

**示例输入和期望输出：**

* **输入：**
    * 单词: "running"
    * 句子: "She is **running** a marathon."
* **期望输出：**
    ```json
    {{
      "word": "run",
      "phonetic": "/rʌn/",
      "definitions": [
        {{
          "part_of_speech": "v.",
          "meanings": [
            "跑，奔跑",
            "操作，运行 (如：运行程序)",
            "管理，经营 (如：管理公司)"
          ]
        }},
        {{
          "part_of_speech": "n.",
          "meanings": [
            "跑步，赛跑",
            "一次运行或旅程",
            "连续的一段时间"
          ]
        }}
      ]
    }}
    ```
    *解释：尽管句子中的 `running` 是动词的现在进行时，但 `word` 字段返回了它的原形 `run`。释义中列出了 `run` 作为动词和名词的所有常见含义，而不是仅限于“跑步”的含义。*
""")
        ])
        
        # Create chain
        chain = prompt | llm
        
        # Generate explanation
        print(f"[VocabService] Generating explanation for word: {word}")
        result = chain.invoke({
            "word": word,
            "sentence": sentence
        })
        
        print(f"[VocabService] LLM result: {result}")
        
        # Parse JSON response
        if hasattr(result, 'content'):
            result_data = json.loads(result.content)
        else:
            result_data = result
        
        # Convert to our schema format
        definitions_data = []
        for definition in result_data.get("definitions", []):
            definitions_data.append({
                "part_of_speech": definition.get("part_of_speech", "unknown"),
                "meanings": definition.get("meanings", [])
            })
        
        return schemas.WordExplanation(
            word=result_data.get("word", word),
            phonetic=result_data.get("phonetic"),
            definitions=definitions_data
        )
        
    except Exception as e:
        print(f"[VocabService] Error generating word explanation: {e}")
        # Fallback to a simple response
        return schemas.WordExplanation(
            word=word,
            phonetic=None,
            definitions=[
                {
                    "part_of_speech": "unknown",
                    "meanings": [f"暂无 '{word}' 的详细释义，请稍后重试"]
                }
            ]
        )


def get_word_explanation_fallback(db: Session, word: str) -> schemas.WordExplanation:
    """
    Fallback function with hardcoded explanations for testing.
    """
    # Convert word to lowercase for case-insensitive matching
    word_lower = word.lower()
    
    # Dictionary of common words with their explanations
    word_dict = {
        "hello": {
            "word": "hello",
            "phonetic": "/həˈloʊ/",
            "definitions": [
                {
                    "part_of_speech": "int.",
                    "meanings": ["你好，喂（用作问候语）"]
                }
            ]
        },
        "world": {
            "word": "world",
            "phonetic": "/wɜːrld/",
            "definitions": [
                {
                    "part_of_speech": "n.",
                    "meanings": ["世界，地球", "领域，范围"]
                }
            ]
        },
        "computer": {
            "word": "computer",
            "phonetic": "/kəmˈpjuːtər/",
            "definitions": [
                {
                    "part_of_speech": "n.",
                    "meanings": ["计算机，电脑"]
                }
            ]
        },
        "language": {
            "word": "language",
            "phonetic": "/ˈlæŋɡwɪdʒ/",
            "definitions": [
                {
                    "part_of_speech": "n.",
                    "meanings": ["语言", "表达方式"]
                }
            ]
        },
        "programming": {
            "word": "programming",
            "phonetic": "/ˈproʊɡræmɪŋ/",
            "definitions": [
                {
                    "part_of_speech": "n.",
                    "meanings": ["编程，程序设计"]
                }
            ]
        },
        "run": {
            "word": "run",
            "phonetic": "/rʌn/",
            "definitions": [
                {
                    "part_of_speech": "v.",
                    "meanings": ["跑，奔跑", "操作，运行", "管理"]
                },
                {
                    "part_of_speech": "n.",
                    "meanings": ["跑步，赛跑", "一段连续的时间或时期"]
                }
            ]
        }
    }
    
    # Return the explanation if the word is in our dictionary
    if word_lower in word_dict:
        return schemas.WordExplanation(**word_dict[word_lower])
    
    # For words not in our dictionary, return a generic explanation
    return schemas.WordExplanation(
        word=word,
        phonetic=None,
        definitions=[
            {
                "part_of_speech": "unknown",
                "meanings": [f"暂无 '{word}' 的详细释义"]
            }
        ]
    )