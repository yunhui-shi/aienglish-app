// src/app/api/practice/set/new/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) {
    console.error('Error: NEXT_PUBLIC_API_URL is not defined');
    return NextResponse.json({ error: 'Internal Server Error: API URL not configured' }, { status: 500 });
  }

  // Extract query parameters from the incoming request
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');
  const difficulty = searchParams.get('difficulty');

  // Construct the target URL for the backend
  const targetUrl = new URL(`${backendUrl}/practice/set/new`);
  if (topic) targetUrl.searchParams.append('topic', topic);
  if (difficulty) targetUrl.searchParams.append('difficulty', difficulty);

  console.log(`[Next API /api/practice/set/new] Forwarding GET request to: ${targetUrl.toString()}`);

  try {
    const headers = new Headers();
    const authorizationHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('Cookie');

    if (authorizationHeader) {
      headers.append('Authorization', authorizationHeader);
    }
    if (cookieHeader) {
      headers.append('Cookie', cookieHeader);
    }

    const backendResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: headers,
    });

    const responseData = await backendResponse.json();
    console.log(`[Next API /api/practice/set/new] Backend response status: ${backendResponse.status}`);
    // console.log(`[Next API /api/practice/set/new] Backend response data:`, responseData); // Potentially verbose

    const responseHeaders = new Headers();
    // Forward Set-Cookie header from backend if present
    const setCookieHeader = backendResponse.headers.get('Set-Cookie');
    if (setCookieHeader) {
      responseHeaders.append('Set-Cookie', setCookieHeader);
    }

    return NextResponse.json(responseData, {
      status: backendResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`[Next API /api/practice/set/new] Error forwarding request:`, error);
    return NextResponse.json({ error: 'Failed to fetch data from backend' }, { status: 500 });
  }
}