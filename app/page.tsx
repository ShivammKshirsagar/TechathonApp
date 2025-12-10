'use client';

import { useState, useRef, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import ChatLayout from '@/components/chat/ChatLayout';
import ChatBubble from '@/components/chat/ChatBubble';
import CustomerSummaryCard from '@/components/summary/CustomerSummaryCard';

interface Message {
  id: string;
  message: string;
  sender: 'agent' | 'user';
  isLoading?: boolean;
}

// Point this to your Next.js API route, NOT n8n directly
const API_URL = '/api/chat';

export default function HomePage() {
  // 1. Generate a consistent Session ID
  // This ID is created once when the page loads and stays constant
  const [sessionId] = useState(() => `session-${Math.random().toString(36).substring(7)}`);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      message: "Hi! I'm your Loan Assistant. May I know your name?",
      sender: 'agent',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (messageText: string) => {
    // Prevent sending empty messages
    if (!messageText.trim()) return;

    // Add user message immediately to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      message: messageText,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Add temporary loading indicator for agent
    const loadingMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMessageId,
        message: '...',
        sender: 'agent',
        isLoading: true,
      },
    ]);

    try {
      // 2. Prepare Payload
      // We send 'chatInput' because n8n Chat Triggers often look for this field specifically
      const payload = {
        sessionId: sessionId,
        chatInput: messageText, // Standard for n8n Chat Trigger
        message: messageText,   // Fallback for Webhook node
        text: messageText,      // Fallback
        input: messageText,     // Fallback
      };

      console.log(`Sending to ${API_URL} with Session ID: ${sessionId}`);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('n8n Response:', data);

      // 3. Extract Response safely
      // We check multiple fields because "Respond to Webhook" nodes can be configured differently
      let agentResponse = '';

      if (data.output) {
        agentResponse = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
      } else if (data.text) {
        agentResponse = data.text;
      } else if (data.message) {
        agentResponse = data.message;
      } else if (data.response) {
        agentResponse = data.response;
      } else if (data.body && data.body.message) {
        agentResponse = data.body.message;
      } else {
        // Fallback: If we get a valid JSON but no known field, dump the whole thing
        agentResponse = JSON.stringify(data);
      }

      // Remove loading bubble and add real response
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            message: agentResponse,
            sender: 'agent',
          },
        ];
      });

    } catch (error) {
      console.error('Chat Error:', error);

      let errorMessage = 'Sorry, something went wrong. Please try again.';
      
      if (error instanceof Error) {
        // Customize error message based on the issue
        if (error.message.includes('Server error')) {
           errorMessage = 'I am having trouble connecting to the brain (n8n). Please check the server logs.';
        }
      }

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingMessageId);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            message: errorMessage,
            sender: 'agent',
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <ChatLayout
        sidebar={<CustomerSummaryCard />}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg.message}
            sender={msg.sender}
            isLoading={msg.isLoading}
          />
        ))}
      </ChatLayout>
    </AppShell>
  );
}