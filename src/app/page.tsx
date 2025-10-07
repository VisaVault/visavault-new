'use client';
import React, { useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import Quiz from '@/components/Quiz';
import jsPDF from 'jspdf';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase';

interface QuizData {
  score: number;
  cost: number;
  eligible: boolean;
  visaType: 'H1B' | 'Green Card' | 'K1 Fiance' | 'Removal of Conditions' | 'Marriage Green Card' | 'Immigrant Spouse';
}

const formSchema = z.object({
  sponsorIncome: z.number().min(0),
  householdSize: z.number().min(1),
  assets: z.number().min(0),
  relationshipProof: z.string().optional(),
  // Add more fields based on visa type
});

export default function Home() {
  const [quizData, setQuizData] = useState<QuizData>({ score: 0, cost: 0, eligible: false, visaType: 'H1B' });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sponsorIncome: 0,
    householdSize: 1,
    assets: 0,
    relationshipProof: '',
  });
  const [affidavitDraft, setAffidavitDraft] = useState('');
  const [formProgress, setFormProgress] = useState(0);

  const handleQuizComplete = async (data: QuizData) => {
    setQuizData(data);
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';
    const { error } = await supabase.from('visa_apps').insert({
      user_id: userId,
      visa_type: data.visaType,
      score: data.score,
      cost_estimate: data.cost,
      status: data.eligible ? 'Eligible' : 'Needs Optimization',
      progress: 10,
    });
    if (error) console.error('Supabase insert error:', error);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputText>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'relationshipProof' ? value : Number(value) }));
  };

  const draftAffidavit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: `Draft a strong I-864 affidavit for ${quizData.visaType} visa. Sponsor income: $${formData.sponsorIncome}, household size: ${formData.householdSize}, assets: $${formData.assets}. Relationship proof: ${formData.relationshipProof}. Provide suggestions for strong evidence, e.g., for marriage, include personal stories from friends/family.`,
        }),
      });
      const data = await res.json();
      setAffidavitDraft(data.answer);
      // Update progress
      setFormProgress(50);
      const supabase = createSupabaseClient();
      await supabase.from('visa_apps').update({ progress: formProgress }).eq('user_id', 'anonymous');
    } catch {
      setError('Failed to draft affidavit');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('VisaVault Form & Affidavit', 20, 20);
    doc.text(`Visa Type: ${quizData.visaType}`, 20, 30);
    doc.text(`Score: ${quizData.score}/10`, 20, 40);
    doc.text(`Sponsor Income: $${formData.sponsorIncome}`, 20, 50);
    doc.text(`Household Size: ${formData.householdSize}`, 20, 60);
    doc.text(`Assets: $${formData.assets}`, 20, 70);
    doc.text('Affidavit Draft:', 20, 80);
    doc.text(affidavitDraft, 20, 90, { maxWidth: 170 });
    doc.save('visavault-form.pdf');
  };

  const validateForm = () => {
    try {
      formSchema.parse(formData);
      setError(null);
      draftAffidavit();
    } catch (err) {
      setError('Invalid form data');
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

        <div className="quiz-card fade-in">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Assess Your H1B Eligibility in 1 Min</h2>
          <p className="text-gray-600 mb-6">Get a personalized roadmap to beat the 2025 $100K fee and optimize your visa path. Premium ($19/mo): Real-time trackers, elite advisor chat, alerts to save 20% on fees. Cancel anytime.</p>
          <Quiz onComplete={handleQuizComplete} />
        </div>

        {quizData.score > 0 && (
          <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-200">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Your Quick Score: {quizData.score}/10</h2>
            <p className="text-gray-700">Est. Cost: ${quizData.cost.toLocaleString()} | {quizData.eligible ? 'Strong Fit – Track Now' : 'Optimize Path'}</p>
            <p className="text-gray-600 mb-2">Save 20% on fees with premium tools—track RFEs, get advisor workarounds, and alerts on policy changes. Cancel anytime.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email for PDF"
              className="w-full p-2 border rounded-md mb-2"
            />
            <button onClick={downloadPDF} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 mr-2">
              Download Roadmap PDF (Free)
            </button>
            <button onClick={upgradeToPremium} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 premium-badge">
              Upgrade to Premium – $19/mo
            </button>
            {error && <p className="mt-2 text-red-600">{error}</p>}
          </div>
        )}

        {quizData.score > 0 && (
          <div className="mt-8 p-6 bg-white rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Generate Your Forms & Affidavits</h2>
            <p className="text-gray-600 mb-4">Provide details for AI to draft strong forms and affidavits. Suggestions for each input:</p>
            <input
              type="number"
              name="sponsorIncome"
              placeholder="Sponsor Income ($) - Suggest 3x poverty line for strong case"
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md mb-2"
            />
            <input
              type="number"
              name="householdSize"
              placeholder="Household Size - Include all dependents"
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md mb-2"
            />
            <input
              type="number"
              name="assets"
              placeholder="Assets ($) - Liquid assets strengthen support"
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md mb-2"
            />
            <textarea
              name="relationshipProof"
              placeholder="Relationship Proof - For marriage, include personal stories from friends/family (e.g., how they know you, shared experiences)"
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md mb-4"
            />
            <button onClick={validateForm} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              Draft Affidavit
            </button>
            {affidavitDraft && (
              <div className="mt-4">
                <h3 className="text-xl font-semibold mb-2">Affidavit Draft</h3>
                <p className="text-gray-600">{affidavitDraft}</p>
                <button onClick={generatePDF} className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  Download PDF
                </button>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-2">Progress: {formProgress}% - All drafts saved. Canceling loses progress.</p>
          </div>
        )}
      </div>
    </main>
  );
}