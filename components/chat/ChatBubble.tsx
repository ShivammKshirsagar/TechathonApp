import { User } from 'lucide-react';

interface ChatBubbleProps {
  message: string;
  sender: 'agent' | 'user';
  agentName?: string;
  isLoading?: boolean;
}

export default function ChatBubble({ 
  message, 
  sender, 
  agentName = 'Master Agent',
  isLoading = false
}: ChatBubbleProps) {
  const isUser = sender === 'user';
  
  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`text-sm text-gray-600 dark:text-gray-400 mb-1 ${isUser ? 'text-right' : ''}`}>
          {isUser ? 'You' : agentName}
        </div>
        <div className={`${
          isUser 
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tr-sm' 
            : 'bg-blue-900 dark:bg-blue-800 text-white rounded-2xl rounded-tl-sm'
        } px-5 py-4 inline-block max-w-lg whitespace-pre-wrap`}>
          {isLoading ? (
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          ) : (
            message
          )}
        </div>
      </div>
    </div>
  );
}
