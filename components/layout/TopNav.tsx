'use client';

import { User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function TopNav() {
  const router = useRouter();

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center transform rotate-45">
          <div className="w-4 h-4 bg-blue-600 rounded-sm transform -rotate-45"></div>
        </div>
        <h1 className="text-white text-lg font-medium">
          Personal Loan Assistant – Powered by Agentic AI
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Profile Icon Button */}
        <button
          onClick={() => router.push('/profile')}
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="View Profile"
        >
          <User className="w-5 h-5 text-white" />
        </button>
        
        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </nav>
  );
}
