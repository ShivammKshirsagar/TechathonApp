'use client';

import AppShell from '@/components/layout/AppShell';
import ChatLayout from '@/components/chat/ChatLayout';
import ChatBubble from '@/components/chat/ChatBubble';
import CustomerSummaryCard from '@/components/summary/CustomerSummaryCard';

// Main App Component
export default function HomePage() {
  return (
    <AppShell>
      <ChatLayout sidebar={<CustomerSummaryCard />}>
        <ChatBubble
          message="Hi! I'm your Loan Assistant. May I know your name and loan requirement?"
          sender="agent"
        />
        <div className="text-sm text-gray-500 dark:text-gray-400 ml-14">
          Master Agent Working...
        </div>
      </ChatLayout>
    </AppShell>
  );
}