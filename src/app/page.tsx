'use client';
import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="badge">Same-day, guided workflows</div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold mt-4 tracking-tight">
                Build your USCIS packet with clarity and confidence
              </h1>
              <p className="text-slate-700 mt-4 text-lg">
                Pop Immigration helps you prepare forms, affidavits, evidence, document translations, and mock interviews—without delays or
                inflated fees.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/start" className="btn btn-primary">Start now</Link>
                <Link href="/pricing" className="btn btn-secondary">See pricing</Link>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                No “AI” buzzwords—just guided, assisted workflows that feel like a concierge by your side.
              </div>
            </div>
            <div className="flex-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-sm text-slate-600">What you get</div>
                <ul className="mt-3 space-y-2 text-slate-800">
                  <li>• Smart checklists (Required vs Recommended)</li>
                  <li>• Assisted affidavit & form narratives (I-130, I-485, I-864)</li>
                  <li>• Document translations flow</li>
                  <li>• Mock interview practice & feedback</li>
                  <li>• Export-ready packet PDFs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof & trust strip */}
      <section className="container mx-auto px-4 pb-10">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="text-xl font-semibold">Same-day prep</div>
            <p className="text-slate-600 mt-2 text-sm">No waiting weeks. Build and export your packet today.</p>
          </div>
          <div className="card p-6">
            <div className="text-xl font-semibold">Save thousands</div>
            <p className="text-slate-600 mt-2 text-sm">Avoid $2,000–$5,000 agency markups and preserve your budget.</p>
          </div>
          <div className="card p-6">
            <div className="text-xl font-semibold">Clear guidance</div>
            <p className="text-slate-600 mt-2 text-sm">Always know what’s required vs recommended—no guesswork.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-10 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="text-2xl font-display font-semibold">Ready to build your case?</div>
            <div className="text-slate-700 mt-1">Start with your use case and finish with an export-ready packet.</div>
          </div>
          <div className="flex gap-3">
            <Link href="/start" className="btn btn-primary">Start now</Link>
            <Link href="/pricing" className="btn btn-secondary">Pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
