'use client';

import React, { useState } from 'react';
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
    uploadSalarySlip,
    sanctionLetter,
  } = useAgentChat();

  const [showSanctionModal, setShowSanctionModal] = useState(false);

  return (
    <AppShell>
      <ChatLayout
        onSendMessage={sendMessage}
        isLoading={isStreaming}
        uploadRequired={uploadRequired}
        onUpload={uploadSalarySlip}
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
