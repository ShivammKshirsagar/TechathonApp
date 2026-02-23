import { useCallback, useEffect, useRef, useState } from 'react';
import { SanctionLetter } from '@/lib/loan-flow/types';

export type AgentMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

type RequiredDocType = 'salary_slip' | 'bank_statement' | 'address_proof' | 'selfie_pan';

const DOC_ORDER: RequiredDocType[] = ['salary_slip', 'bank_statement', 'address_proof', 'selfie_pan'];

const orderDocs = (docs: string[]): RequiredDocType[] => {
  const incoming = docs.filter((d): d is RequiredDocType => DOC_ORDER.includes(d as RequiredDocType));
  const deduped = Array.from(new Set(incoming));
  return DOC_ORDER.filter((d) => deduped.includes(d));
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CHAT_STATE_KEY = 'codeblitz-chat-state-v1';

type PersistedChatState = {
  messages?: AgentMessage[];
  sanctionLetter?: SanctionLetter | null;
  uploadRequired?: boolean;
  requiredDocuments?: RequiredDocType[];
  uploadedDocuments?: RequiredDocType[];
};

const getOrCreate = (key: string) => {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto?.randomUUID ? crypto.randomUUID() : `id-${createId()}`;
  localStorage.setItem(key, value);
  return value;
};

const getDefaultMessages = (): AgentMessage[] => [
  {
    id: 'welcome-agent-message',
    role: 'agent',
    content:
      "Hi! I'm your CodeBlitz loan advisor. Tell me how much you'd like to borrow and your preferred tenure.",
  },
];

const readPersistedState = (): PersistedChatState | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CHAT_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedChatState;
  } catch {
    return null;
  }
};

export const useAgentChat = () => {
  const [messages, setMessages] = useState<AgentMessage[]>(getDefaultMessages());
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadRequired, setUploadRequired] = useState(false);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocType[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<RequiredDocType[]>([]);
  const [sanctionLetter, setSanctionLetter] = useState<SanctionLetter | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const sessionIdRef = useRef<string>('');
  const deviceIdRef = useRef<string>('');

  useEffect(() => {
    sessionIdRef.current = getOrCreate('codeblitz-session-id');
    deviceIdRef.current = getOrCreate('codeblitz-device-id');

    const persisted = readPersistedState();
    if (persisted) {
      if (persisted.messages?.length) setMessages(persisted.messages);
      setSanctionLetter(persisted.sanctionLetter || null);
      setUploadRequired(Boolean(persisted.uploadRequired));
      setRequiredDocuments(persisted.requiredDocuments || []);
      setUploadedDocuments(persisted.uploadedDocuments || []);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return;
    const payload: PersistedChatState = {
      messages,
      sanctionLetter,
      uploadRequired,
      requiredDocuments,
      uploadedDocuments,
    };
    localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(payload));
  }, [messages, sanctionLetter, uploadRequired, requiredDocuments, uploadedDocuments, isHydrated]);

  const updateAgentMessage = useCallback((id: string, updater: (prev: string) => string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, content: updater(message.content) } : message
      )
    );
  }, []);

  const handleMeta = useCallback((meta: any) => {
    if (!meta) return;
    const requiresAction = meta.requires_action;
    if (meta.status === 'approved' || meta.status === 'rejected' || meta.status === 'manual_review') {
      setUploadRequired(false);
      setRequiredDocuments([]);
      setUploadedDocuments([]);
    }
    if (requiresAction && requiresAction.type === 'document_upload') {
      const required = orderDocs(Array.isArray(requiresAction.required_documents) ? requiresAction.required_documents : []);
      setRequiredDocuments(required);
      setUploadRequired(required.length > 0);
    } else if (meta.requires_upload) {
      setUploadRequired(true);
    } else {
      setUploadRequired(false);
      setRequiredDocuments([]);
      setUploadedDocuments([]);
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
            if (parsed.type === 'error') {
              updateAgentMessage(agentId, () => parsed.message || 'Backend error while generating response.');
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

  const uploadDocument = useCallback(
    async (file: File, docType?: string) => {
      try {
        const nextDoc = requiredDocuments.find((doc) => !uploadedDocuments.includes(doc));
        const resolvedDocType = (docType || nextDoc || 'salary_slip') as RequiredDocType;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', resolvedDocType);
        formData.append('session_id', sessionIdRef.current);

        const uploadResponse = await fetch('/api/loan/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) {
          throw new Error('Upload request failed.');
        }
        const uploadData = await uploadResponse.json();
        const verification = uploadData?.verification;
        const verified = Boolean(verification?.verified);
        const verificationReason = verification?.reason as string | undefined;

        if (verified) {
          setUploadedDocuments((prev) => {
            if (prev.includes(resolvedDocType)) return prev;
            return [...prev, resolvedDocType];
          });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: 'agent',
              content: `Uploaded ${resolvedDocType}, but verification failed${verificationReason ? `: ${verificationReason}` : '.'} Please re-upload a matching document.`,
            },
          ]);
        }
        await sendMessage(`I have uploaded my ${resolvedDocType}.`);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: 'agent', content: 'Upload failed. Please try again.' },
        ]);
      }
    },
    [requiredDocuments, uploadedDocuments, sendMessage]
  );

  return {
    messages,
    sendMessage,
    isStreaming,
    uploadRequired,
    requiredDocuments,
    uploadedDocuments,
    uploadDocument,
    sanctionLetter,
  };
};
