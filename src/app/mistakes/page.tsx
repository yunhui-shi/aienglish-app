'use client';

import React, { useState, useEffect } from 'react';
import apiCall from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

interface MistakeRecord {
  id: string;
  question_id: string;
  sentence: string;
  question_type: 'WORD_CHOICE' | 'TRANSLATION';
  question_text: string;
  selected_word_answer?: string;
  selected_translation_answer?: string;
  correct_answer: string;
  correct_translation?: string;
  explanation: string;
  grammar_points: string[];
  answered_at: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  options?: string[];
  translation_options?: string[];
}

type ViewMode = 'review' | 'practice';
type NavigationMode = 'sequential' | 'random';

const TOPICS = [
  { value: 'all', label: '全部主题' },
  { value: 'general', label: '综合' },
  { value: 'technology', label: '科技' },
  { value: 'culture', label: '文化' },
  { value: 'history', label: '历史' },
  { value: 'life', label: '生活' },
  { value: 'grammar', label: '语法' },
];

const DIFFICULTIES = [
  { value: 'all', label: '全部难度' },
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

const MistakesPage = () => {
  const router = useRouter();
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [filteredMistakes, setFilteredMistakes] = useState<MistakeRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('sequential');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [wordChoiceAnswer, setWordChoiceAnswer] = useState<string>('');
  const [translationAnswer, setTranslationAnswer] = useState<string>('');
  const [wordChoiceSubmitted, setWordChoiceSubmitted] = useState(false);
  const [translationSubmitted, setTranslationSubmitted] = useState(false);

  // 模拟错题数据
  const mockMistakes: MistakeRecord[] = [
    {
      id: '1',
      question_id: 'Q001',
      sentence: 'Although the committee had been discussing the proposal for three hours, they still could not reach a consensus on the final decision.',
      question_type: 'WORD_CHOICE',
      question_text: '请选择句子中 "reach" 的最佳替换词：',
      selected_word_answer: 'arrive',
      correct_answer: 'achieve',
      explanation: '在这个语境中，"reach a consensus" 意思是"达成共识"，"achieve"是最合适的同义词，表示"实现、达到"的意思。',
      grammar_points: ['固定搭配', '动词辨析'],
      answered_at: '2024-01-15T14:30:00Z',
      difficulty: 'medium',
      topic: 'general',
      options: ['arrive', 'achieve', 'obtain', 'get']
    },
    {
      id: '2',
      question_id: 'Q002',
      sentence: 'If I were you, I would have accepted the offer immediately.',
      question_type: 'TRANSLATION',
      question_text: '请选择最符合句子意思的翻译：',
      selected_translation_answer: '如果我是你，我会立即接受这个提议。',
      correct_translation: '如果我是你的话，我早就立即接受这个提议了。',
      correct_answer: '如果我是你的话，我早就立即接受这个提议了。',
      explanation: '这是一个混合虚拟语气句，条件句用过去时表示与现在事实相反，主句用would have done表示对过去的虚拟。',
      grammar_points: ['虚拟语气', '混合时态'],
      answered_at: '2024-01-14T16:20:00Z',
      difficulty: 'hard',
      topic: 'grammar',
      translation_options: [
        '如果我是你，我会立即接受这个提议。',
        '如果我是你的话，我早就立即接受这个提议了。',
        '假如我是你，我将会接受这个提议。',
        '要是我是你，我就接受这个提议。'
      ]
    },
    {
      id: '3',
      question_id: 'Q003',
      sentence: 'The book that was written by Shakespeare is considered a masterpiece.',
      question_type: 'WORD_CHOICE',
      question_text: '请选择句子中 "that" 的最佳替换词：',
      selected_word_answer: 'what',
      correct_answer: 'which',
      explanation: '在定语从句中，当先行词是物时，关系代词可以用that或which，但在正式文体中，which更常用。what不能用作关系代词。',
      grammar_points: ['定语从句', '关系代词'],
      answered_at: '2024-01-13T10:15:00Z',
      difficulty: 'medium',
      topic: 'grammar',
      options: ['what', 'which', 'who', 'where']
    },
    {
      id: '4',
      question_id: 'Q004',
      sentence: 'The company has been developing innovative technologies for over a decade.',
      question_type: 'TRANSLATION',
      question_text: '请选择最符合句子意思的翻译：',
      selected_translation_answer: '公司开发创新技术已经十年了。',
      correct_translation: '这家公司十多年来一直在开发创新技术。',
      correct_answer: '这家公司十多年来一直在开发创新技术。',
      explanation: '现在完成进行时强调动作从过去开始一直持续到现在，并可能继续下去。"一直在"更好地体现了这种持续性。',
      grammar_points: ['现在完成进行时', '时态理解'],
      answered_at: '2024-01-12T09:45:00Z',
      difficulty: 'easy',
      topic: 'technology',
      translation_options: [
        '公司开发创新技术已经十年了。',
        '这家公司十多年来一直在开发创新技术。',
        '公司在十年内开发了创新技术。',
        '这个公司开发创新技术超过十年。'
      ]
    }
  ];

  useEffect(() => {
    fetchMistakes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [mistakes, topicFilter, difficultyFilter, dateFilter]);

  const fetchMistakes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await apiCall<MistakeRecord[]>('/mistakes/', {
        method: 'GET',
        token: token,
      });
      
      // apiCall直接返回数据，不需要检查success属性
      setMistakes(response);
    } catch (error) {
      console.error('获取错题失败:', error);
      // 如果发生错误，使用模拟数据作为后备
      setMistakes(mockMistakes);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...mistakes];

    if (topicFilter !== 'all') {
      filtered = filtered.filter(mistake => mistake.topic === topicFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(mistake => mistake.difficulty === difficultyFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(mistake => 
          new Date(mistake.answered_at) >= filterDate
        );
      }
    }

    setFilteredMistakes(filtered);
    setCurrentIndex(0);
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (filteredMistakes.length === 0) return;

    if (navigationMode === 'sequential') {
      if (direction === 'next') {
        setCurrentIndex((prev) => (prev + 1) % filteredMistakes.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + filteredMistakes.length) % filteredMistakes.length);
      }
    } else {
      // 随机模式
      const randomIndex = Math.floor(Math.random() * filteredMistakes.length);
      setCurrentIndex(randomIndex);
    }
    
    // 重置所有状态
    setCurrentCardIndex(0);
    setWordChoiceAnswer('');
    setTranslationAnswer('');
    setWordChoiceSubmitted(false);
    setTranslationSubmitted(false);
  };

  // 新增处理函数
  const handleWordChoiceSelect = (option: string) => {
    setWordChoiceAnswer(option);
  };

  const handleTranslationSelect = (option: string) => {
    setTranslationAnswer(option);
  };

  const handleWordChoiceSubmit = () => {
    setWordChoiceSubmitted(true);
    setCurrentCardIndex(1);
  };

  const handleTranslationSubmit = () => {
    setTranslationSubmitted(true);
    setCurrentCardIndex(2);
  };

  const handleCardNavigation = (index: number) => {
    if (index === 0) {
      setCurrentCardIndex(0);
    } else if (index === 1 && wordChoiceSubmitted) {
      setCurrentCardIndex(1);
    } else if (index === 2 && translationSubmitted) {
      setCurrentCardIndex(2);
    }
  };

  const getCardTitle = (cardIndex: number) => {
    switch (cardIndex) {
      case 0: return '单词选择题';
      case 1: return '翻译选择题';
      case 2: return '题目解析';
      default: return '';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return difficulty;
    }
  };

  const getTopicLabel = (topic: string) => {
    const topicItem = TOPICS.find(t => t.value === topic);
    return topicItem ? topicItem.label : topic;
  };

  const currentMistake = filteredMistakes[currentIndex];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 页面标题和模式切换 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">错题复习</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'review' ? 'default' : 'outline'}
            onClick={() => setViewMode('review')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            复习模式
          </Button>
          <Button
            variant={viewMode === 'practice' ? 'default' : 'outline'}
            onClick={() => setViewMode('practice')}
            className="bg-green-600 hover:bg-green-700"
          >
            练习模式
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="topic-filter">主题筛选</Label>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择主题" />
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

            <div>
              <Label htmlFor="difficulty-filter">难度筛选</Label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择难度" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((difficulty) => (
                    <SelectItem key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-filter">日期筛选</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择日期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">最近一周</SelectItem>
                  <SelectItem value="month">最近一月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="navigation-mode">切换模式</Label>
              <Select value={navigationMode} onValueChange={(value: NavigationMode) => setNavigationMode(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">顺序显示</SelectItem>
                  <SelectItem value="random">随机显示</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 题目显示区域 */}
      {filteredMistakes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">没有找到匹配的错题记录</p>
            <Button 
              onClick={() => router.push('/practice')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              开始练习
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 进度指示器 */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              第 {currentIndex + 1} 题，共 {filteredMistakes.length} 题
            </span>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(currentMistake.difficulty)}`}>
                {getDifficultyLabel(currentMistake.difficulty)}
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-600">
                {getTopicLabel(currentMistake.topic)}
              </span>
            </div>
          </div>

          {/* 题目句子卡片 */}
          <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                练习句子
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                <p className="text-lg leading-relaxed text-gray-800">
                  {viewMode === 'practice' && currentCardIndex === 0 && wordChoiceSubmitted ? (
                    <span dangerouslySetInnerHTML={{
                      __html: currentMistake.sentence.replace(
                        /____+/g,
                        `<strong class="text-indigo-600 bg-indigo-100 px-1 rounded">${currentMistake.correct_answer}</strong>`
                      )
                    }} />
                  ) : (
                    currentMistake.sentence
                  )}
                </p>
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
                {viewMode === 'practice' && (
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      {[0, 1, 2].map((index) => {
                        const isActive = index === currentCardIndex;
                        const isUnlocked = index === 0 || (index === 1 && wordChoiceSubmitted) || (index === 2 && translationSubmitted);
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
                    
                    {/* 下一步按钮 */}
                    {currentCardIndex === 0 && wordChoiceSubmitted && (
                      <Button
                        onClick={() => handleCardNavigation(1)}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
                      >
                        下一步：翻译选择
                      </Button>
                    )}
                    
                    {currentCardIndex === 1 && translationSubmitted && (
                      <Button
                        onClick={() => handleCardNavigation(2)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
                      >
                        查看解析
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* 卡片内容区域 */}
              <div className="transition-all duration-500 ease-in-out">

                {/* 单词选择题卡片 */}
                {viewMode === 'practice' && currentCardIndex === 0 && (
                  <div>
                    <p className="mb-4 text-gray-700">{currentMistake.question_text}</p>
                    <div className="space-y-3">
                      {currentMistake.options?.map((option, index) => {
                        const isCorrect = option === currentMistake.correct_answer;
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
                    
                    {wordChoiceAnswer && !wordChoiceSubmitted && (
                      <Button 
                        onClick={handleWordChoiceSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 mt-4 w-full py-3 text-lg font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        提交答案
                      </Button>
                    )}
                  </div>
                )}

                {/* 翻译选择题卡片 */}
                {viewMode === 'practice' && currentCardIndex === 1 && (
                  <div>
                    <p className="mb-4 text-gray-700">请选择最符合句子意思的翻译：</p>
                    <div className="space-y-3">
                      {currentMistake.translation_options?.map((option, index) => {
                        const isCorrect = option === currentMistake.correct_translation;
                        const isSelected = option === translationAnswer;
                        const isWrong = translationSubmitted && isSelected && !isCorrect;
                        const showCorrect = translationSubmitted && isCorrect;
                        
                        return (
                          <button
                            key={index}
                            onClick={() => !translationSubmitted && handleTranslationSelect(option)}
                            disabled={translationSubmitted}
                            className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 leading-relaxed ${
                              showCorrect
                                ? 'bg-green-100 border-green-500 text-green-800 font-medium'
                                : isWrong
                                ? 'bg-red-100 border-red-500 text-red-800'
                                : isSelected
                                ? 'bg-blue-100 border-blue-500 text-blue-800'
                                : translationSubmitted
                                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="flex-1">{option}</span>
                              {translationSubmitted && (
                                <span className="text-lg ml-2 flex-shrink-0">
                                  {showCorrect ? '✓' : isWrong ? '✗' : ''}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {translationAnswer && !translationSubmitted && (
                      <Button 
                        onClick={handleTranslationSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 mt-4 w-full py-3 text-lg font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        提交答案
                      </Button>
                    )}
                  </div>
                )}

                {/* 题目解析卡片 */}
                {viewMode === 'practice' && currentCardIndex === 2 && (
                  <div className="space-y-4">
                    {/* 题目解析 */}
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-blue-700">{currentMistake.explanation}</p>
                    </div>

                    {/* 语法点 */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">语法点：</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentMistake.grammar_points.map((point, index) => (
                          <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 复习模式显示 */}
                {viewMode === 'review' && (
                  <div className="space-y-6">
                    {/* 题目 */}
                    <div>
                      <p className="text-gray-700 mb-4">{currentMistake.question_text}</p>
                    </div>

                    {/* 选项显示 */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">选项：</h4>
                      <div className="space-y-3">
                        {(currentMistake.question_type === 'WORD_CHOICE' ? currentMistake.options : currentMistake.translation_options)?.map((option, index) => {
                          const correctAnswer = currentMistake.question_type === 'WORD_CHOICE' 
                            ? currentMistake.correct_answer 
                            : currentMistake.correct_translation;
                          const isCorrect = option === correctAnswer;
                          const isSelected = currentMistake.question_type === 'WORD_CHOICE' 
                            ? option === currentMistake.selected_word_answer
                            : option === currentMistake.selected_translation_answer;
                          
                          return (
                            <button
                              key={index}
                              disabled
                              className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 leading-relaxed ${
                                isCorrect
                                  ? 'bg-green-100 border-green-500 text-green-800 font-medium'
                                  : isSelected
                                  ? 'bg-red-100 border-red-500 text-red-800'
                                  : 'bg-gray-100 border-gray-300 text-gray-500'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <span className="flex-1">{option}</span>
                                <span className="text-lg ml-2 flex-shrink-0">
                                  {isCorrect ? '✓' : isSelected ? '✗' : ''}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 详细解析 */}
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-blue-700">{currentMistake.explanation}</p>
                    </div>

                    {/* 语法点 */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">语法点：</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentMistake.grammar_points.map((point, index) => (
                          <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* 导航按钮 */}
          <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center gap-4">
                <Button
                  onClick={() => handleNavigation('prev')}
                  variant="outline"
                  disabled={filteredMistakes.length <= 1}
                  className="px-6 py-3 rounded-xl border-2 hover:bg-gray-50 transition-all duration-300"
                >
                  上一题
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/practice')}
                    className="px-6 py-3 rounded-xl border-2 hover:bg-gray-50 transition-all duration-300"
                  >
                    继续练习
                  </Button>
                  

                </div>
                
                <Button
                  onClick={() => handleNavigation('next')}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                  disabled={filteredMistakes.length <= 1}
                >
                  {navigationMode === 'random' ? '随机下一题' : '下一题'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MistakesPage;