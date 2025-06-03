'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface PoolStatus {
  timestamp: string;
  pool_class: string;
  database_url: string;
  pool_size?: number;
  checked_in_connections?: number;
  checked_out_connections?: number;
  overflow_connections?: number;
  invalid_connections?: number;
  total_connections?: number;
  available_connections?: number;
  busy_connections?: number;
  pool_timeout?: number;
  max_overflow?: number;
  pool_recycle?: number;
  pool_pre_ping?: boolean;
  usage_percentage?: number;
  health_status?: string;
  note?: string;
}

interface ConnectionTest {
  status: string;
  message: string;
  response_time_ms?: number;
  test_result?: number;
  timestamp: string;
}

interface HealthData {
  overall_health: string;
  issues: string[];
  pool_status: { status: string; data?: PoolStatus; message?: string };
  connection_test: ConnectionTest;
  timestamp: string;
}

export default function MonitorPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('未找到认证令牌，请先登录');
      }

      const response = await fetch('http://localhost:8000/monitor/db/health', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setHealthData(result.data);
      } else {
        throw new Error(result.message || '获取健康状态失败');
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // 每30秒自动刷新
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />健康</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />警告</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />严重</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (loading && !healthData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>加载监控数据中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Database className="w-8 h-8 mr-3" />
            数据库连接池监控
          </h1>
          <p className="text-gray-600 mt-2">实时监控数据库连接池状态和性能指标</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            最后更新: {formatTimestamp(lastRefresh.toISOString())}
          </span>
          <Button onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-800">
              <XCircle className="w-5 h-5 mr-2" />
              <span>错误: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {healthData && (
        <>
          {/* 总体健康状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                总体健康状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getHealthBadge(healthData.overall_health)}
                  <span className="text-sm text-gray-600">
                    检查时间: {formatTimestamp(healthData.timestamp)}
                  </span>
                </div>
              </div>
              {healthData.issues.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-800 mb-2">发现的问题:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {healthData.issues.map((issue, index) => (
                      <li key={index} className="text-red-700 text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 连接池状态 */}
          <Card>
            <CardHeader>
              <CardTitle>连接池状态</CardTitle>
              <CardDescription>
                数据库连接池的详细状态信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.pool_status.status === 'success' && healthData.pool_status.data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">基本信息</h4>
                    <div className="text-sm space-y-1">
                      <div>连接池类型: <span className="font-mono">{healthData.pool_status.data.pool_class}</span></div>
                      <div>数据库URL: <span className="font-mono text-xs">{healthData.pool_status.data.database_url}</span></div>
                    </div>
                  </div>
                  
                  {healthData.pool_status.data.pool_size !== undefined && (
                    <div className="space-y-2">
                      <h4 className="font-medium">连接数统计</h4>
                      <div className="text-sm space-y-1">
                        <div>池大小: <span className="font-bold">{healthData.pool_status.data.pool_size}</span></div>
                        <div>已签入: <span className="text-green-600">{healthData.pool_status.data.checked_in_connections}</span></div>
                        <div>已签出: <span className="text-blue-600">{healthData.pool_status.data.checked_out_connections}</span></div>
                        <div>溢出连接: <span className="text-orange-600">{healthData.pool_status.data.overflow_connections}</span></div>
                        <div>无效连接: <span className="text-red-600">{healthData.pool_status.data.invalid_connections}</span></div>
                      </div>
                    </div>
                  )}
                  
                  {healthData.pool_status.data.usage_percentage !== undefined && (
                    <div className="space-y-2">
                      <h4 className="font-medium">使用率</h4>
                      <div className="text-sm space-y-1">
                        <div>使用率: <span className="font-bold">{healthData.pool_status.data.usage_percentage}%</span></div>
                        <div>健康状态: {getHealthBadge(healthData.pool_status.data.health_status || 'unknown')}</div>
                        <div>最大溢出: <span className="font-mono">{healthData.pool_status.data.max_overflow}</span></div>
                        <div>超时时间: <span className="font-mono">{healthData.pool_status.data.pool_timeout}s</span></div>
                      </div>
                    </div>
                  )}
                  
                  {healthData.pool_status.data.note && (
                    <div className="col-span-full">
                      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                        {healthData.pool_status.data.note}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-600">
                  连接池状态获取失败: {healthData.pool_status.message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 连接测试 */}
          <Card>
            <CardHeader>
              <CardTitle>连接测试</CardTitle>
              <CardDescription>
                数据库连接性能测试结果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">测试结果</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center">
                      状态: {healthData.connection_test.status === 'success' ? 
                        <Badge className="bg-green-100 text-green-800 ml-2">成功</Badge> : 
                        <Badge className="bg-red-100 text-red-800 ml-2">失败</Badge>
                      }
                    </div>
                    <div>消息: <span className="text-gray-700">{healthData.connection_test.message}</span></div>
                    {healthData.connection_test.response_time_ms && (
                      <div>响应时间: <span className="font-bold">{healthData.connection_test.response_time_ms}ms</span></div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">测试详情</h4>
                  <div className="text-sm space-y-1">
                    <div>测试时间: {formatTimestamp(healthData.connection_test.timestamp)}</div>
                    {healthData.connection_test.test_result && (
                      <div>测试查询结果: <span className="font-mono">{healthData.connection_test.test_result}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}