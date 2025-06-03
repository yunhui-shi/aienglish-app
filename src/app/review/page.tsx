// /src/app/review/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter, useSearchParams } from 'next/navigation';

interface ReviewQuestion {
  id: string;
  sentence: string;
  question_type: 'word_choice' | 'sentence_translation';
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  grammar_points: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  source: 'generated' | 'mistakes';
}

interface ReviewSession {
  grammar_focus: string[];
  questions: ReviewQuestion[];
  current_index: number;
  completed: boolean;
  score: number;
}

const ReviewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grammarFocus, setGrammarFocus] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [questionCount, setQuestionCount] = useState<string>('5');
  const [sessionStarted, setSessionStarted] = useState(false);

  // 可选的语法点
  const availableGrammarPoints = [
    '虚拟语气', '定语从句', '时态理解', '固定搭配', '动词辨析',
    '关系代词', '现在完成进行时', '被动语态', '倒装句', '主谓一致',
    '非谓语动词', '条件句', '比较级', '介词搭配', '名词性从句'
  ];

  // 模拟生成练习题
  const generateQuestions = (grammarPoints: string[], difficulty: string, count: number): ReviewQuestion[] => {
    const mockQuestions: ReviewQuestion[] = [
      {
        id: 'R001',
        sentence: 'If she had studied harder, she would have passed the exam.',
        question_type: 'word_choice',
        question_text: '请选择句子中 "would have passed" 的最佳替换：',
        options: ['will pass', 'would pass', 'might have passed', 'should pass'],
        correct_answer: 'might have passed',
        explanation: '这是一个虚拟语气的第三类条件句，表示对过去情况的假设。主句用 "would/could/might + have + 过去分词" 的形式。',
        grammar_points: ['虚拟语气', '条件句'],
        difficulty: 'hard',
        source: 'generated'
      },
      {
        id: 'R002',
        sentence: 'The book which I bought yesterday is very interesting.',
        question_type: 'word_choice',
        question_text: '请选择句子中 "which" 的最佳替换：',
        options: ['what', 'that', 'who', 'where'],
        correct_answer: 'that',
        explanation: '在定语从句中，当先行词是物时，关系代词可以用 that 或 which。在限制性定语从句中，两者都可以使用。',
        grammar_points: ['定语从句', '关系代词'],
        difficulty: 'medium',
        source: 'generated'
      },
      {
        id: 'R003',
        sentence: 'She has been working on this project for three months.',
        question_type: 'sentence_translation',
        question_text: '请选择最符合句子意思的翻译：',
        options: [
          '她在这个项目上工作了三个月。',
          '她已经在这个项目上工作三个月了。',
          '她三个月来一直在做这个项目。',
          '她将要在这个项目上工作三个月。'
        ],
        correct_answer: '她三个月来一直在做这个项目。',
        explanation: '现在完成进行时强调动作从过去开始一直持续到现在，并可能继续下去。"一直在"最好地体现了这种持续性。',
        grammar_points: ['现在完成进行时', '时态理解'],
        difficulty: 'medium',
        source: 'generated'
      },
      {
        id: 'R004',
        sentence: 'Not only did he finish his homework, but he also helped his sister.',
        question_type: 'word_choice',
        question_text: '请选择句子中 "did he finish" 的语法作用：',
        options: ['强调', '倒装', '疑问', '否定'],
        correct_answer: '倒装',
        explanation: '"Not only" 位于句首时，句子需要部分倒装，即将助动词提到主语前面。这是倒装句的典型用法。',
        grammar_points: ['倒装句', '固定搭配'],
        difficulty: 'hard',
        source: 'generated'
      },
      {
        id: 'R005',
        sentence: 'The team, as well as their coach, was excited about the victory.',
        question_type: 'word_choice',
        question_text: '请选择句子中 "was" 的最佳替换：',
        options: ['were', 'are', 'is', 'have been'],
        correct_answer: 'were',
        explanation: '当主语由 "as well as" 连接时，谓语动词的单复数形式应与第一个主语保持一致。这里 "team" 可以看作复数概念。',
        grammar_points: ['主谓一致', '语法规则'],
        difficulty: 'medium',
        source: 'generated'
      }
    ];

    // 根据语法点过滤题目
    let filteredQuestions = mockQuestions;
    if (grammarPoints.length > 0) {
      filteredQuestions = mockQuestions.filter(q => 
        q.grammar_points.some(point => 
          grammarPoints.some(focus => 
            point.toLowerCase().includes(focus.toLowerCase())
          )
        )
      );
    }

    // 根据难度过滤
    if (difficulty !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
    }

    // 如果过滤后题目不够，补充其他题目
    if (filteredQuestions.length < count) {
      const remaining = mockQuestions.filter(q => !filteredQuestions.includes(q));
      filteredQuestions = [...filteredQuestions, ...remaining].slice(0, count);
    }

    return filteredQuestions.slice(0, count);
  };

  useEffect(() => {
    // 检查是否从错题页面跳转过来
    const grammarParam = searchParams.get('grammar');
    const fromParam = searchParams.get('from');
    
    if (grammarParam && fromParam === 'mistakes') {
      const grammarPoints = grammarParam.split(',');
      setGrammarFocus(grammarPoints[0] || 'all');
      // 自动开始练习
      const questions = generateQuestions(grammarPoints, 'medium', 5);
      setSession({
        grammar_focus: grammarPoints,
        questions,
        current_index: 0,
        completed: false,
        score: 0
      });
      setSessionStarted(true);
    }
    
    setLoading(false);
  }, [searchParams]);

  const startReviewSession = () => {
    const grammarPoints = grammarFocus && grammarFocus !== 'all' ? [grammarFocus] : [];
    const questions = generateQuestions(grammarPoints, difficulty, parseInt(questionCount));
    
    setSession({
      grammar_focus: grammarPoints,
      questions,
      current_index: 0,
      completed: false,
      score: 0
    });
    setSessionStarted(true);
    setSelectedAnswer('');
    setShowExplanation(false);
    setIsSubmitted(false);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !session) return;
    
    setIsSubmitted(true);
    setShowExplanation(true);
    
    // 更新分数
    const currentQuestion = session.questions[session.current_index];
    if (selectedAnswer === currentQuestion.correct_answer) {
      setSession(prev => prev ? { ...prev, score: prev.score + 1 } : null);
    }
  };

  const handleNextQuestion = () => {
    if (!session) return;
    
    const nextIndex = session.current_index + 1;
    if (nextIndex >= session.questions.length) {
      // 完成练习
      setSession(prev => prev ? { ...prev, completed: true } : null);
    } else {
      // 下一题
      setSession(prev => prev ? { ...prev, current_index: nextIndex } : null);
      setSelectedAnswer('');
      setShowExplanation(false);
      setIsSubmitted(false);
    }
  };

  const resetSession = () => {
    setSession(null);
    setSessionStarted(false);
    setSelectedAnswer('');
    setShowExplanation(false);
    setIsSubmitted(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl rounded-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在准备拓展练习...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 练习完成页面
  if (session?.completed) {
    const accuracy = Math.round((session.score / session.questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl rounded-2xl bg-white/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-purple-700">
              练习完成！
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6 text-center">
            <div className="space-y-4">
              <div className="text-6xl font-bold text-purple-600">
                {accuracy}%
              </div>
              <p className="text-xl text-gray-700">
                正确率：{session.score}/{session.questions.length}
              </p>
              
              {session.grammar_focus.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">练习重点：</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {session.grammar_focus.map((point, index) => (
                      <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={resetSession} className="bg-purple-600 hover:bg-purple-700">
                再练一次
              </Button>
              <Button variant="outline" onClick={() => router.push('/practice')}>
                返回练习
              </Button>
              <Button variant="outline" onClick={() => router.push('/mistakes')}>
                查看错题
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 练习进行中
  if (sessionStarted && session) {
    const currentQuestion = session.questions[session.current_index];
    const progress = ((session.current_index + 1) / session.questions.length) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 进度条 */}
          <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  题目 {session.current_index + 1} / {session.questions.length}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* 题目卡片 */}
          <Card className="shadow-xl rounded-2xl bg-white/90 backdrop-blur-md">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {currentQuestion.question_type === 'word_choice' ? '词语选择' : '翻译选择'}
                </span>
                {currentQuestion.grammar_points.map((point, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {point}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {/* 原句 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500">
                <p className="text-lg text-gray-800 leading-relaxed font-medium">
                  {currentQuestion.sentence}
                </p>
              </div>
              
              {/* 题目 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {currentQuestion.question_text}
                </h3>
                
                {/* 选项 */}
                <RadioGroup 
                  value={selectedAnswer} 
                  onValueChange={setSelectedAnswer}
                  disabled={isSubmitted}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = option === currentQuestion.correct_answer;
                    const isSelected = option === selectedAnswer;
                    
                    let optionClass = "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50";
                    
                    if (isSubmitted) {
                      if (isCorrect) {
                        optionClass += " border-green-500 bg-green-50";
                      } else if (isSelected && !isCorrect) {
                        optionClass += " border-red-500 bg-red-50";
                      } else {
                        optionClass += " border-gray-200 bg-gray-50";
                      }
                    } else {
                      optionClass += isSelected ? " border-purple-500 bg-purple-50" : " border-gray-200";
                    }
                    
                    return (
                      <div key={index} className={optionClass}>
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label 
                          htmlFor={`option-${index}`} 
                          className="flex-1 cursor-pointer text-gray-800"
                        >
                          {option}
                        </Label>
                        {isSubmitted && isCorrect && (
                          <span className="text-green-600 font-semibold">✓</span>
                        )}
                        {isSubmitted && isSelected && !isCorrect && (
                          <span className="text-red-600 font-semibold">✗</span>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
              
              {/* 解析 */}
              {showExplanation && (
                <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500">
                  <h4 className="font-semibold text-blue-800 mb-2">解析：</h4>
                  <p className="text-blue-700 leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex justify-center gap-4 pt-6">
                {!isSubmitted ? (
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                  >
                    提交答案
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextQuestion}
                    className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                  >
                    {session.current_index + 1 >= session.questions.length ? '完成练习' : '下一题'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 练习设置页面
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-xl rounded-2xl bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-purple-700">
            拓展练习 (Review & Extend)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <p className="text-center text-gray-600 mb-8">
            根据您的学习情况，生成针对性的拓展练习
          </p>
          
          <div className="space-y-6">
            {/* 语法点选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                重点语法点（可选）
              </Label>
              <Select value={grammarFocus} onValueChange={setGrammarFocus}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要重点练习的语法点" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部语法点</SelectItem>
                  {availableGrammarPoints.map((point) => (
                    <SelectItem key={point} value={point}>
                      {point}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 难度选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                练习难度
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                  <SelectItem value="all">混合难度</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 题目数量 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                题目数量
              </Label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 题</SelectItem>
                  <SelectItem value="10">10 题</SelectItem>
                  <SelectItem value="15">15 题</SelectItem>
                  <SelectItem value="20">20 题</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              onClick={startReviewSession}
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
            >
              开始练习
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/practice')}
              className="px-8 py-3 text-lg"
            >
              返回主练习
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewPage;