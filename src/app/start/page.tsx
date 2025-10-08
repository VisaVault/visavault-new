'use client';
import React, { useMemo, useState } from 'react';
import Quiz from '@/components/Quiz';
import jsPDF from 'jspdf';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase';
import { USE_CASES, type VisaType } from '@/lib/checklists';
import { normalizeVisaType } from '@/lib/persistence';

// Local shape for quiz payload (we don’t import a type from Quiz)
interface LocalQuizResult {
  score: number;
  cost: number;
  eligible: boolean;
  // Quiz returns a human label (e.g., “Marriage Green Card”). We’ll normalize to slug.
  visaType: string;
}

// Base schema used across forms; extended per visa type (slugs)
const baseSchema = z.object({
  sponsorIncome: z.coerce.number().min(0, 'Income must be ≥ 0'),
  householdSize: z.coerce.number().min(1, 'Household size must be ≥ 1'),
  assets: z.coerce.number().min(0, 'Assets must be ≥ 0'),
  relationshipProof: z.string().optional(),
  petitionerName: z.string().min(2, 'Petitioner name required').optional(),
  beneficiaryName: z.string().min(2, 'Beneficiary name required').optional(),
  domicileUS: z.boolean().optional(), // I-864
  employmentDetails: z.string().optional(), // H1B context
});

const byVisaExtensions: Record<VisaType, z.ZodSchema<any>> = {
  'Marriage-Green-Card': baseSchema.extend({
    dateOfMarriage: z.string().min(4, 'Provide date of marriage (YYYY-MM-DD)'),
    cohabitationEvidence: z.string().min(2, 'Describe shared lease/mortgage or bills'),
  }),
  'K1-Fiance': baseSchema.extend({
    metInPerson: z.boolean().default(true),
    dateOfMeeting: z.string().min(4, 'Provide date of last in-person meeting'),
  }),
  'Removal-of-Conditions': baseSchema.extend({
    jointDocsSinceMarriage: z.string().min(2, 'Describe joint documents since marriage'),
  }),
  'Immigrant-Spouse': baseSchema.extend({
    priorMarriagesExplained: z.string().optional(),
  }),
  'Green-Card': baseSchema.extend({
    category: z.string().min(1, 'Category required (e.g., EB-2, EB-3, NIW)'),
  }),
  H1B: baseSchema.extend({
    employerName: z.string().min(2, 'Employer name required'),
    socCode: z.string().min(3, 'SOC code required'),
    wageLevel: z.string().min(1, 'Wage level required'),
  }),
};

type FormData = z.infer<typeof baseSchema> & Record<string, any>;

