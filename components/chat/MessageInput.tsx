'use client';

import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface MessageInputProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  uploadRequired?: boolean;
  onUpload?: (file: File) => void;
}

export default function MessageInput({
  onSend,
  isLoading = false,
  uploadRequired = false,
  onUpload
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend?.(message.trim());
      setMessage('');
    }
  };

  const handleUpload = () => {
    if (file && onUpload && !isLoading) {
      onUpload(file);
      setFile(null);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:right-1/3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-10">
      <div className="max-w-4xl mx-auto">
        {uploadRequired ? (
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-2xl px-5 py-4 border border-gray-200 dark:border-gray-700">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="flex-1 text-sm text-gray-700 dark:text-gray-200"
            />
            <button
              onClick={handleUpload}
              disabled={isLoading || !file}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-full px-5 py-3 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
            />
            <button 
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSend}
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
