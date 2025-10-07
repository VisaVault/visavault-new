import React from 'react';
import Link from 'next/link';
import { USE_CASES } from '@/lib/checklists';

export const dynamic = 'force-static';
export const revalidate = 3600;

export default function FormsIndex() {
  const entries = Object.entries(USE_CASES);
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">Form Checklists</h1>
      <p className="text-gray-600 mb-6">Pick your path to view forms and evidence checklist.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {entries.map(([slug, cfg]) => (
          <Link key={slug} href={`/forms/${slug}`} className="block bg-white rounded-xl shadow p-6 hover:shadow-md">
            <h2 className="text-xl font-semibold">{cfg.title}</h2>
            <p className="text-gray-600 mt-1">{cfg.coreForms.join(' • ')}</p>
            <div className="mt-2 text-sm text-blue-700 underline">Open checklist →</div>
          </Link>
        ))}
      </div>
    </main>
  );
}