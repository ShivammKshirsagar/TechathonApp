import AppShell from '@/components/layout/AppShell';
import ChatLayout from '@/components/chat/ChatLayout';
import ChatBubble from '@/components/chat/ChatBubble';
import KycCard from '@/components/kyc/KycCard';

export default function KycPage() {
  return (
    <AppShell>
      <ChatLayout>
        {/* Chat Messages */}
        <ChatBubble
          message="Got it. Let me just pull up your details from our system..."
          sender="agent"
          agentName="AI Agent"
        />
        
        <ChatBubble
          message="Great, I've verified your details!"
          sender="agent"
          agentName="AI Agent"
        />

        {/* KYC Card */}
        <div className="mt-8 mb-6">
          <KycCard />
        </div>
      </ChatLayout>
    </AppShell>
  );
}



