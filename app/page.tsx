'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

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
