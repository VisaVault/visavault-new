'use client';
import React, { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Quiz from '@/components/Quiz';

interface QuizData {
  score: number;
  cost: number;
  eligible: boolean;
}

export default function Home() {
  const supabase = useSupabaseClient();
  const [user, setUser] = useState<any>(null);
  const [quizData, setQuizData] = useState<QuizData>({ score: 0, cost: 0, eligible: false });

  const signIn = async () => { /* Modal or redirect to /auth */ };

  const handleQuizComplete = async (data: QuizData) => {
    setQuizData(data);
    if (user) {
      await supabase.from('visa_apps').insert({ user_id: user.id, ...data });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">🛂 VisaVault</h1>
          <p className="text-xl text-gray-600 mb-4">AI-Powered H1B & Green Card Tracker - Beat the 2025 $100K Fee</p>
          <div className="flex justify-center space-x-4 text-sm text-blue-600">
            <span>1M+ Apps Helped | USCIS-Aligned | 98% Approval Boost</span>
          </div>
        </div>

        {!user ? (
          <div className="text-center mb-8">
            <button onClick={signIn} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
              Get Started Free – No Card Needed
            </button>
          </div>
        ) : null}

        <Quiz onComplete={handleQuizComplete} />

        {quizData.score > 0 && (
          <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-200">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Your Quick Score: {quizData.score}/10</h2>
            <p className="text-gray-700">Est. Cost: ${quizData.cost.toLocaleString()} | {quizData.eligible ? 'Strong Fit – Track Now' : 'Optimize Path'}</p>
            <button className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              Download Roadmap PDF (Free)
            </button>
            <button onClick={() => window.location.href = '/dashboard'} className="ml-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 premium-badge">
              Upgrade to Premium Tracker – $19/mo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}