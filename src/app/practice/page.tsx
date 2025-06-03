'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getPracticeQuestion, submitUserAnswer, initializeCachePool, ApiPracticeQuestion, UserAnswerPayload } from '@/lib/api';

// 可点击单词组件
interface ClickableWordsProps {
  sentence: string;
  highlightedWord?: string;
  vocabulary: Array<{
    word: string;
    definition: string;
    pronunciation?: string;
  }>;
}

const ClickableWords: React.FC<ClickableWordsProps> = ({ sentence, highlightedWord, vocabulary }) => {
  const [tooltipWord, setTooltipWord] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // 关闭提示框
  const closeTooltip = () => {
    setTooltipWord(null);
  };

  // 处理单词点击
  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 清除标点符号
    const cleanWord = word.replace(/[.,!?;:"'()\[\]{}]/g, '');
    
    // 设置提示位置
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY
    });
    
    // 设置提示词或关闭
    if (tooltipWord === cleanWord) {
      setTooltipWord(null);
    } else {
      setTooltipWord(cleanWord);
    }
  };

  // 获取单词的定义
  const getWordDefinition = (word: string) => {
    // 清除标点符号进行匹配
    const cleanWord = word.replace(/[.,!?;:"'()\[\]{}]/g, '');
    const vocabItem = vocabulary?.find(item => 
      item.word.toLowerCase() === cleanWord.toLowerCase()
    );
    return vocabItem?.definition || '暂无解释';
  };

  // 点击文档其他地方关闭提示
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        closeTooltip();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 将句子拆分为单词和下划线
  const parts = sentence.split(/(\s+|__{4,})/g).filter(part => part !== '');

  return (
    <div className="relative inline">
      {parts.map((part, index) => {
        // 检查是否是下划线
        if (/^_$/.test(part)) {
          return <span key={index} className="text-gray-500">{part}</span>;
        }
        // 检查是否是空白
        if (/^\s+$/.test(part)) {
          return <span key={index}>{part}</span>;
        }
        
        // 检查是否是高亮单词
        const isHighlighted = highlightedWord && part.includes(highlightedWord);
        
        return (
          <span 
            key={index}
            onClick={(e) => handleWordClick(e, part)}
            className={`cursor-pointer hover:bg-blue-100 hover:text-blue-700 rounded px-0.5 transition-colors ${isHighlighted ? 'text-indigo-600 bg-indigo-100 font-medium' : ''}`}
          >
            {part}
          </span>
        );
      })}
      
      {/* 单词解释提示框 */}
      {tooltipWord && (
        <div 
          ref={tooltipRef}
          className="absolute z-50 bg-white shadow-lg rounded-lg p-3 border border-gray-200 max-w-xs"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y + 10}px`
          }}
        >
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-indigo-700">{tooltipWord}</h3>
            <button 
              onClick={closeTooltip}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-700">{getWordDefinition(tooltipWord)}</p>
        </div>
      )}
    </div>
  );
};

// const DIFFICULTY_LEVELS = ['advanced', 'medium', 'hard'] as const;
type DifficultyLevel = 'advanced' | 'medium' | 'hard';


const DEFAULT_DIFFICULTY: DifficultyLevel = 'medium';

const TOPICS = [
  { value: 'general', label: '综合' },
  { value: 'technology', label: '科技' },
  { value: 'culture', label: '文化' },
  { value: 'history', label: '历史' },
  { value: 'life', label: '生活' },
];

interface Question {
  id: string;
  sentence: string;
  word_choice: {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  };
  sentence_translation: {
    options: string[];
    correct_answer: string;
    explanation: string;
  };
  grammar_points: string[];
  vocabulary: Array<{
    word: string;
    definition: string;
    pronunciation?: string;
  }>;
}

// 将API响应转换为本地Question格式的函数
const convertApiQuestionToLocal = (apiQuestion: ApiPracticeQuestion): Question => {
  return {
    id: apiQuestion.id,
    sentence: apiQuestion.question_text || '',
    word_choice: {
      question: '请选择句子中划线词语的最佳替换词：',
      options: apiQuestion.options || [],
      correct_answer: apiQuestion.correct_answer || '',
      explanation: apiQuestion.explanation || ''
    },
    sentence_translation: {
      options: apiQuestion.translation_options || [],
      correct_answer: apiQuestion.correct_translation || '',
      explanation: apiQuestion.explanation || ''
    },
    grammar_points: apiQuestion.knowledge_point ? [apiQuestion.knowledge_point] : [],
    vocabulary: [] // 如果API不提供词汇信息，暂时为空
  };
};

const PracticePage = () => {
  const [currentTopic, setCurrentTopic] = useState('general');
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [wordChoiceAnswer, setWordChoiceAnswer] = useState('');
  const [translationAnswer, setTranslationAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [wordChoiceSubmitted, setWordChoiceSubmitted] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // 0: 词语选择, 1: 翻译选择, 2: 解析
  const [loading, setLoading] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false); // 主题/难度切换加载状态
  const [error, setError] = useState('');



  const initializeCache = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await initializeCachePool(token);
      console.log('Cache initialized');
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      setError('初始化缓存失败');
    }
  };

  const fetchNewQuestion = useCallback(async () => {
    setSwitchLoading(false);
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }

      const apiQuestion = await getPracticeQuestion(currentTopic, currentDifficulty, token);
      const question = convertApiQuestionToLocal(apiQuestion);
      
      setCurrentQuestion(question);
      setWordChoiceAnswer('');
      setTranslationAnswer('');
      setIsSubmitted(false);
      setWordChoiceSubmitted(false);
    setCurrentCardIndex(0);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch question:', error);
      setError('获取题目失败，请重试');
      setLoading(false);
    }
  }, [currentTopic, currentDifficulty]);

  useEffect(() => {
    // 初始化缓存
    initializeCache();
  }, []);

  useEffect(() => {
    // 当主题或难度改变时获取新题目
    fetchNewQuestion();
  }, [currentTopic, currentDifficulty,fetchNewQuestion]);

  const handleWordChoiceSelect = async (answer: string) => {
    setWordChoiceAnswer(answer);
    setWordChoiceSubmitted(true);
    // 1秒后显示翻译部分并自动切换到第二张卡片
    setTimeout(() => {
      setCurrentCardIndex(1);
    }, 1000);
  };

  const handleTranslationSelect = async (answer: string) => {
    setTranslationAnswer(answer);
    // 自动提交答案
    await submitAnswers(wordChoiceAnswer, answer);
    // 提交后自动切换到解析卡片
    setTimeout(() => {
      setCurrentCardIndex(2);
    }, 500);
  };

  const submitAnswers = async (wordAnswer: string, transAnswer: string) => {
    if (!currentQuestion) return;

    const submissions: UserAnswerPayload[] = [
      {
        question_id: currentQuestion.id,
        selected_word_answer: wordAnswer,
        selected_translation_answer: transAnswer
      }
    ];

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('请先登录');
        return;
      }

      await submitUserAnswer(submissions, token);

      setIsSubmitted(true);
      setError('');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError('提交答案失败，请重试');
    }
  };

  const handleNextQuestion = () => {
    fetchNewQuestion();
  };

  const handleCardNavigation = (index: number) => {
    // 检查索引范围
    if (index < 0 || index > 2) return;
    
    // 只允许导航到已解锁的卡片
    if (index === 0) {
      setCurrentCardIndex(0);
    } else if (index === 1 && wordChoiceSubmitted) {
      setCurrentCardIndex(1);
    } else if (index === 2 && isSubmitted) {
      setCurrentCardIndex(2);
    }
  };

  const getCardTitle = (index: number) => {
    switch (index) {
      case 0: return '第一部分：词语选择';
      case 1: return '第二部分：翻译选择';
      case 2: return '详细解析';
      default: return '';
    }
  };

  if (loading || switchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl rounded-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{switchLoading ? '正在切换...' : '正在加载题目...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面顶部 - 主题和难度选择 */}
        <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-indigo-700">
              英语长句理解训练
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="topic-select" className="text-sm font-medium text-gray-700">
                  主题：
                </Label>
                <Select value={currentTopic} onValueChange={(value) => {
                  setSwitchLoading(true);
                  setTimeout(() => {
                    setCurrentTopic(value);
                  }, 1000);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="difficulty-select" className="text-sm font-medium text-gray-700">
                  难度：
                </Label>
                <Select value={currentDifficulty} onValueChange={(value) => {
                  setSwitchLoading(true);
                  setTimeout(() => {
                    setCurrentDifficulty(value as DifficultyLevel);
                  }, 2000);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                    <SelectItem value="advanced">大师</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {currentQuestion && (
          <>
            {/* 题目区域 */}
            <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  练习句子
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                  <div className="text-lg leading-relaxed text-gray-800">
                    {wordChoiceSubmitted ? (
                      <ClickableWords 
                        sentence={currentQuestion.sentence.replace(
                          /__{4,}/g, // 匹配四个或更多下划线
                          currentQuestion.word_choice.correct_answer
                        )}
                        highlightedWord={currentQuestion.word_choice.correct_answer}
                        vocabulary={currentQuestion.vocabulary}
                      />
                    ) : (
                      <ClickableWords 
                        sentence={currentQuestion.sentence}
                        vocabulary={currentQuestion.vocabulary}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 卡片轮播容器 */}
            <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    {getCardTitle(currentCardIndex)}
                  </CardTitle>
                  {/* 卡片导航指示器 */}
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((index) => {
                      const isActive = index === currentCardIndex;
                      const isUnlocked = index === 0 || (index === 1 && wordChoiceSubmitted) || (index === 2 && isSubmitted);
                      return (
                        <button
                          key={index}
                          onClick={() => handleCardNavigation(index)}
                          disabled={!isUnlocked}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isActive
                              ? 'bg-indigo-600 scale-125'
                              : isUnlocked
                              ? 'bg-indigo-300 hover:bg-indigo-400 cursor-pointer'
                              : 'bg-gray-300 cursor-not-allowed'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* 卡片内容区域 */}
                <div className="transition-all duration-500 ease-in-out">
                  {currentCardIndex === 0 && (
                    <div>
                      <p className="mb-4 text-gray-700">{currentQuestion.word_choice.question}</p>
                      <div className="space-y-3">
                        {currentQuestion.word_choice.options.map((option, index) => {
                          const isCorrect = option === currentQuestion.word_choice.correct_answer;
                          const isSelected = option === wordChoiceAnswer;
                          const isWrong = wordChoiceSubmitted && isSelected && !isCorrect;
                          const showCorrect = wordChoiceSubmitted && isCorrect;
                          
                          return (
                            <button
                              key={index}
                              onClick={() => !wordChoiceSubmitted && handleWordChoiceSelect(option)}
                              disabled={wordChoiceSubmitted}
                              className={`w-full p-3 text-left rounded-lg border-2 transition-all duration-300 ${
                                showCorrect
                                  ? 'bg-green-100 border-green-500 text-green-800 font-medium'
                                  : isWrong
                                  ? 'bg-red-100 border-red-500 text-red-800'
                                  : isSelected
                                  ? 'bg-blue-100 border-blue-500 text-blue-800'
                                  : wordChoiceSubmitted
                                  ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                {wordChoiceSubmitted && (
                                  <span className="text-lg">
                                    {showCorrect ? '✓' : isWrong ? '✗' : ''}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentCardIndex === 1 && (
                    <div>
                      <p className="mb-4 text-gray-700">请选择最符合句子意思的翻译：</p>
                      <div className="space-y-3">
                        {currentQuestion.sentence_translation.options.map((option, index) => {
                          const isCorrect = option === currentQuestion.sentence_translation.correct_answer;
                          const isSelected = option === translationAnswer;
                          const isWrong = isSubmitted && isSelected && !isCorrect;
                          const showCorrect = isSubmitted && isCorrect;
                          
                          return (
                            <button
                              key={index}
                              onClick={() => !isSubmitted && handleTranslationSelect(option)}
                              disabled={isSubmitted}
                              className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 leading-relaxed ${
                                showCorrect
                                  ? 'bg-green-100 border-green-500 text-green-800 font-medium'
                                  : isWrong
                                  ? 'bg-red-100 border-red-500 text-red-800'
                                  : isSelected
                                  ? 'bg-blue-100 border-blue-500 text-blue-800'
                                  : isSubmitted
                                  ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <span className="flex-1">{option}</span>
                                {isSubmitted && (
                                  <span className="text-lg ml-2 flex-shrink-0">
                                    {showCorrect ? '✓' : isWrong ? '✗' : ''}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentCardIndex === 2 && (
                    <div className="space-y-4">
                      {/* 题目解析 */}
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-blue-700">
                          {currentQuestion.sentence_translation.explanation}
                        </p>
                      </div>

                      {/* 语法点 */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">语法点：</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentQuestion.grammar_points.map((point, index) => (
                            <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 重点词汇 */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">重点词汇：</h4>
                        <div className="space-y-2">
                          {currentQuestion.vocabulary.map((vocab, index) => (
                            <div key={index} className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-yellow-800">{vocab.word}</span>
                                {vocab.pronunciation && (
                                  <span className="text-sm text-yellow-600">[{vocab.pronunciation}]</span>
                                )}
                              </div>
                              <p className="text-yellow-700 text-sm">{vocab.definition}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            {isSubmitted && (
              <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-6">
                  <div className="flex justify-center gap-4">
                    <Button 
                      onClick={handleNextQuestion} 
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={loading}
                    >
                      {loading ? '加载中...' : '下一题'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PracticePage;