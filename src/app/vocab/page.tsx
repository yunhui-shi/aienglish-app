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
  phonetic?: string;
  definition: string;
  example_sentence?: string;
  translation?: string;
  status: 'new' | 'learning' | 'mastered';
  added_at: string;
  grammar_type?: string;
}

interface WordDefinition {
  part_of_speech: string;
  meanings: string[];
}

const VocabPage = () => {
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
  const [filteredList, setFilteredList] = useState<VocabularyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [loading, setLoading] = useState(true);

  // 模拟生词数据
  const mockVocabulary: VocabularyItem[] = useMemo(() => [
    {
      id: '1',
      word: 'consensus',
      phonetic: '/kənˈsensəs/',
      definition: JSON.stringify([{
        part_of_speech: 'noun',
        meanings: ['共识，一致意见', '普遍同意的意见或决定']
      }]),
      example_sentence: 'The committee reached a consensus on the new policy.',
      translation: '委员会就新政策达成了共识。',
      status: 'learning',
      added_at: '2024-01-15T10:30:00Z',
      grammar_type: 'noun'
    },
    {
      id: '2',
      word: 'proposal',
      phonetic: '/prəˈpoʊzl/',
      definition: JSON.stringify([{
        part_of_speech: 'noun',
        meanings: ['提案，建议', '求婚']
      }]),
      example_sentence: 'She submitted a detailed proposal for the project.',
      translation: '她为这个项目提交了一份详细的提案。',
      status: 'new',
      added_at: '2024-01-14T14:20:00Z',
      grammar_type: 'noun'
    },
    {
      id: '3',
      word: 'achieve',
      phonetic: '/əˈtʃiːv/',
      definition: JSON.stringify([{
        part_of_speech: 'verb',
        meanings: ['实现，达到，完成', '取得成功']
      }]),
      example_sentence: 'She worked hard to achieve her goals.',
      translation: '她努力工作以实现自己的目标。',
      status: 'mastered',
      added_at: '2024-01-13T09:15:00Z',
      grammar_type: 'verb'
    },
    {
      id: '4',
      word: 'sophisticated',
      phonetic: '/səˈfɪstɪkeɪtɪd/',
      definition: JSON.stringify([{
        part_of_speech: 'adjective',
        meanings: ['复杂的，精密的', '老练的，世故的', '高级的，先进的']
      }]),
      example_sentence: 'The software uses sophisticated algorithms.',
      translation: '这个软件使用复杂的算法。',
      status: 'learning',
      added_at: '2024-01-12T16:45:00Z',
      grammar_type: 'adjective'
    },
    {
      id: '5',
      word: 'implement',
      phonetic: '/ˈɪmplɪment/',
      definition: JSON.stringify([{
        part_of_speech: 'verb',
        meanings: ['实施，执行，实现', '履行，贯彻']
      }]),
      example_sentence: 'The company will implement the new strategy next month.',
      translation: '公司将在下个月实施新战略。',
      status: 'new',
      added_at: '2024-01-11T11:30:00Z',
      grammar_type: 'verb'
    }
  ], []);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/vocab/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setVocabularyList(data);
          setFilteredList(data);
        } else {
          console.error('Failed to fetch vocabulary:', response.status);
          // 如果API调用失败，使用模拟数据作为后备
          setVocabularyList(mockVocabulary);
          setFilteredList(mockVocabulary);
        }
      } catch (error) {
        console.error('Error fetching vocabulary:', error);
        // 如果发生错误，使用模拟数据作为后备
        setVocabularyList(mockVocabulary);
        setFilteredList(mockVocabulary);
      } finally {
        setLoading(false);
      }
    };

    fetchVocabulary();
  }, [mockVocabulary]);

  useEffect(() => {
    // 根据搜索词和状态过滤生词
    let filtered = vocabularyList;
    
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const word = item.word.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // 搜索单词本身
        if (word.includes(searchLower)) {
          return true;
        }
        
        // 搜索解析后的释义
        const definitions = parseDefinition(item.definition);
        return definitions.some(def => 
          def.meanings.some(meaning => 
            meaning.toLowerCase().includes(searchLower)
          )
        );
      });
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    setFilteredList(filtered);
  }, [searchTerm, statusFilter, vocabularyList]);



  const handleStatusChange = async (wordId: string, newStatus: VocabularyItem['status']) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(`/api/vocab/${wordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // 更新本地状态
        setVocabularyList(prev => 
          prev.map(item => 
            item.id === wordId ? { ...item, status: newStatus } : item
          )
        );
      } else {
        console.error('Failed to update vocabulary status:', response.status);
      }
    } catch (error) {
      console.error('Failed to update vocabulary status:', error);
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    // if (!confirm('确定要删除这个单词吗？')) {
    //   return;
    // }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(`/api/vocab/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // 从本地状态中移除
        setVocabularyList(prev => prev.filter(item => item.id !== wordId));
      //   // 如果当前显示的是被删除的单词，关闭模态框
      //   if (selectedWord && selectedWord.id === wordId) {
      //     setShowModal(false);
      //     setSelectedWord(null);
      //   }
      // } else {
      //   console.error('Failed to delete vocabulary:', response.status);
      //   alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Failed to delete vocabulary:', error);
      alert('删除失败，请重试');
    }
  };

  // 解析JSON格式的释义
  const parseDefinition = (definition: string): WordDefinition[] => {
    if (!definition) {
      return [{
        part_of_speech: 'unknown',
        meanings: ['No definition available']
      }];
    }
    
    try {
      return JSON.parse(definition);
    } catch (parseError) { // Renamed 'error' to 'parseError' to avoid conflict
      console.error('Error parsing definition:', parseError);
      // 如果解析失败，返回原始字符串作为单个释义
      return [{
        part_of_speech: 'unknown',
        meanings: [definition]
      }];
    }
  };

  // 获取简化的释义显示
  // const getSimpleDefinition = (definition: string): string => {
  //   const parsed = parseDefinition(definition);
  //   if (parsed.length > 0 && parsed[0].meanings && parsed[0].meanings.length > 0) {
  //     return parsed[0].meanings[0];
  //   }
  //   return definition;
  // };

  const getStatusColor = (status: VocabularyItem['status']) => {
    switch (status) {
      case 'new': return 'bg-gray-100 text-gray-800';
      case 'learning': return 'bg-blue-100 text-blue-800';
      case 'mastered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: VocabularyItem['status']) => {
    switch (status) {
      case 'new': return '新单词';
      case 'learning': return '学习中';
      case 'mastered': return '已掌握';
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
                    <SelectItem value="new">新单词</SelectItem>
                    <SelectItem value="learning">学习中</SelectItem>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {filteredList.map((word) => (
            <Card 
              key={word.id} 
              className="shadow-md rounded-lg bg-white/90 backdrop-blur-md hover:shadow-lg transition-all duration-200"
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  {/* 单词标题和状态 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-indigo-800">{word.word}</h3>
                      {word.phonetic && (
                        <p className="text-xs text-gray-600 mt-0.5">{word.phonetic}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(word.status)}`}>
                        {getStatusLabel(word.status)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteWord(word.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-1.5 py-0.5 h-5 text-xs"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                  
                  {/* 详细释义 */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2 text-xs">释义：</h4>
                    <div className="space-y-2">
                      {parseDefinition(word.definition).map((definition: WordDefinition, index: number) => (
                        <div key={index} className="border-l-3 border-purple-200 pl-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {definition.part_of_speech}
                            </span>
                          </div>
                          <ul className="space-y-0.5">
                            {definition.meanings?.map((meaning: string, meaningIndex: number) => (
                              <li key={meaningIndex} className="text-gray-700 text-xs">
                                • {meaning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 例句 */}
                  {word.example_sentence && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1 text-xs">例句：</h4>
                      <p className="text-gray-700 italic text-xs">&quot;{word.example_sentence}&quot;</p>
                      {word.translation && (
                        <p className="text-gray-600 mt-0.5 text-xs">{word.translation}</p>
                      )}
                    </div>
                  )}
                  
                  {/* 词性和添加时间 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {word.grammar_type && (
                        <div>
                          <span className="font-medium">词性：</span>
                          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {word.grammar_type}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      {new Date(word.added_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  
                  {/* 状态按钮 */}
                  <div className="flex gap-1.5 pt-2 border-t">
                    <Button
                      size="sm"
                      variant={word.status === 'new' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(word.id, 'new')}
                      className="text-xs px-2 py-1 h-6"
                    >
                      新单词
                    </Button>
                    <Button
                      size="sm"
                      variant={word.status === 'learning' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(word.id, 'learning')}
                      className="text-xs px-2 py-1 h-6"
                    >
                      学习中
                    </Button>
                    <Button
                      size="sm"
                      variant={word.status === 'mastered' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(word.id, 'mastered')}
                      className="text-xs px-2 py-1 h-6"
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


    </div>
  );
};

export default VocabPage;