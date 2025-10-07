// src/app/forms/[type]/page.tsx
import React from 'react';
import Link from 'next/link';
import { USE_CASES, VisaType } from '@/lib/checklists';
import { normalizeVisaType } from '@/lib/persistence';

// Keep this a Server Component (no "use client")
export const dynamic = 'force-static'; // ok to statically prerender
export const dynamicParams = true;

type Params = { type: string };

export function generateStaticParams() {
  return [
    { type: 'H1B' },
    { type: 'Marriage-Green-Card' },
    { type: 'K1-Fiance' },
    { type: 'Removal-of-Conditions' },
    { type: 'Immigrant-Spouse' },
    { type: 'Green-Card' },
  ];
}

// NOTE: Next.js 15 PageProps expects `params` can be a Promise.
// Make the component async and await it:
export default async function FormsTypePage(props: { params: Promise<Params> }) {
  const { type } = await props.params;
  const normalized = normalizeVisaType(type) as VisaType;
  const cfg = USE_CASES[normalized] ?? USE_CASES['H1B'];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-blue-900">{cfg.title} – Forms Checklist</h1>
      <p className="text-gray-600 mt-1">Everything you’ll need before generation.</p>

      <section className="bg-white rounded-xl shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-2">Core Forms</h2>
        <ul className="list-disc pl-6 text-gray-700">
          {cfg.coreForms.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-2">Evidence</h2>
        <div className="space-y-3">
          {cfg.evidence.map((ev) => (
            <div key={ev.id} className="border rounded p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {ev.required ? 'Required' : 'Recommended'}
              </div>
              <div className="font-medium">{ev.title}</div>
              <p className="text-gray-600 text-sm">{ev.description}</p>
              {ev.needsLanguageChoice && (
                <p className="text-xs text-amber-700 mt-1">
                  If not in English
                  {ev.requiresTranslationIfNotEnglish ? ', certified translation required.' : '.'}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          Ready to upload? Go to your{' '}
          <Link className="underline text-blue-700" href="/dashboard">
            Dashboard
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
