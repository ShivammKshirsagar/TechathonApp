'use client';

import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

export default function MessageInput() {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending:', message);
      setMessage('');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:right-1/3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-full px-5 py-3 border border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}