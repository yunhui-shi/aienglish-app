import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// POST /api/vocab/word/explanation - 获取单词释义
export async function POST(
  request: NextRequest
) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const { word, sentence } = body;
    
    console.log('[Word Explanation API] Fetching explanation for word:', word, 'with sentence:', sentence);
    
    const response = await fetch(`${backendUrl}/vocab/word/explanation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
      body: JSON.stringify({
        word: word,
        sentence: sentence
      })
    });
    
    const data = await response.json();
    console.log('[Word Explanation API] Backend response status:', response.status);
    console.log('[Word Explanation API] Backend response data:', data);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch word explanation' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Word Explanation API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}