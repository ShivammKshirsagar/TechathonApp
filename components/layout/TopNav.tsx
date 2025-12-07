'use client';

import ThemeToggle from './ThemeToggle';

export default function TopNav() {
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center transform rotate-45">
          <div className="w-4 h-4 bg-blue-600 rounded-sm transform -rotate-45"></div>
        </div>
        <h1 className="text-white text-lg font-medium">
          Personal Loan Assistant – Powered by Agentic AI
        </h1>
      </div>
      <ThemeToggle />
    </nav>
  );
}