// src/app/api/auth/login/token/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login/token`;
  console.log(`[Next API Route /api/auth/login/token] Forwarding POST request to: ${backendUrl}`);

  try {
    // FastAPI's OAuth2PasswordRequestForm expects 'application/x-www-form-urlencoded'
    const formDataString = await request.text(); // Get the raw form data string
    console.log(`[Next API Route /api/auth/login/token] Request form data string:`, formDataString);

    const headersToForward: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Forward cookies if any, though for login it's usually not primary auth mechanism
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headersToForward['Cookie'] = cookieHeader;
    }

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: headersToForward,
      body: formDataString, // Forward the raw form data string
    });

    const responseData = await backendResponse.json();
    console.log(`[Next API Route /api/auth/login/token] Backend response status: ${backendResponse.status}`);
    console.log(`[Next API Route /api/auth/login/token] Backend response data:`, JSON.stringify(responseData, null, 2));

    // Forward Set-Cookie headers from the backend to the client
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      // Specifically handle Set-Cookie. Other headers might also be relevant depending on app needs.
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders.append(key, value); // Use append for multiple Set-Cookie headers
      }
    });

    return NextResponse.json(responseData, {
      status: backendResponse.status,
      headers: responseHeaders, // Send back headers (including Set-Cookie) to the client
    });

  } catch (error) {
    console.error(`[Next API Route /api/auth/login/token] Error forwarding request:`, error);
    return NextResponse.json(
      { error: 'Error forwarding request to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}