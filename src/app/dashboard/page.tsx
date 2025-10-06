'use client';
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import Papa from 'papaparse';
import VisaVaultAdvisor from '@/components/VisaVaultAdvisor';
import TranslationUpsell from '@/components/TranslationUpsell';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function Dashboard() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    const stripe = await stripePromise as Stripe;
    if (!stripe) return;
    const response = await fetch('/api/stripe', { method: 'POST', body: JSON.stringify({ priceId: 'price_1SFH0gEeFggzZnrOp4YdZCTJ' }) });
    const { sessionId } = await response.json();
    await stripe.redirectToCheckout({ sessionId });
    setLoading(false);
  };

  const exportReport = () => {
    const data = [
      { 'Quiz Score': '7/10', 'Est. Cost': '$105,000', 'Eligibility': 'Strong Fit', 'Next Steps': 'Submit I-129, monitor fees' },
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visavault-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-blue-900">Your Visa Dashboard</h1>
      
      <div className="premium-badge text-center py-4">
        🔒 Unlock Premium: Track Progress, AI Advice & Alerts – <button onClick={handleUpgrade} className="underline">Subscribe $19/mo</button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Your Roadmap</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-green-500">✓</span>
            <span className="text-green-800">Eligibility Confirmed</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400">✓</span>
            <span className="text-gray-600">Submit I-129 ($100K Fee)</span>
          </div>
        </div>
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Est. Cost: $105,000</p>
        </div>
      </div>

      <VisaVaultAdvisor />
      <TranslationUpsell />

      <div className="text-center">
        <button onClick={exportReport} className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700">
          Export Full Report
        </button>
      </div>
    </div>
  );
}