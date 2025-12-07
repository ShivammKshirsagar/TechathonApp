import { User } from 'lucide-react';

interface ChatBubbleProps {
  message: string;
  sender: 'agent' | 'user';
  agentName?: string;
}

export default function ChatBubble({ 
  message, 
  sender, 
  agentName = 'Master Agent' 
}: ChatBubbleProps) {
  return (
    <div className="flex gap-3 mb-6">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="flex-1">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {agentName}
        </div>
        <div className="bg-blue-900 dark:bg-blue-800 text-white rounded-2xl rounded-tl-sm px-5 py-4 inline-block max-w-lg">
          {message}
        </div>
      </div>
    </div>
  );
}
