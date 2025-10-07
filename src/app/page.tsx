'use client';
import React, { useMemo, useState } from 'react';
import Quiz from '@/components/Quiz';
import jsPDF from 'jspdf';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase';

// Keep these aligned with your Quiz's output
type VisaType =
  | 'H1B'
  | 'Marriage Green Card'
  | 'K1 Fiance'
  | 'Green Card'
  | 'Removal of Conditions'
  | 'Immigrant Spouse';

interface QuizData {
  score: number;
  cost: number;
  eligible: boolean;
  visaType: VisaType;
}

// Base schema used across forms; extended per visa type
const baseSchema = z.object({
  sponsorIncome: z.coerce.number().min(0, 'Income must be ≥ 0'),
  householdSize: z.coerce.number().min(1, 'Household size must be ≥ 1'),
  assets: z.coerce.number().min(0, 'Assets must be ≥ 0'),
  relationshipProof: z.string().optional(),
  petitionerName: z.string().min(2, 'Petitioner name required'),
  beneficiaryName: z.string().min(2, 'Beneficiary name required'),
  domicileUS: z.boolean().optional(), // I-864 context
  employmentDetails: z.string().optional(), // H1B context
});

const byVisaExtensions: Record<VisaType, z.ZodSchema<any>> = {
  'Marriage Green Card': baseSchema.extend({
    dateOfMarriage: z.string().min(4, 'Provide date of marriage (YYYY-MM-DD)'),
    cohabitationEvidence: z.string().min(2, 'Describe shared lease/mortgage or bills'),
  }),
  'K1 Fiance': baseSchema.extend({
    metInPerson: z.boolean().default(true),
    dateOfMeeting: z.string().min(4, 'Provide date of last in-person meeting'),
  }),
  'Removal of Conditions': baseSchema.extend({
    jointDocsSinceMarriage: z.string().min(2, 'Describe joint documents since marriage'),
  }),
  'Immigrant Spouse': baseSchema.extend({
    priorMarriagesExplained: z.string().optional(),
  }),
  'Green Card': baseSchema.extend({
    category: z.string().min(1, 'Category required (e.g., EB-2, EB-3)'),
  }),
  'H1B': baseSchema.extend({
    employerName: z.string().min(2, 'Employer name required'),
    socCode: z.string().min(3, 'SOC code required'),
    wageLevel: z.string().min(1, 'Wage level required'),
  }),
};

type FormData = z.infer<typeof baseSchema> & Record<string, any>;

