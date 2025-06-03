// src/app/api/mistakes/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/mistakes`;
  console.log(`[Next API Route /api/mistakes] Forwarding GET request to: ${backendUrl}`);

  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const fullBackendUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

    const headersToForward: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 转发认证头
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headersToForward['Authorization'] = authHeader;
    }

    // 转发Cookie
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headersToForward['Cookie'] = cookieHeader;
    }

    const backendResponse = await fetch(fullBackendUrl, {
      method: 'GET',
      headers: headersToForward,
    });

    const responseData = await backendResponse.json();
    console.log(`[Next API Route /api/mistakes] Backend response status: ${backendResponse.status}`);    
    return NextResponse.json(responseData, { 
      status: backendResponse.status
    });

  } catch (error) {
    console.error(`[Next API Route /api/mistakes] Error forwarding request:`, error);
    return NextResponse.json(
      { error: 'Error forwarding request to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}