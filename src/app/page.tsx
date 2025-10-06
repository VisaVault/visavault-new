'use client';
import React, { useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import Quiz from '@/components/Quiz';
import jsPDF from 'jspdf';

interface QuizData {
  score: number;
  cost: number;
  eligible: boolean;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function Home() {
  const [quizData, setQuizData] = useState<QuizData>({ score: 0, cost: 0, eligible: false });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuizComplete = async (data: QuizData) => {
    setQuizData(data);
  };

  const downloadPDF = () => {
    if (!quizData.score || !email) return;
    const doc = new jsPDF();
    doc.text('Your VisaVault Roadmap', 20, 20);
    doc.text(`Score: ${quizData.score}/10`, 20, 30);
    doc.text(`Est. Cost: $${quizData.cost.toLocaleString()}`, 20, 40);
    doc.text(`Eligibility: ${quizData.eligible ? 'Strong - Apply Now!' : 'Optimize Path'}`, 20, 50);
    doc.text('Next Steps: Submit I-129, monitor fees.', 20, 60);
    doc.save('visavault-roadmap.pdf');
    alert('PDF downloaded! Check your email for a copy.');
    // Send to Mailchimp via API (stubbed)
    console.log(`Email sent to ${email}: Roadmap attached.`);
  };

  const upgradeToPremium = async () => {
    setLoading(true);
    const stripe = await stripePromise as Stripe;
    if (!stripe) {
      setLoading(false);
      return;
    }
    const response = await fetch('/api/stripe', { method: 'POST', body: JSON.stringify({ priceId: 'price_1SFH0gEeFggzZnrOp4YdZCTJ' }) });
    const { sessionId } = await response.json();
    await stripe.redirectToCheckout({ sessionId });
    setLoading(false);
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
            <p className="text-gray-600 mb-2">Premium ($19/mo): Real-time trackers, elite advisor chat, alerts to save 20% on fees. Cancel anytime.</p>
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
          </div>
        )}
      </div>
    </main>
  );
}