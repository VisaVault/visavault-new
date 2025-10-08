'use client';
import React from 'react';

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="badge">Our approach</div>
        <h1 className="font-display text-4xl font-semibold mt-3">Built for speed, clarity, and quality</h1>
        <p className="text-slate-700 mt-4">
          Pop Immigration exists to remove the uncertainty and delays from immigration preparation.
          We combine guided workflows, assisted drafting, and clear validation into one smooth experience—so you can submit with confidence.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="card p-5">
            <div className="font-semibold">What we do</div>
            <ul className="text-sm text-slate-700 mt-2 space-y-1">
              <li>• Smart checklists and evidence guidance</li>
              <li>• Assisted affidavit & form narratives</li>
              <li>• Document translations flow</li>
              <li>• Mock interview practice & feedback</li>
              <li>• Export-ready packets</li>
            </ul>
          </div>
          <div className="card p-5">
            <div className="font-semibold">What we don’t do</div>
            <ul className="text-sm text-slate-700 mt-2 space-y-1">
              <li>• We are not a law firm and do not provide legal advice</li>
              <li>• We don’t guarantee outcomes with USCIS</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 mt-8">
          <div className="text-xl font-semibold">Why Pop?</div>
          <p className="text-slate-700 mt-2">
            No jargon. No inflated fees. Just guided, same-day workflows that get you from “I don’t know where to start” to “ready to submit.”
          </p>
        </div>
      </div>
    </div>
  );
}
