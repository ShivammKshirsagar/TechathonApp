import { useCallback, useEffect, useRef, useState } from 'react';
import { SanctionLetter } from '@/lib/loan-flow/types';

export type AgentMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getOrCreate = (key: string) => {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto?.randomUUID ? crypto.randomUUID() : `id-${createId()}`;
  localStorage.setItem(key, value);
  return value;
};

export const useAgentChat = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: createId(),
      role: 'agent',
      content:
        "Hi! I'm your CodeBlitz loan advisor. Tell me how much you'd like to borrow and your preferred tenure.",
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadRequired, setUploadRequired] = useState(false);
  const [sanctionLetter, setSanctionLetter] = useState<SanctionLetter | null>(null);
  const sessionIdRef = useRef<string>('');
  const deviceIdRef = useRef<string>('');

  useEffect(() => {
    sessionIdRef.current = getOrCreate('codeblitz-session-id');
    deviceIdRef.current = getOrCreate('codeblitz-device-id');
  }, []);

  const updateAgentMessage = useCallback((id: string, updater: (prev: string) => string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, content: updater(message.content) } : message
      )
    );
  }, []);

  const handleMeta = useCallback((meta: any) => {
    if (!meta) return;
    if (meta.requires_upload) {
      setUploadRequired(true);
    }
    if (meta.sanction_letter) {
      setSanctionLetter(meta.sanction_letter);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;
      if (!sessionIdRef.current) {
        sessionIdRef.current = getOrCreate('codeblitz-session-id');
      }
      if (!deviceIdRef.current) {
        deviceIdRef.current = getOrCreate('codeblitz-device-id');
      }

      const userMessage: AgentMessage = {
        id: createId(),
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);

      const agentId = createId();
      setMessages((prev) => [...prev, { id: agentId, role: 'agent', content: '' }]);
      setIsStreaming(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            sessionId: sessionIdRef.current,
            deviceId: deviceIdRef.current,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to stream response.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            const data = line.replace(/^data:\s*/, '');
            if (data === '[DONE]') continue;

            const parsed = JSON.parse(data);
            if (parsed.type === 'token') {
              updateAgentMessage(agentId, (prev) => {
                const separator = prev && !prev.endsWith(' ') ? ' ' : '';
                return `${prev}${separator}${parsed.value}`;
              });
            }
            if (parsed.type === 'meta') {
              handleMeta(parsed.value);
            }
          }
        }
      } catch (error) {
        updateAgentMessage(agentId, () => 'Sorry, I ran into a problem. Please try again.');
      } finally {
        setIsStreaming(false);
      }
    },
    [handleMeta, isStreaming, updateAgentMessage]
  );

  const uploadSalarySlip = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', 'salary_slip');
        formData.append('session_id', sessionIdRef.current);

        await fetch('/api/loan/upload', {
          method: 'POST',
          body: formData,
        });

        setUploadRequired(false);
        await sendMessage('I have uploaded my salary slip.');
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: 'agent', content: 'Upload failed. Please try again.' },
        ]);
      }
    },
    [sendMessage]
  );

  return {
    messages,
    sendMessage,
    isStreaming,
    uploadRequired,
    uploadSalarySlip,
    sanctionLetter,
  };
};