export default function Start() {
  const [quizData, setQuizData] = useState<LocalQuizResult | null>(null);
  const [email, setEmail] = useState('');
  const [affidavitDraft, setAffidavitDraft] = useState('');
  const [formData, setFormData] = useState<FormData>({
    sponsorIncome: 0,
    householdSize: 1,
    assets: 0,
    relationshipProof: '',
  });
  const [formProgress, setFormProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Normalize the human label from Quiz to our canonical slug for everything else.
  const visaTypeSlug: VisaType = useMemo(() => {
    const human = quizData?.visaType ?? 'Marriage Green Card';
    return normalizeVisaType(human) as VisaType; // e.g., “Marriage-Green-Card”
  }, [quizData]);

  const schema = useMemo(() => {
    return byVisaExtensions[visaTypeSlug] ?? baseSchema;
  }, [visaTypeSlug]);

  async function handleQuizComplete(data: LocalQuizResult) {
    setQuizData(data);
    setFormProgress(10);
    try {
      const supabase = createSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? 'anonymous';

      // Persist using slug so dashboard/checklists stay consistent
      await supabase.from('visa_apps').insert([
        {
          user_id: userId,
          visa_type: visaTypeSlug,
          score: data.score,
          cost_estimate: data.cost,
          status: data.eligible ? 'Eligible' : 'Needs Optimization',
          progress: 10,
          policy_notes: null,
        },
      ]);
    } catch {
      // non-blocking
    }
  }

  function handleFieldChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    let v: any = value;
    if (type === 'number') v = Number(value);
    if (type === 'checkbox') v = checked;
    setFormData((prev) => ({ ...prev, [name]: v }));
  }

  async function draftAffidavit() {
    if (!quizData) return;
    setLoading(true);
    setErr(null);
    try {
      schema.parse(formData);

      const suggestions: Record<VisaType, string> = {
        'Marriage-Green-Card':
          `For letters from friends/family: include full name, address, citizenship/immigration status, how they know the couple, specific shared experiences, dates, and any exhibits.`,
        'K1-Fiance':
          `Provide meeting history (dates/locations), intent to marry within 90 days, communications evidence, itineraries, and labeled photos.`,
        'Removal-of-Conditions':
          `Provide joint leases/mortgages, taxes filed jointly, children’s birth certificates if any, joint insurance/bills, and affidavits from friends.`,
        'Immigrant-Spouse':
          `Explain relationship timeline, include bona fide marriage evidence: joint finances, cohabitation, photos, affidavits.`,
        'Green-Card':
          `Provide employment letters, degrees, evaluations, prevailing wage evidence if applicable, and detailed experience letters.`,
        H1B:
          `Include LCA, SOC code and wage level, employer support letter (duties, specialty occupation), degree equivalency, client letters if applicable.`,
      };

      const prompt = [
        `Draft the strongest possible affidavit and filing packet guidance for ${USE_CASES[visaTypeSlug].title}.`,
        `Data: ${JSON.stringify(formData)}`,
        `Include:`,
        `- Sponsor narrative (I-864 where applicable), precise financial thresholds, and how assets can supplement income.`,
        `- Specific bullet list of supporting evidence to attach (mark Required vs Recommended).`,
        `- A template letter for friends/family with placeholders (name, address, status, relationship, anecdotes, dates).`,
        `- Red flags to avoid.`,
        `- Tone: precise, confident, USCIS-aligned. Return clean Markdown.`,
        `Contextual suggestions: ${suggestions[visaTypeSlug]}`,
      ].join('\n');

      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content:
                'You are Pop Immigration’s drafting assistant. Be accurate, concise, and produce immediately actionable checklists and narratives.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Drafting failed');
      setAffidavitDraft(data.answer || '');
      const next = Math.max(formProgress, 50);
      setFormProgress(next);

      // Save progress to latest visa_app
      try {
        const supabase = createSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id ?? 'anonymous';
        await supabase
          .from('visa_apps')
          .update({ progress: next })
          .eq('user_id', userId)
          .eq('visa_type', visaTypeSlug);
      } catch {
        // non-blocking
      }
    } catch (e: any) {
      setErr(e?.message || 'Validation or drafting failed');
    } finally {
      setLoading(false);
    }
  }

  function generatePDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const x = 40;
    let y = 40;

    doc.setFontSize(16);
    doc.text('Pop Immigration — Form & Affidavit Draft', x, y);
    y += 24;

    if (quizData) {
      doc.setFontSize(12);
      doc.text(`Path: ${USE_CASES[visaTypeSlug].title}`, x, y); y += 16;
      doc.text(`Score: ${quizData.score}/10`, x, y); y += 16;
      doc.text(`Est. Cost: $${quizData.cost.toLocaleString()}`, x, y); y += 24;
    }

    const lineA = `Sponsor Income: $${formData.sponsorIncome} | Household Size: ${formData.householdSize} | Assets: $${formData.assets}`;
    doc.text(lineA, x, y); y += 16;

    if (formData.relationshipProof) {
      const rp = `Relationship Proof: ${formData.relationshipProof}`;
      const rpLines = doc.splitTextToSize(rp, 532) as string[];
      rpLines.forEach((line: string) => {
        if (y > 730) { doc.addPage(); y = 40; }
        doc.text(line, x, y); y += 14;
      });
    }

    y += 12;
    doc.setFontSize(14);
    doc.text('Affidavit Draft:', x, y);
    y += 18;
    doc.setFontSize(11);
    const chunks = doc.splitTextToSize(affidavitDraft || '(Draft not available yet)', 532) as string[];
    chunks.forEach((line: string) => {
      if (y > 730) { doc.addPage(); y = 40; }
      doc.text(line, x, y); y += 14;
    });

    doc.save('popimmigration-packet.pdf');
    const next = Math.max(formProgress, 70);
    setFormProgress(next);
  }

  async function downloadRoadmap() {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    let y = 40;
    doc.setFontSize(16);
    doc.text('Pop Immigration — Personalized Roadmap', 40, y); y += 24;
    if (quizData) {
      doc.setFontSize(12);
      doc.text(`Path: ${USE_CASES[visaTypeSlug].title}`, 40, y); y += 16;
      doc.text(`Eligibility Score: ${quizData.score}/10`, 40, y); y += 16;
      doc.text(`Estimated Cost: $${quizData.cost.toLocaleString()}`, 40, y); y += 24;
      doc.text('Complete: same-day drafting, evidence coaching, mock interviews, and export-ready packets — thousands saved.', 40, y);
    }
    doc.save('popimmigration-roadmap.pdf');
  }

  // Use the new /api/stripe contract to jump to Complete tier checkout
  async function upgradeToComplete() {
    const res = await fetch('/api/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'case', tier: 'complete', successPath: '/dashboard', cancelPath: '/start' }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <div className="badge">Get started</div>
          <h1 className="font-display text-3xl font-semibold mt-2">Build your packet with guided workflows</h1>
          <p className="text-slate-700">Answer a few questions. We’ll tailor the path, draft narratives, and coach your evidence — same day.</p>
        </div>

        <Quiz onComplete={handleQuizComplete} />

        {quizData && (
          <>
            <div className="mt-8 p-6 bg-emerald-50 rounded-xl border border-emerald-200">
              <h2 className="text-2xl font-bold text-emerald-800 mb-2">
                Your Score: {quizData.score}/10 — {USE_CASES[visaTypeSlug].title}
              </h2>
              <p className="text-slate-700">
                Est. Cost: ${quizData.cost.toLocaleString()} • {quizData.eligible ? 'Strong readiness — start now.' : 'We’ll optimize your case.'}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="card p-3">
                  <div className="font-semibold">Key Advantages</div>
                  <ul className="text-sm text-slate-700 list-disc pl-4 mt-2">
                    <li>Same-day narratives for I-130/I-485/I-864 (as applicable)</li>
                    <li>Evidence coaching & translation flow</li>
                    <li>Mock interview practice with scoring</li>
                  </ul>
                </div>
                <div className="card p-3">
                  <div className="font-semibold">Avoid Pitfalls</div>
                  <ul className="text-sm text-slate-700 list-disc pl-4 mt-2">
                    <li>Missing items and mismatches</li>
                    <li>Slow human bottlenecks</li>
                    <li>$2,000–$5,000 agency markups</li>
                  </ul>
                </div>
                <div className="card p-3">
                  <div className="font-semibold">Proof of Progress</div>
                  <ul className="text-sm text-slate-700 list-disc pl-4 mt-2">
                    <li>Tasked checklist with due dates</li>
                    <li>Private storage with signed URLs</li>
                    <li>One-click export of your USCIS packet</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email for roadmap PDF"
                  className="w-full p-2 border rounded-md"
                />
                <button onClick={downloadRoadmap} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
                  Download Roadmap (Free)
                </button>
                <button onClick={upgradeToComplete} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                  Build with Complete — $299
                </button>
              </div>
              {err && <p className="text-red-600 mt-2">{err}</p>}
            </div>

            {/* Guided Form Prep & Affidavit Drafting */}
            <div className="mt-8 p-6 card">
              <h2 className="text-2xl font-bold mb-4">Guided Form Prep & Affidavit Drafting</h2>
              <p className="text-slate-700 mb-4">
                Enter details; we’ll draft I-130/I-485/I-864 narratives (as applicable) and a powerful affidavit with evidence checklists.
              </p>

              <div className="grid md:grid-cols-2 gap-3">
                <input type="number" name="sponsorIncome" placeholder="Sponsor Income ($)" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                <input type="number" name="householdSize" placeholder="Household Size" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                <input type="number" name="assets" placeholder="Assets ($)" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                <input type="text" name="petitionerName" placeholder="Petitioner Full Name" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                <input type="text" name="beneficiaryName" placeholder="Beneficiary Full Name" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
              </div>

              {visaTypeSlug === 'Marriage-Green-Card' && (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <input type="text" name="dateOfMarriage" placeholder="Date of Marriage (YYYY-MM-DD)" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                  <input type="text" name="cohabitationEvidence" placeholder="Shared lease/mortgage or bills (describe)" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                </div>
              )}

              {visaTypeSlug === 'K1-Fiance' && (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="metInPerson" onChange={handleFieldChange} />
                    Met in person within 2 years
                  </label>
                  <input type="text" name="dateOfMeeting" placeholder="Date of last in-person meeting" onChange={handleFieldChange} className="w-full p-2 border rounded-md" />
                </div>
              )}

              <textarea
                name="relationshipProof"
                placeholder="Relationship Proof – anecdotes, joint finances, photos (describe)"
                onChange={handleFieldChange}
                className="w-full p-2 border rounded-md mt-3"
              />

              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <button
                  onClick={draftAffidavit}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Drafting…' : 'Draft Affidavit & Evidence Plan'}
                </button>
                <button
                  onClick={generatePDF}
                  disabled={!affidavitDraft}
                  className="w-full bg-emerald-600 text-white py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  Download Packet PDF
                </button>
              </div>

              <p className="text-sm text-slate-600 mt-3">
                Progress: <strong>{formProgress}%</strong> — All drafts saved to your account. Canceling results in loss of storage and progress.
              </p>
              {err && <p className="mt-2 text-red-600">{err}</p>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
