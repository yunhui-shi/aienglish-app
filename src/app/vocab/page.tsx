// /src/app/vocab/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface VocabularyItem {
  id: string;
  word: string;
  pronunciation?: string;
  definition: string;
  example_sentence?: string;
  translation?: string;
  status: 'learning' | 'mastered' | 'review';
  added_at: string;
  grammar_type?: string;
}

const VocabPage = () => {
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
  const [filteredList, setFilteredList] = useState<VocabularyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 模拟生词数据
  const mockVocabulary: VocabularyItem[] = useMemo(() => [
    {
      id: '1',
      word: 'consensus',
      pronunciation: '/kənˈsensəs/',
      definition: '共识，一致意见',
      example_sentence: 'The committee reached a consensus on the new policy.',
      translation: '委员会就新政策达成了共识。',
      status: 'learning',
      added_at: '2024-01-15T10:30:00Z',
      grammar_type: 'noun'
    },
    {
      id: '2',
      word: 'proposal',
      pronunciation: '/prəˈpoʊzl/',
      definition: '提案，建议',
      example_sentence: 'She submitted a detailed proposal for the project.',
      translation: '她为这个项目提交了一份详细的提案。',
      status: 'review',
      added_at: '2024-01-14T14:20:00Z',
      grammar_type: 'noun'
    },
    {
      id: '3',
      word: 'achieve',
      pronunciation: '/əˈtʃiːv/',
      definition: '实现，达到，完成',
      example_sentence: 'She worked hard to achieve her goals.',
      translation: '她努力工作以实现自己的目标。',
      status: 'mastered',
      added_at: '2024-01-13T09:15:00Z',
      grammar_type: 'verb'
    },
    {
      id: '4',
      word: 'sophisticated',
      pronunciation: '/səˈfɪstɪkeɪtɪd/',
      definition: '复杂的，精密的，老练的',
      example_sentence: 'The software uses sophisticated algorithms.',
      translation: '这个软件使用复杂的算法。',
      status: 'learning',
      added_at: '2024-01-12T16:45:00Z',
      grammar_type: 'adjective'
    },
    {
      id: '5',
      word: 'implement',
      pronunciation: '/ˈɪmplɪment/',
      definition: '实施，执行，实现',
      example_sentence: 'The company will implement the new strategy next month.',
      translation: '公司将在下个月实施新战略。',
      status: 'review',
      added_at: '2024-01-11T11:30:00Z',
      grammar_type: 'verb'
    }
  ], []);

  useEffect(() => {
    // 模拟从后端获取生词数据
    setTimeout(() => {
      setVocabularyList(mockVocabulary);
      setFilteredList(mockVocabulary);
      setLoading(false);
    }, 500);
  }, [mockVocabulary]);

  useEffect(() => {
    // 根据搜索词和状态过滤生词
    let filtered = vocabularyList;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    setFilteredList(filtered);
  }, [searchTerm, statusFilter, vocabularyList]);

  const handleWordClick = (word: VocabularyItem) => {
    setSelectedWord(word);
    setShowModal(true);
  };

  const handleStatusChange = async (wordId: string, newStatus: VocabularyItem['status']) => {
    try {
      // 这里应该调用后端API更新状态
      // await updateVocabularyStatus(wordId, newStatus);
      
      setVocabularyList(prev => 
        prev.map(item => 
          item.id === wordId ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error('Failed to update vocabulary status:', error);
    }
  };

  const getStatusColor = (status: VocabularyItem['status']) => {
    switch (status) {
      case 'learning': return 'bg-blue-100 text-blue-800';
      case 'mastered': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: VocabularyItem['status']) => {
    switch (status) {
      case 'learning': return '学习中';
      case 'mastered': return '已掌握';
      case 'review': return '需复习';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl rounded-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载生词本...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题和搜索过滤 */}
        <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-purple-700">
              生词本 (Vocabulary Notebook)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  搜索：
                </Label>
                <Input
                  id="search"
                  placeholder="搜索单词或释义..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  状态：
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="learning">学习中</SelectItem>
                    <SelectItem value="review">需复习</SelectItem>
                    <SelectItem value="mastered">已掌握</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-600">
              共 {filteredList.length} 个单词
            </div>
          </CardContent>
        </Card>

        {/* 生词列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((word) => (
            <Card 
              key={word.id} 
              className="shadow-lg rounded-xl bg-white/90 backdrop-blur-md hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105"
              onClick={() => handleWordClick(word)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{word.word}</h3>
                      {word.pronunciation && (
                        <p className="text-sm text-gray-600">{word.pronunciation}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(word.status)}`}>
                      {getStatusLabel(word.status)}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 text-sm">{word.definition}</p>
                  
                  {word.grammar_type && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {word.grammar_type}
                    </span>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant={word.status === 'learning' ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(word.id, 'learning');
                      }}
                      className="text-xs"
                    >
                      学习中
                    </Button>
                    <Button
                      size="sm"
                      variant={word.status === 'review' ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(word.id, 'review');
                      }}
                      className="text-xs"
                    >
                      需复习
                    </Button>
                    <Button
                      size="sm"
                      variant={word.status === 'mastered' ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(word.id, 'mastered');
                      }}
                      className="text-xs"
                    >
                      已掌握
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredList.length === 0 && (
          <Card className="shadow-lg rounded-2xl bg-white/90 backdrop-blur-md">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">没有找到匹配的生词</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 详细信息模态框 */}
      {showModal && selectedWord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-2xl shadow-2xl rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800">{selectedWord.word}</CardTitle>
                  {selectedWord.pronunciation && (
                    <p className="text-lg text-gray-600 mt-1">{selectedWord.pronunciation}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">释义：</h4>
                <p className="text-gray-700">{selectedWord.definition}</p>
              </div>
              
              {selectedWord.example_sentence && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">例句：</h4>
                  <p className="text-gray-700 italic">&quot;{selectedWord.example_sentence}&quot;</p>
                  {selectedWord.translation && (
                    <p className="text-gray-600 mt-1">{selectedWord.translation}</p>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-4">
                {selectedWord.grammar_type && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">词性：</span>
                    <span className="ml-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {selectedWord.grammar_type}
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="text-sm font-medium text-gray-700">状态：</span>
                  <span className={`ml-1 px-2 py-1 rounded text-sm ${getStatusColor(selectedWord.status)}`}>
                    {getStatusLabel(selectedWord.status)}
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                添加时间：{new Date(selectedWord.added_at).toLocaleDateString('zh-CN')}
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant={selectedWord.status === 'learning' ? 'default' : 'outline'}
                  onClick={() => {
                    handleStatusChange(selectedWord.id, 'learning');
                    setSelectedWord({...selectedWord, status: 'learning'});
                  }}
                >
                  标记为学习中
                </Button>
                <Button
                  variant={selectedWord.status === 'review' ? 'default' : 'outline'}
                  onClick={() => {
                    handleStatusChange(selectedWord.id, 'review');
                    setSelectedWord({...selectedWord, status: 'review'});
                  }}
                >
                  标记为需复习
                </Button>
                <Button
                  variant={selectedWord.status === 'mastered' ? 'default' : 'outline'}
                  onClick={() => {
                    handleStatusChange(selectedWord.id, 'mastered');
                    setSelectedWord({...selectedWord, status: 'mastered'});
                  }}
                >
                  标记为已掌握
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VocabPage;