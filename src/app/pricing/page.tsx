'use client';
import React from 'react';

function Plan({
  name,
  price,
  subtitle,
  features,
  highlight = false,
  ctaLabel,
  tier,
}: {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  highlight?: boolean;
  ctaLabel: string;
  tier: 'starter' | 'complete' | 'premium';
}) {
  async function checkout() {
    const res = await fetch('/api/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'case', tier, successPath: '/dashboard', cancelPath: '/pricing' }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }
  return (
    <div className={`rounded-2xl border ${highlight ? 'border-indigo-300 shadow-md' : 'border-slate-200'} bg-white p-6 flex flex-col`}>
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">{name}</div>
        {highlight && <div className="badge">Most Popular</div>}
      </div>
      <div className="mt-1 text-3xl font-display">{price}</div>
      <div className="text-slate-600 text-sm">{subtitle}</div>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {features.map((f) => <li key={f}>• {f}</li>)}
      </ul>
      <button onClick={checkout} className="btn btn-primary mt-6">{ctaLabel}</button>
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="badge">Transparent pricing</div>
        <h1 className="font-display text-4xl font-semibold mt-3">Choose your path</h1>
        <p className="text-slate-700 mt-2">
          Same-day workflows that save you thousands—without sacrificing quality.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Plan
          name="Starter Case"
          price="$149"
          subtitle="Core checklist, affidavit drafting, 30-day storage"
          features={[
            'Smart checklist (Required vs Recommended)',
            'Assisted affidavit & form narratives',
            'Evidence coaching prompts',
            'Document Translations flow (pay-as-you-go)',
            '30-day document storage',
          ]}
          ctaLabel="Start with Starter"
          tier="starter"
        />
        <Plan
          name="Complete Case"
          price="$299"
          subtitle="Everything in Starter + interview practice & validations"
          features={[
            'All Starter features',
            'Mock interview practice & feedback',
            'Smart validations & field checks',
            '2 Document Translations included',
            '90-day document storage',
            '1 human quality review',
          ]}
          highlight
          ctaLabel="Build with Complete"
          tier="complete"
        />
        <Plan
          name="Premium Case"
          price="$499"
          subtitle="Confidence at every step"
          features={[
            'All Complete features',
            '4 Document Translations included',
            '2 human quality reviews',
            'RFE readiness pass',
            'Priority support',
          ]}
          ctaLabel="Upgrade to Premium"
          tier="premium"
        />
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="font-semibold">Optional add-ons</div>
          <ul className="text-sm text-slate-700 mt-2 space-y-1">
            <li>• Mock Interview Pro — $49 (role-play drills & rubric)</li>
            <li>• Attorney Q&A (15 min) — $99–$149</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="font-semibold">FAQ</div>
          <ul className="text-sm text-slate-700 mt-2 space-y-2">
            <li><strong>What if my documents aren’t in English?</strong> Use our Document Translations flow. Complete includes 2 translations; Premium includes 4.</li>
            <li><strong>Do I lose drafts if I cancel?</strong> After your storage window (30 or 90 days), you’ll need the $19/month storage plan to keep documents accessible.</li>
            <li><strong>Do you file with USCIS?</strong> We prepare export-ready packets and guidance. You submit via USCIS or your attorney.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

