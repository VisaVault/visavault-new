'use client';
import React, { useState } from 'react';

interface QuizProps {
  onComplete: (data: {
    score: number;
    cost: number;
    eligible: boolean;
    visaType: 'H1B' | 'Marriage Green Card' | 'K1 Fiance' | 'Green Card' | 'Removal of Conditions' | 'Immigrant Spouse';
  }) => void;
}

const visaTypes = [
  'H1B',
  'Marriage Green Card',
  'K1 Fiance',
  'Green Card',
  'Removal of Conditions',
  'Immigrant Spouse',
] as const;

export default function Quiz({ onComplete }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; cost: number; eligible: boolean } | null>(null);
  const [visaType, setVisaType] = useState<typeof visaTypes[number]>('H1B');

  const questions = [
    { id: 'job', q: 'Job Offer?', opts: ['Tech/STEM (H1B Eligible)', 'Other Skilled'] },
    { id: 'degree', q: 'Education?', opts: ["Bachelor's+", 'Equivalent Experience'] },
    { id: 'experience', q: 'Experience?', opts: ['5+ Years', 'Less (EB-3 Path?)'] },
    { id: 'fee', q: '2025 $100K Fee Impact?', opts: ['Employer Can Pay', 'Barrier – Need Alternatives'] },
  ];

  const handleSubmit = () => {
    let score = 0;
    let cost = 105000;
    Object.values(answers).forEach((ans, i) => {
      if (ans.includes('Eligible') || ans.includes('Yes') || ans.includes('5+') || ans.includes('Pay')) score += (i < 3 ? 2 : 1.5);
    });
    const eligible = score >= 6;
    if (answers.fee?.includes('Barrier')) cost -= 20000;
    const payload = { score: Math.round(score), cost, eligible, visaType };
    setResult(payload);
    onComplete(payload);
  };

  return (
    <div className="quiz-card fade-in">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Eligibility & Path Selector</h2>
      <p className="text-gray-600 mb-6">Answer 4 questions and select your immigration path.</p>

      <label className="block text-sm font-medium text-gray-700 mb-2">Target Path (drives forms)</label>
      <select
        className="w-full border rounded-md p-2 mb-4"
        value={visaType}
        onChange={(e) => setVisaType(e.target.value as typeof visaTypes[number])}
      >
        {visaTypes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map(({ id, q, opts }) => (
          <div key={id} className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">{q}</label>
            {opts.map((opt, i) => (
              <label key={i} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                <input
                  type="radio"
                  name={id}
                  value={opt}
                  onChange={(e) => setAnswers({ ...answers, [id]: e.target.value })}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        ))}
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700">
          Calculate My Path
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-lg ${result.eligible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className="font-bold">{result.eligible ? 'Strong Eligibility!' : 'Room to Optimize'}</h3>
          <p>Score: {result.score}/10 | Est. Cost: ${result.cost.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}