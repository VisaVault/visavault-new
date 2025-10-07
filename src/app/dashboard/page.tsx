'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { USE_CASES, VisaType } from '@/lib/checklists';
import EvidenceUploader, { EvidenceUpload } from '@/components/EvidenceUploader';
import { createSupabaseClient } from '@/lib/supabase';
import {
  ensureTranslationTask,
  getLatestVisaApp,
  listEvidenceUploads,
  listTasks,
  seedTasksForVisaApp,
  setTaskStatus,
  upsertEvidenceUpload,
  getVisaAppMeta,
} from '@/lib/persistence';
import { Loader2 } from 'lucide-react';

type Task = {
  id: string;
  user_id: string;
  visa_app_id: string;
  title: string;
  evidence_id: string | null;
  status: 'todo' | 'waiting' | 'done';
  due_date: string | null;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [visaAppId, setVisaAppId] = useState<string | null>(null);
  const [visaType, setVisaType] = useState<VisaType>('H1B');
  const [uploads, setUploads] = useState<Record<string, EvidenceUpload>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [packetUrl, setPacketUrl] = useState<string | null>(null);

  const cfg = USE_CASES[visaType];

  useEffect(() => {
    (async () => {
      try {
        const app = await getLatestVisaApp();
        if (app) {
          setVisaAppId(app.id);
          setVisaType((app.visa_type as VisaType) || 'H1B');
        } else {
          setVisaAppId(null);
          setVisaType('H1B');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Seed tasks on first load
  useEffect(() => {
    (async () => {
      if (!visaAppId) return;
      await seedTasksForVisaApp(
        visaAppId,
        [
          ...cfg.evidence.map((e) => ({
            title: (e.required ? 'Upload (Required) ' : 'Upload (Recommended) ') + e.title,
            evidence_id: e.id
          })),
          { title: 'Book Mock Interview session' },
          { title: 'Review Forms Checklist' },
          { title: 'Generate USCIS packet' },
        ]
      );
      const fresh = await listTasks(visaAppId);
      setTasks(fresh as any);
    })();
  }, [visaAppId, cfg]);

  // Load saved evidence
  useEffect(() => {
    (async () => {
      if (!visaAppId) return;
      const saved = await listEvidenceUploads(visaAppId);
      const map: Record<string, EvidenceUpload> = {};
      for (const row of saved) {
        map[row.evidence_id] = {
          evidenceId: row.evidence_id,
          files: (row.files as any[]) || [],
          notes: row.notes || undefined,
          inEnglish: row.in_english ?? undefined,
          complete: !!row.complete,
        };
      }
      setUploads(map);
    })();
  }, [visaAppId]);

  const progressPct = useMemo(() => {
    const req = new Set(cfg.generationGates.requiredEvidenceIds);
    if (req.size === 0) return 0;
    let done = 0;
    for (const id of req) if (uploads[id]?.complete) done += 1;
    return Math.round((done / req.size) * 80);
  }, [cfg, uploads]);

  const formsReady = useMemo(() => {
    const req = cfg.generationGates.requiredEvidenceIds;
    return req.every((id) => uploads[id]?.complete);
  }, [cfg, uploads]);

  // Upload to storage (PRIVATE): bucket "evidence" with signed URL
  async function onUploadFile(file: File, evidenceId: string) {
    try {
      const supabase = createSupabaseClient();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id ?? 'anonymous';
      if (!visaAppId) return { name: file.name };

      const path = `${userId}/${visaAppId}/${evidenceId}/${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(path, file, { upsert: true });

      if (!error && data) {
        // Create a signed URL that expires (e.g., 7 days)
        const { data: signed } = await supabase.storage
          .from('evidence')
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        return {
          name: file.name,
          url: signed?.signedUrl, // keep for immediate preview/download
          path,                   // store path so we can re-sign later if needed
        };
      }
      return { name: file.name };
    } catch {
      return { name: file.name };
    }
  }

  async function handleChange(v: EvidenceUpload) {
    setUploads((prev) => ({ ...prev, [v.evidenceId]: v }));
    if (!visaAppId) return;

    await upsertEvidenceUpload({
      visa_app_id: visaAppId,
      evidence_id: v.evidenceId,
      files: v.files,
      notes: v.notes,
      in_english: v.inEnglish ?? null,
      complete: v.complete,
    });

    // If non-English and translation required: add Waiting task
    const ev = cfg.evidence.find((e) => e.id === v.evidenceId);
    if (ev?.requiresTranslationIfNotEnglish && v.inEnglish === false) {
      await ensureTranslationTask(visaAppId, v.evidenceId, `Order translation: ${ev.title}`);
      const fresh = await listTasks(visaAppId);
      setTasks(fresh as any);
    }
  }

  async function refreshTasks() {
    if (!visaAppId) return;
    const fresh = await listTasks(visaAppId);
    setTasks(fresh as any);
  }

  async function markTask(id: string, status: 'todo' | 'waiting' | 'done') {
    await setTaskStatus(id, status);
    await refreshTasks();
  }

  async function generatePacket() {
    try {
      if (!visaAppId) { setError('No active case.'); return; }
      setGenerating(true);
      setError(null);
      setPacketUrl(null);

      // Pull meta saved from Home (inputs + affidavitDraft)
      const meta = await getVisaAppMeta(visaAppId);
      const inputs = (meta?.inputs ?? {}) as Record<string, any>;
      const affidavit = (meta?.affidavitDraft ?? '') as string;

      if (!inputs || Object.keys(inputs).length === 0) {
        setError('Missing required inputs. Please complete AI Form Prep and press “Send to Dashboard” first.');
        setGenerating(false);
        return;
      }

      const res = await fetch('/api/forms/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visa_app_id: visaAppId,
          visa_type: visaType,
          inputs,
          affidavit: affidavit || '(Affidavit draft not provided yet.)',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate');

      setPacketUrl(data.url || null);
      const doneTask = tasks.find(t => /generate.*packet/i.test(t.title));
      if (doneTask) await markTask(doneTask.id, 'done');
    } catch (e: any) {
      setError(e?.message || 'Generation error');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[260px_1fr] gap-6">
      {/* Left rail: Tasks */}
      <aside className="bg-white rounded-xl shadow p-4 h-fit">
        <h3 className="font-semibold mb-3">Your Tasks</h3>

        <Section title="To-Do">
          {tasks.filter(t => t.status === 'todo').map(t => (
            <TaskRow key={t.id} t={t} onDone={() => markTask(t.id, 'done')} onWait={() => markTask(t.id, 'waiting')} />
          ))}
          {tasks.filter(t => t.status === 'todo').length === 0 && <p className="text-sm text-gray-500">All caught up.</p>}
        </Section>

        <Section title="Waiting on You">
          {tasks.filter(t => t.status === 'waiting').map(t => (
            <TaskRow key={t.id} t={t} onDone={() => markTask(t.id, 'done')} onTodo={() => markTask(t.id, 'todo')} />
          ))}
          {tasks.filter(t => t.status === 'waiting').length === 0 && <p className="text-sm text-gray-500">No blockers.</p>}
        </Section>

        <Section title="Completed">
          {tasks.filter(t => t.status === 'done').map(t => (
            <div key={t.id} className="flex items-center justify-between text-sm text-gray-600">
              <span>✓ {t.title}</span>
              <button onClick={() => markTask(t.id, 'todo')} className="underline">Reopen</button>
            </div>
          ))}
          {tasks.filter(t => t.status === 'done').length === 0 && <p className="text-sm text-gray-500">Nothing yet.</p>}
        </Section>

        <div className="text-xs text-gray-500 mt-3">
          We’ll email reminders ~7 days before due dates.
        </div>
      </aside>

      {/* Main content */}
      <section className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">{cfg.title} – Dashboard</h1>
            <p className="text-gray-600">Focused workspace tailored to your case.</p>
          </div>
          <div className="text-right">
            <div className="w-56 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-sm text-gray-600 mt-1">{progressPct}% complete</p>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Core Forms</h2>
          <ul className="list-disc pl-6 text-gray-700">
            {cfg.coreForms.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <p className="text-sm text-gray-500 mt-2">
            <strong>Required</strong> items must be completed; <strong>Recommended</strong> items significantly improve success.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Evidence Collection</h2>
          {cfg.evidence.map((ev) => (
            <div key={ev.id} className={`border-l-4 ${ev.required ? 'border-red-400' : 'border-amber-300'} rounded`}>
              <div className="px-4 py-1 text-xs uppercase tracking-wide text-gray-500">
                {ev.required ? 'Required' : 'Recommended'}
              </div>
              <div className="p-4 pt-2">
                <EvidenceUploader
                  evidenceId={ev.id}
                  title={ev.title}
                  description={ev.description}
                  needsLanguageChoice={ev.needsLanguageChoice}
                  requiresTranslationIfNotEnglish={ev.requiresTranslationIfNotEnglish}
                  onUploadFile={(file) => onUploadFile(file, ev.id)}
                  onChange={handleChange}
                />
              </div>
            </div>
          ))}
        </div>

        {/* What’s Next + Generate */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">What’s Next</h2>
          <ol className="list-decimal pl-6 text-gray-700 space-y-2">
            <li>Finish all <strong>Required</strong> items above.</li>
            <li>Upload <strong>Recommended</strong> evidence to maximize approval odds.</li>
            <li>Review your <a className="underline text-blue-700" href={`/forms/${visaType}`}>Forms Checklist</a>.</li>
            <li>Practice your <a className="underline text-purple-700" href="/mock-interview">Mock Interview</a>.</li>
            <li>Need a translation? <a className="underline text-green-700" href="/translate">Order certified translation ($49)</a>.</li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <button
              onClick={formsReady ? generatePacket : undefined}
              disabled={!formsReady || generating}
              className={`px-4 py-2 rounded text-white ${formsReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {generating ? 'Generating Packet…' : 'Generate Forms & Affidavits'}
            </button>

            {packetUrl && (
              <a
                href={packetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700"
              >
                Download USCIS Packet (PDF)
              </a>
            )}
          </div>

          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TaskRow({ t, onDone, onWait, onTodo }: { t: Task; onDone?: () => void; onWait?: () => void; onTodo?: () => void; }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <div className="font-medium">{t.title}</div>
        {t.due_date && <div className="text-xs text-gray-500">Due: {new Date(t.due_date).toLocaleDateString()}</div>}
      </div>
      <div className="flex gap-2">
        {onTodo && <button onClick={onTodo} className="underline">To-Do</button>}
        {onWait && <button onClick={onWait} className="underline">Wait</button>}
        {onDone && <button onClick={onDone} className="underline">Done</button>}
      </div>
    </div>
  );
}
