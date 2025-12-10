  // app/api/chat/route.ts
  import { NextResponse } from 'next/server';

  const N8N_WEBHOOK_URL = 'http://127.0.0.1:5678/webhook/bc1d8d34-888d-4c5c-9d6f-190950845cc2';

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
      
      console.log('API Route: Forwarding to n8n:', payload);
      console.log('Session ID being sent:', sessionId);
      
      // Forward request to n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('n8n error response:', errorText);
        throw new Error(`n8n responded with ${response.status}: ${errorText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, try to parse as text
        const textResponse = await response.text();
        console.log('n8n non-JSON response:', textResponse);
        
        // Try to parse as JSON anyway
        try {
          data = JSON.parse(textResponse);
        } catch {
          // If parsing fails, wrap it in an object
          data = { message: textResponse, text: textResponse, response: textResponse };
        }
      }
      
      console.log('API Route: Received from n8n:', data);
      
      // Include sessionId in response
      const responseData = {
        ...data,
        sessionId: sessionId,
      };
      
      return NextResponse.json(responseData);

    } catch (error) {
      console.error('API Route Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return NextResponse.json(
        { 
          error: 'Error communicating with automation server.',
          details: errorMessage 
        },
        { status: 500 }
      );
    }
  }