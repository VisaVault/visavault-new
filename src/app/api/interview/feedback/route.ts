// src/app/api/interview/feedback/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type JsonBody = {
  transcript?: string;
  answers?: string[];           // optional structured answers from client UI
  promptContext?: string;       // optional extra context
  visa_app_id?: string | null;  // <- provide to decrement credits
};

// --- Supabase Admin (service role) for server-side updates ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

// Normalize any possible transcription shape into a string
function normalizeTranscript(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'text' in (input as any)) {
    const t = (input as any).text;
    if (typeof t === 'string') return t;
  }
  return '';
}

async function transcribeFromFormData(form: FormData, openai: OpenAI): Promise<string> {
  const audio = form.get('audio');
  if (!audio || !(audio instanceof File)) return '';

  // Speech → text (Whisper)
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
  });

  return normalizeTranscript(transcription as any);
}

// Safely decrement mock interview credit for a given visa_app_id
async function decrementMockInterviewCredit(visa_app_id: string): Promise<number | null> {
  try {
    if (!supabaseAdmin || !visa_app_id) return null;

    // Load current meta
    const { data: rows, error: selErr } = await supabaseAdmin
      .from('visa_apps')
      .select('meta')
      .eq('id', visa_app_id)
      .limit(1);

    if (selErr || !rows?.length) return null;

    const meta = (rows[0]?.meta as any) || {};
    const usage = meta.usage || {};
    const remainingOrig = Number.isFinite(usage.mockInterviewCreditsRemaining)
      ? Number(usage.mockInterviewCreditsRemaining)
      : 0;
    const remaining = Math.max(0, remainingOrig - 1);

    const updatedMeta = {
      ...meta,
      usage: {
        ...usage,
        mockInterviewCreditsRemaining: remaining,
      },
      audit: {
        ...(meta.audit || {}),
        mockInterviewEvents: [
          ...((meta.audit?.mockInterviewEvents as any[]) || []),
          { type: 'used', at: new Date().toISOString() },
        ],
      },
      updatedAt: new Date().toISOString(),
    };

    const { error: upErr } = await supabaseAdmin
      .from('visa_apps')
      .update({ meta: updatedMeta })
      .eq('id', visa_app_id);

    if (upErr) return null;
    return remaining;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is missing' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // Decide payload mode by content type
    const ctype = req.headers.get('content-type') || '';
    let transcript = '';
    let answers: string[] | undefined = undefined;
    let promptContext: string | undefined = undefined;
    let visa_app_id: string | null | undefined = undefined;

    if (ctype.startsWith('multipart/form-data')) {
      const form = await req.formData();

      // Optional pre-made transcript
      const pre = form.get('transcript');
      if (typeof pre === 'string' && pre.trim()) {
        transcript = pre.trim();
      } else {
        transcript = await transcribeFromFormData(form, openai);
      }

      const answersRaw = form.get('answers');
      if (typeof answersRaw === 'string') {
        try { answers = JSON.parse(answersRaw); } catch {}
      }

      const ctxRaw = form.get('promptContext');
      if (typeof ctxRaw === 'string') promptContext = ctxRaw;

      const appIdRaw = form.get('visa_app_id');
      if (typeof appIdRaw === 'string' && appIdRaw.trim()) visa_app_id = appIdRaw.trim();
    } else {
      // JSON mode
      let body: JsonBody = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      transcript = normalizeTranscript(body.transcript);
      answers = Array.isArray(body.answers) ? body.answers : undefined;
      promptContext = typeof body.promptContext === 'string' ? body.promptContext : undefined;
      visa_app_id = typeof body.visa_app_id === 'string' ? body.visa_app_id : null;
    }

    // If we still have nothing, bail early with a helpful message
    if (!transcript && (!answers || answers.length === 0)) {
      return NextResponse.json(
        { error: 'No transcript or answers provided. Send JSON with { transcript } or multipart with audio.' },
        { status: 400 }
      );
    }

    // Build a clear prompt for analysis & feedback (avoid AI-heavy wording in UI; server-side name is fine)
    const userTranscript = transcript || (answers || []).join('\n\n• ');
    const prompt = [
      'You are Interview Coach. Provide elite immigration interview preparation feedback.',
      'Return sections:',
      '1) Overall score (0-100)',
      '2) Strengths (bullets)',
      '3) Risks & red flags (bullets)',
      '4) Targeted improvements (clear steps)',
      '5) Next practice questions (3-5)',
      '',
      promptContext ? `Context: ${promptContext}` : '',
      '',
      'Answers / Transcript:',
      userTranscript,
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'You are concise, practical, and accurate. Never fabricate law; focus on behavior, clarity, credibility, and consistency.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const feedback = completion.choices?.[0]?.message?.content ?? '';

    // Try to decrement a credit if we have an app id and admin client
    let remainingCredits: number | null = null;
    if (visa_app_id && supabaseAdmin) {
      remainingCredits = await decrementMockInterviewCredit(visa_app_id);
    }

    return NextResponse.json({
      feedback,
      usedTranscript: Boolean(transcript),
      usedAnswers: Array.isArray(answers) && answers.length > 0,
      creditsRemaining: remainingCredits, // null if not available or not decremented
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Feedback analysis failed' }, { status: 500 });
  }
}