export default function Home() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [email, setEmail] = useState('');
  const [affidavitDraft, setAffidavitDraft] = useState('');
  const [formData, setFormData] = useState<FormData>({
    sponsorIncome: 0,
    householdSize: 1,
    assets: 0,
    relationshipProof: '',
    petitionerName: '',
    beneficiaryName: '',
  });
  const [formProgress, setFormProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const schema = useMemo(() => {
    if (!quizData) return baseSchema;
    return byVisaExtensions[quizData.visaType] ?? baseSchema;
  }, [quizData]);

  const handleQuizComplete = async (data: QuizData) => {
    setQuizData(data);
    setFormProgress(10);
    try {
      const supabase = createSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? 'anonymous';

      // Create a fresh visa_app row for this user/session path.
      await supabase.from('visa_apps').insert([{
        user_id: userId,
        visa_type: data.visaType,
        score: data.score,
        cost_estimate: data.cost,
        status: data.eligible ? 'Eligible' : 'Needs Optimization',
        progress: 10,
        policy_notes: null,
      }]);
    } catch (e) {
      // non-blocking
      console.warn('Supabase insert warning', e);
    }
  };

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    // coerce numbers + booleans
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
        'Marriage Green Card':
          `For letters from friends/family: include full name, address, citizenship/immigration status, how they know the couple, specific shared experiences, dates, and references to photos/receipts.`,
        'K1 Fiance':
          `Show in-person meeting history (dates/locations), intent to marry within 90 days, communications logs, itineraries, photos with dates.`,
        'Removal of Conditions':
          `Include joint leases/mortgages, taxes filed jointly, children’s birth certificates if any, joint insurance/bills, affidavits.`,
        'Immigrant Spouse':
          `Timeline of relationship, bona fide marriage evidence: joint finances, cohabitation, photos with captions, affidavits.`,
        'Green Card':
          `Employment letters, degrees/evaluations, prevailing wage evidence if applicable, experience letters with duties/dates.`,
        'H1B':
          `LCA, SOC code & wage level, employer support letter (duties, specialty occupation), degree equivalency, client letters if third-party placement.`,
      };

      const prompt = [
        `Draft the strongest possible affidavit and filing packet guidance for ${quizData.visaType}.`,
        `Data: ${JSON.stringify(formData)}`,
        `Include:`,
        `- I-864 (if applicable) sponsor narrative, precise financial thresholds and how assets can supplement income.`,
        `- Specific bullet list of supporting evidence to attach.`,
        `- A template letter for friends/family with placeholders (name, address, status, relationship, detailed anecdotes, dates).`,
        `- Red flags to avoid.`,
        `- Tone: precise, confident, USCIS-aligned. Return clean Markdown.`,
        `Contextual suggestions: ${suggestions[quizData.visaType]}`,
      ].join('\n');

      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are VisaForge, an elite USCIS forms & affidavit drafting AI. Be accurate, concise, and give checklists that can be executed immediately.`,
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

      // save progress best-effort
      try {
        const supabase = createSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id ?? 'anonymous';
        await supabase
          .from('visa_apps')
          .update({ progress: next } as any)
          .eq('user_id', userId)
          .eq('visa_type', quizData.visaType);
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      setErr(e?.message || 'Validation or drafting failed');
    } finally {
      setLoading(false);
    }
  }

  function downloadPacketPreviewPDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const x = 40;
    let y = 40;

    doc.setFontSize(16);
    doc.text('VisaForge – Form & Affidavit Draft (Preview)', x, y);
    y += 24;

    if (quizData) {
      doc.setFontSize(12);
      doc.text(`Visa Type: ${quizData.visaType}`, x, y); y += 16;
      doc.text(`Score: ${quizData.score}/10`, x, y); y += 16;
      doc.text(`Est. Cost: $${quizData.cost.toLocaleString()}`, x, y); y += 24;
    }

    const header = `Sponsor Income: $${formData.sponsorIncome} | Household Size: ${formData.householdSize} | Assets: $${formData.assets}`;
    doc.text(header, x, y); y += 18;

    if (formData.relationshipProof) {
      const rp = `Relationship Proof: ${formData.relationshipProof}`;
const rpLines = doc.splitTextToSize(rp, 532) as string[];
rpLines.forEach((line: string) => {
  if (y > 730) { doc.addPage(); y = 40; }
  doc.text(line, x, y); y += 14;
});
      y += 6;
    }

    doc.setFontSize(14); doc.text('Affidavit Draft:', x, y); y += 18;
    doc.setFontSize(11);
    const chunks = doc.splitTextToSize(affidavitDraft || '(Draft not available yet)', 532) as string[];
chunks.forEach((line: string) => {
  if (y > 730) { doc.addPage(); y = 40; }
  doc.text(line, x, y); y += 14;
});
    doc.save('visaforge-packet-preview.pdf');

    const next = Math.max(formProgress, 70);
    setFormProgress(next);
  }

  async function downloadRoadmap() {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    let y = 40;
    doc.setFontSize(16);
    doc.text('VisaForge – Personalized Roadmap', 40, y); y += 24;
    if (quizData) {
      doc.setFontSize(12);
      doc.text(`Path: ${quizData.visaType}`, 40, y); y += 16;
      doc.text(`Eligibility Score: ${quizData.score}/10`, 40, y); y += 16;
      doc.text(`Estimated Cost: $${quizData.cost.toLocaleString()}`, 40, y); y += 24;
      doc.text('Get Premium for trackers, AI drafting, and progress saves.', 40, y);
    }
    doc.save('visaforge-roadmap.pdf');
  }

  async function upgradeToPremium() {
    // Keep your existing /api/stripe route & priceId
    const response = await fetch('/api/stripe', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_1SFH0gEeFggzZnrOp4YdZCTJ' }),
    });
    const { sessionId, error } = await response.json();
    if (error) { setErr(error); return; }
    // simple redirect
    window.location.href = `/dashboard?session_id=${sessionId}`;
  }

  async function sendToDashboard() {
    try {
      if (!quizData) return;
      setErr(null);

      // Validate current form with the selected schema
      (byVisaExtensions[quizData.visaType] ?? baseSchema).parse(formData);

      const supabase = createSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? 'anonymous';

      // Find the latest visa_app for this user (most recent)
      const { data: apps } = await supabase
        .from('visa_apps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      let appId = apps?.[0]?.id as string | undefined;

      // If none, create one now (ties meta to a proper record)
      if (!appId) {
        const { data: inserted } = await supabase
          .from('visa_apps')
          .insert([{
            user_id: userId,
            visa_type: quizData.visaType,
            score: quizData.score,
            status: 'In Progress',
            progress: 20,
            cost_estimate: quizData.cost,
            policy_notes: null,
          }])
          .select('*')
          .limit(1);
        appId = inserted?.[0]?.id;
      }

      if (!appId) {
        setErr('Could not create or find your case. Please try again.');
        return;
      }

      // Save inputs + affidavit into visa_apps.meta (cast to any to avoid TS error if your type file doesn’t yet include "meta")
      const meta = {
        inputs: {
          ...formData,
        },
        affidavitDraft,
        emailForPdf: email || null,
        visaType: quizData.visaType,
        savedAt: new Date().toISOString(),
      };

      await supabase
        .from('visa_apps')
        .update({ meta, progress: Math.max(formProgress, 60) } as any) // <-- 'as any' avoids TS error if 'meta' not in type yet
        .eq('id', appId);

      alert('Saved to Dashboard ✅  You can now open Dashboard and click “Generate Forms & Affidavits”.');
      setFormProgress((p) => Math.max(p, 60));
    } catch (e: any) {
      setErr(e?.message || 'Failed to save to dashboard');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">🛂 VisaForge</h1>
          <p className="text-xl text-gray-600 mb-4">
            AI-Powered Immigration Concierge (Forms, Affidavits, Translations, Mock Interviews)
          </p>
          <div className="flex justify-center space-x-4 text-sm text-blue-600">
            <span>USCIS-Aligned • Instant Drafts • Smart Validation</span>
          </div>
        </div>

        <Quiz onComplete={handleQuizComplete} />

        {quizData && (
          <>
            <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-200">
              <h2 className="text-2xl font-bold text-green-800 mb-2">Your Quick Score: {quizData.score}/10</h2>
              <p className="text-gray-700">
                Est. Cost: ${quizData.cost.toLocaleString()} • {quizData.eligible ? 'Strong Fit – Start Forms' : 'We’ll optimize your case'}
              </p>
              <p className="text-gray-600 mb-2">
                Premium ($19/mo): real-time trackers, AI affidavit drafting, translation integration, and interview prep. Cancel anytime.
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email for roadmap PDF (optional)"
                  className="w-full p-2 border rounded-md"
                />
                <button onClick={downloadRoadmap} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                  Download Roadmap (Free)
                </button>
                <button onClick={upgradeToPremium} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 premium-badge">
                  Upgrade – $19/mo
                </button>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">AI Form Prep & Affidavit Drafting</h2>
              <p className="text-gray-600 mb-4">
                Enter details; we’ll draft I-130/I-485/I-864 narratives (as applicable) and a powerful affidavit with evidence checklists.
              </p>

              {/* shared / core inputs */}
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  type="text"
                  name="petitionerName"
                  placeholder="Petitioner Full Name (Required)"
                  onChange={handleFieldChange}
                  className="w-full p-2 border rounded-md"
                />
                <input
                  type="text"
                  name="beneficiaryName"
                  placeholder="Beneficiary Full Name (Required)"
                  onChange={handleFieldChange}
                  className="w-full p-2 border rounded-md"
                />
                <input
                  type="number"
                  name="sponsorIncome"
                  placeholder="Sponsor Income ($) – Aim for 125% FPG (or assets)"
                  onChange={handleFieldChange}
                  className="w-full p-2 border rounded-md"
                />
                <input
                  type="number"
                  name="householdSize"
                  placeholder="Household Size – Include petitioner + dependents"
                  onChange={handleFieldChange}
                  className="w-full p-2 border rounded-md"
                />
                <input
                  type="number"
                  name="assets"
                  placeholder="Assets ($) – Liquid assets strengthen I-864"
                  onChange={handleFieldChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* visa-specific inputs */}
              {quizData.visaType === 'Marriage Green Card' && (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <input
                    type="text"
                    name="dateOfMarriage"
                    placeholder="Date of Marriage (YYYY-MM-DD)"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                  <input
                    type="text"
                    name="cohabitationEvidence"
                    placeholder="Shared lease/mortgage or bills (describe)"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {quizData.visaType === 'K1 Fiance' && (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="metInPerson" onChange={handleFieldChange} />
                    Met in person within 2 years
                  </label>
                  <input
                    type="text"
                    name="dateOfMeeting"
                    placeholder="Date of last in-person meeting"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {quizData.visaType === 'Green Card' && (
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <input
                    type="text"
                    name="category"
                    placeholder="Category (EB-2, EB-3, etc.)"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {quizData.visaType === 'H1B' && (
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                  <input
                    type="text"
                    name="employerName"
                    placeholder="Employer Name"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                  <input
                    type="text"
                    name="socCode"
                    placeholder="SOC Code (e.g., 15-1252)"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                  <input
                    type="text"
                    name="wageLevel"
                    placeholder="Wage Level (I-IV)"
                    onChange={handleFieldChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {/* shared textarea */}
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
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Drafting…' : 'Draft Affidavit & Evidence Plan'}
                </button>
                <button
                  onClick={downloadPacketPreviewPDF}
                  disabled={!affidavitDraft}
                  className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Download Packet Preview PDF
                </button>
                <button
                  onClick={sendToDashboard}
                  className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700"
                >
                  Send to Dashboard
                </button>
              </div>

              {affidavitDraft && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Affidavit Draft</h3>
                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 border rounded p-3">
                    {affidavitDraft}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-600 mt-3">
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
