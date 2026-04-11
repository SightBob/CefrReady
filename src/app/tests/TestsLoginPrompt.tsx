'use client';

import { LogIn, Lock } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function TestsLoginPrompt() {
  return (
    <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 mb-8 text-white">
      <div className="flex items-center gap-3 mb-3">
        <Lock className="w-6 h-6" />
        <h2 className="text-xl font-bold">Login Required</h2>
      </div>
      <p className="text-white/90 mb-4">
        Please login to access full tests with 20-30 questions each, save your progress, and track your improvement over time.
      </p>
      <button
        onClick={() => signIn('google', { callbackUrl: '/tests' })}
        className="bg-white text-primary-600 px-6 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center gap-2"
      >
        <LogIn className="w-5 h-5" />
        Login to Continue
      </button>
    </div>
  );
}
