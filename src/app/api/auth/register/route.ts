// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/register`;
  console.log(`[Next API Route /api/auth/register] Forwarding POST request to: ${backendUrl}`);

  try {
    const body = await request.json();
    console.log(`[Next API Route /api/auth/register] Request body:`, JSON.stringify(body, null, 2));

    const headersToForward: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward cookies if any, though for registration it's usually not primary auth mechanism
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headersToForward['Cookie'] = cookieHeader;
    }

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: headersToForward,
      body: JSON.stringify(body),
    });

    const responseData = await backendResponse.json();
    console.log(`[Next API Route /api/auth/register] Backend response status: ${backendResponse.status}`);
    console.log(`[Next API Route /api/auth/register] Backend response data:`, JSON.stringify(responseData, null, 2));
    
    // Forward Set-Cookie headers from the backend to the client, if any (though less common for register)
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders.append(key, value);
      }
    });

    return NextResponse.json(responseData, { 
      status: backendResponse.status,
      headers: responseHeaders 
    });

  } catch (error) {
    console.error(`[Next API Route /api/auth/register] Error forwarding request:`, error);
    return NextResponse.json(
      { error: 'Error forwarding request to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}