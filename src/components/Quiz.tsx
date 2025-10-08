'use client';
import React, { useMemo, useState } from 'react';

export type VisaType =
  | 'H1B'
  | 'Marriage Green Card'
  | 'K1 Fiance'
  | 'Removal of Conditions'
  | 'Immigrant Spouse'
  | 'Green Card';

interface QuizResult {
  score: number;
  cost: number;
  eligible: boolean;
  visaType: VisaType;
}

export default function Quiz({ onComplete }: { onComplete: (data: QuizResult) => void }) {
  const [visaType, setVisaType] = useState<VisaType>('Marriage Green Card');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const questions = useMemo(() => {
    switch (visaType) {
      case 'H1B':
        return [
          { id: 'degree', q: 'Do you have a bachelor’s degree or higher (or equivalent)?', opts: ['Yes', 'No'] },
          { id: 'offer', q: 'Do you have a valid specialty occupation job offer?', opts: ['Yes', 'No'] },
          { id: 'lca', q: 'Is the wage at or above the required level for your SOC code?', opts: ['Yes', 'No/Unsure'] },
          { id: 'timeline', q: 'Can your employer support same-day draft and filing coordination?', opts: ['Yes', 'No'] },
        ];
      case 'K1 Fiance':
        return [
          { id: 'met', q: 'Have you met in person within the last 2 years?', opts: ['Yes', 'No'] },
          { id: 'intent', q: 'Do you intend to marry within 90 days of entry?', opts: ['Yes', 'No'] },
          { id: 'proof', q: 'Do you have evidence of relationship (photos, chats, itineraries)?', opts: ['Strong', 'Limited'] },
          { id: 'support', q: 'Is the financial support sufficient (sponsor or joint sponsor)?', opts: ['Yes', 'No/Unsure'] },
        ];
      case 'Removal of Conditions':
        return [
          { id: 'joint', q: 'Do you maintain joint documentation (lease, taxes, insurance)?', opts: ['Strong', 'Limited'] },
          { id: 'timeline', q: 'Are you within the 90-day filing window?', opts: ['Yes', 'No/Unsure'] },
          { id: 'evidence', q: 'Can you provide affidavits from friends/family?', opts: ['Yes', 'No'] },
          { id: 'history', q: 'Any extended separations or complexities?', opts: ['No', 'Yes'] },
        ];
      case 'Immigrant Spouse':
      case 'Marriage Green Card':
        return [
          { id: 'married', q: 'Are you legally married and living together or maintaining joint finances?', opts: ['Yes', 'No'] },
          { id: 'sponsor', q: 'Is the sponsor income or assets sufficient?', opts: ['Yes', 'No/Unsure'] },
          { id: 'proof', q: 'Do you have relationship evidence (photos, leases, bills)?', opts: ['Strong', 'Limited'] },
          { id: 'language', q: 'Any non-English documents needing translation?', opts: ['No', 'Yes'] },
        ];
      case 'Green Card':
      default:
        return [
          { id: 'cat', q: 'Do you have a clear category (EB-2, EB-3, family, etc.)?', opts: ['Yes', 'No/Unsure'] },
          { id: 'docs', q: 'Do you have core documents (IDs, civil docs, degrees)?', opts: ['Strong', 'Limited'] },
          { id: 'work', q: 'Any employment letters or proof of eligibility ready?', opts: ['Yes', 'No'] },
          { id: 'timeline', q: 'Do you want a same-day draft of your packet?', opts: ['Yes', 'No'] },
        ];
    }
  }, [visaType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // simple scoring per visa path
    let score = 0;
    Object.values(answers).forEach((a) => {
      if (['Yes', 'Strong'].includes(a)) score += 3;
      if (['No', 'Limited', 'No/Unsure'].includes(a)) score += 1;
    });
    const eligible = score >= 8;

    // rough cost anchors per path (gov + typical prep)
    const baseCost = {
      'Marriage Green Card': 1800,
      'Immigrant Spouse': 1800,
      'K1 Fiance': 1500,
      'Removal of Conditions': 800,
      'H1B': 1200,
      'Green Card': 1600,
    }[visaType];

    setResult({ score, cost: baseCost, eligible, visaType });
    onComplete({ score, cost: baseCost, eligible, visaType });
  }

  return (
    <div className="card p-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-display font-semibold">Quick Assessment</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Target Path</label>
          <select
            value={visaType}
            onChange={(e) => { setVisaType(e.target.value as VisaType); setAnswers({}); setResult(null); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option>Marriage Green Card</option>
            <option>Immigrant Spouse</option>
            <option>K1 Fiance</option>
            <option>Removal of Conditions</option>
            <option>H1B</option>
            <option>Green Card</option>
          </select>
        </div>
      </div>

      <p className="text-slate-600 mt-1">
        Get a same-day, export-ready plan with guided workflows, evidence coaching, and affidavit drafting.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {questions.map(({ id, q, opts }) => (
          <div key={id} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium">{q}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {opts.map((o) => (
                <label key={o} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name={id}
                    value={o}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [id]: e.target.value }))}
                    checked={answers[id] === o}
                  />
                  <span className="text-sm">{o}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-primary w-full mt-2">Calculate Path</button>
      </form>

      {result && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="font-semibold text-emerald-800">Assessment: {result.eligible ? 'Strong fit' : 'Needs optimization'}</p>
          <p className="text-slate-700 text-sm">
            Score: {result.score}/12 • Estimated gov+prep costs: ${result.cost.toLocaleString()}
          </p>
          <p className="text-slate-600 text-sm mt-2">
            Upgrade to <strong>Complete</strong> for Smart Validations, Mock Interview scoring, one included human review, and 2 free Document Translations.
          </p>
        </div>
      )}
    </div>
  );
}
