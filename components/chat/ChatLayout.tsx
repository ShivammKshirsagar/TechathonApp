import MessageInput from './MessageInput';

interface ChatLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
        <MessageInput />
      </div>

      {/* Sidebar */}
      {sidebar && (
        <div className="lg:w-1/3 bg-gray-100 dark:bg-gray-800 p-6 overflow-y-auto">
          {sidebar}
        </div>
      )}
    </div>
  );
}
