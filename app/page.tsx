'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import ChatLayout from '@/components/chat/ChatLayout';
import ChatBubble from '@/components/chat/ChatBubble';
import { SanctionLetterModal } from '@/components/sanction/SanctionLetterModal';
import { useAgentChat } from '@/lib/hooks/useAgentChat';

export default function HomePage() {
  const {
    messages,
    sendMessage,
    isStreaming,
    uploadRequired,
    requiredDocuments,
    uploadedDocuments,
    uploadDocument,
    sanctionLetter,
  } = useAgentChat();

  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      endRef.current?.scrollIntoView({ block: 'end' });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isStreaming]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !('ResizeObserver' in window)) return;

    const observer = new ResizeObserver(() => {
      container.scrollTop = container.scrollHeight;
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <AppShell>
      <ChatLayout
        onSendMessage={sendMessage}
        isLoading={isStreaming}
        uploadRequired={uploadRequired}
        onUpload={uploadDocument}
        requiredDocuments={requiredDocuments}
        uploadedDocuments={uploadedDocuments}
        scrollContainerRef={scrollContainerRef}
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message.content}
            sender={message.role === 'user' ? 'user' : 'agent'}
            agentName="Master Agent"
            isLoading={isStreaming && message.role === 'agent' && !message.content}
          />
        ))}
        <div ref={endRef} />

        {sanctionLetter && (
          <div className="mt-6">
            <button
              onClick={() => setShowSanctionModal(true)}
              className="bg-green-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              View Sanction Letter
            </button>
          </div>
        )}
      </ChatLayout>

      {sanctionLetter && (
        <SanctionLetterModal
          isOpen={showSanctionModal}
          onClose={() => setShowSanctionModal(false)}
          sanctionLetter={sanctionLetter}
        />
      )}
    </AppShell>
  );
}
