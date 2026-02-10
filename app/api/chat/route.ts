  // app/api/chat/route.ts
  import { NextResponse } from 'next/server';

  export const runtime = 'nodejs';

  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

  export async function POST(request: Request) {
    try {
      const body = await request.json();
      
      // Ensure sessionId is always present at root level
      const sessionId = body.sessionId || `session-${Math.random().toString(36).substring(7)}`;
      
      // Prepare payload with sessionId at multiple levels for compatibility
      const payload = {
        ...body,
        sessionId: sessionId,  // Root level for easy access
      };
      
      console.log('API Route: Forwarding to backend:', payload);
      console.log('Session ID being sent:', sessionId);
      
      // Forward request to backend (streaming)
      const response = await fetch(`${BACKEND_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: body.message || body.text || body.input || '',
          session_id: sessionId,
          device_id: body.deviceId,
          ip_address: body.ipAddress,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Backend responded with ${response.status}: ${errorText}`);
      }

      return new NextResponse(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Session-Id': sessionId,
        },
      });

    } catch (error) {
      console.error('API Route Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return NextResponse.json(
        { 
          error: 'Error communicating with backend server.',
          details: errorMessage 
        },
        { status: 500 }
      );
    }
  }
