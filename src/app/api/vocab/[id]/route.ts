import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// PUT /api/vocab/[id] - 更新词汇状态
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    console.log('[Vocab Update API] Updating vocabulary status for ID:', id, 'with data:', body);

    const response = await fetch(`${backendUrl}/vocab/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    console.log('[Vocab Update API] Backend response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[Vocab Update API] Backend response data:', data);
      return NextResponse.json(data);
    } else {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to update vocabulary status' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[Vocab Update API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/vocab/[id] - 删除词汇
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');

    console.log('[Vocab Delete API] Deleting vocabulary with ID:', id);

    const response = await fetch(`${backendUrl}/vocab/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('[Vocab Delete API] Backend response status:', response.status);

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to delete vocabulary' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[Vocab Delete API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}