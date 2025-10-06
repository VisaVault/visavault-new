'use client';
import { useState } from 'react';

interface QuizData {
  score: number;
  cost: number;
  eligible: boolean;
}

export default function Home() {
  const [quizData, setQuizData] = useState<QuizData>({ score: 0, cost: 0, eligible: false });

  const handleQuizComplete = (data: QuizData) => {
    setQuizData(data);
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

        <div className="quiz-card fade-in">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">H1B/Green Card Eligibility Quiz</h2>
          <p className="text-gray-600 mb-6">Answer 4 quick questions - Takes 1 min.</p>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            let score = 0;
            let cost = 105000;
            if (formData.get('job') === 'tech') score += 2;
            if (formData.get('degree') === 'yes') score += 2;
            if (formData.get('experience') === '5+') score += 2;
            if (formData.get('fee') === 'pay') { score += 1.5; } else { cost -= 20000; }
            const eligible = score >= 6;
            handleQuizComplete({ score: Math.round(score), cost, eligible });
          }}>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Offer?</label>
              <label className="flex items-center"><input type="radio" name="job" value="tech" className="mr-2" /> Tech/STEM</label>
              <label className="flex items-center"><input type="radio" name="job" value="other" className="mr-2" /> Other Skilled</label>
            </div>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Education?</label>
              <label className="flex items-center"><input type="radio" name="degree" value="yes" className="mr-2" /> Bachelor's+</label>
              <label className="flex items-center"><input type="radio" name="degree" value="no" className="mr-2" /> Equivalent</label>
            </div>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience?</label>
              <label className="flex items-center"><input type="radio" name="experience" value="5+" className="mr-2" /> 5+ Years</label>
              <label className="flex items-center"><input type="radio" name="experience" value="less" className="mr-2" /> Less</label>
            </div>
            <div className="border border-gray-200 rounded-md p-4 bg-yellow-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">2025 $100K Fee Impact?</label>
              <label className="flex items-center"><input type="radio" name="fee" value="pay" className="mr-2" /> Employer Can Pay</label>
              <label className="flex items-center"><input type="radio" name="fee" value="barrier" className="mr-2" /> Need Alternatives</label>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700">Calculate My Path</button>
          </form>
          {quizData.score > 0 && (
            <div className={`mt-6 p-4 rounded-lg ${quizData.eligible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h3 className="font-bold">{quizData.eligible ? 'Strong Eligibility!' : 'Room to Optimize'}</h3>
              <p>Score: {quizData.score}/10 | Est. Cost: ${quizData.cost.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}