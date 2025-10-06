'use client';
import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import AIChat from '@/components/AIChat';
import TranslationUpsell from '@/components/TranslationUpsell';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function Dashboard() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApp();
    }
  }, [user]);

  const fetchApp = async () => {
    const { data } = await supabase.from('visa_apps').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1);
    setApp(data?.[0] || { status: 'New', progress: 0, cost_estimate: 105000 });
    setLoading(false);
  };

  const handleUpgrade = async () => {
    const stripe = await stripePromise;
    const response = await fetch('/api/stripe', { method: 'POST', body: JSON.stringify({ priceId: 'price_1SFH0gEeFggzZnrOp4YdZCTJ' }) });
    const { sessionId } = await response.json();
    await stripe!.redirectToCheckout({ sessionId });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-blue-900">Your Visa Dashboard</h1>
      
      {!isPremium ? (
        <div className="premium-badge text-center py-4">
          🔒 Unlock Premium: Track Progress, AI Advice & Alerts – <button onClick={handleUpgrade} className="underline">Subscribe $19/mo</button>
        </div>
      ) : (
        <div className="bg-green-50 p-4 rounded-lg text-center">✅ Premium Active – Welcome Back!</div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Your Roadmap</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className={app.score >= 6 ? 'text-green-500' : 'text-gray-400'}>✓</span>
            <span className={app.score >= 6 ? 'text-green-800' : 'text-gray-600'}>Eligibility Confirmed</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={app.status === 'Submitted' ? 'text-green-500' : 'text-gray-400'}>✓</span>
            <span className={app.status === 'Submitted' ? 'text-green-800' : 'text-gray-600'}>Submit I-129 ($100K Fee)</span>
          </div>
        </div>
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${app.progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Est. Cost: ${app.cost_estimate.toLocaleString()}</p>
        </div>
      </div>

      <AIChat />
      <TranslationUpsell />

      <div className="text-center">
        <button className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700">Export Full Report</button>
      </div>
    </div>
  );
}