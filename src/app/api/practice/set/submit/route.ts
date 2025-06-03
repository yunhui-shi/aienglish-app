// src/app/api/practice/set/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/practice/set/submit`;
  console.log(`[Next API Route /api/practice/set/submit] Forwarding POST request to: ${backendUrl}`);

  try {
    const body = await request.json();
    console.log(`[Next API Route /api/practice/set/submit] Request body:`, JSON.stringify(body, null, 2));

    const headersToForward: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const authorizationHeader = request.headers.get('Authorization');
    if (authorizationHeader) {
      headersToForward['Authorization'] = authorizationHeader;
      console.log(`[Next API Route /api/practice/set/submit] Forwarding Authorization header.`);
    }

    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headersToForward['Cookie'] = cookieHeader;
      console.log(`[Next API Route /api/practice/set/submit] Forwarding Cookie header.`);
    }

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: headersToForward,
      body: JSON.stringify(body),
    });

    // First, get the response as text to see what the backend is actually sending
    const responseText = await backendResponse.text();
    console.log(`[Next API Route /api/practice/set/submit] Backend raw response text:`, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText); // Try to parse the text as JSON
    } catch (parseError) {
      console.error(`[Next API Route /api/practice/set/submit] Failed to parse backend response as JSON:`, parseError);
      // If parsing fails, it means the backend didn't send JSON. 
      // We can return an error response or the raw text, depending on desired behavior.
      // For now, let's return an error indicating non-JSON response from backend.
      return NextResponse.json(
        { 
          error: 'Backend returned non-JSON response',
          status: backendResponse.status,
          responseText: responseText // Include the raw text for debugging
        },
        { status: backendResponse.status } // Use backend's status if possible, or 500
      );
    }

    console.log(`[Next API Route /api/practice/set/submit] Backend response status: ${backendResponse.status}`);
    console.log(`[Next API Route /api/practice/set/submit] Backend response data:`, JSON.stringify(responseData, null, 2));

    // Also forward Set-Cookie headers from the backend to the client if any
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // For Next.js Edge/Node.js runtime, appending multiple Set-Cookie headers might need special handling
        // For simplicity here, we'll just set it. If multiple cookies, this might only take the last one
        // or Next.js might handle it correctly. Check Next.js docs for `NextResponse.headers.append` if issues.
        responseHeaders.append(key, value);
      }
    });

    return NextResponse.json(responseData, { 
      status: backendResponse.status,
      headers: responseHeaders 
    });

  } catch (error) {
    console.error(`[Next API Route /api/practice/set/submit] Error forwarding request:`, error);
    return NextResponse.json(
      { error: 'Error forwarding request to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}