// src/app/api/interview/feedback/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type JsonBody = {
  transcript?: string;
  answers?: string[]; // optional structured answers from the client UI
  promptContext?: string; // optional extra context
};

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

  // OpenAI SDK supports File directly in Node 18+ / Next API routes
  // Model: whisper-1 (speech → text)
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    // language: 'en', // optionally force language
    // response_format: 'json', // default returns .text
  });

  // SDK returns { text: string } or string depending on version; normalize either
  return normalizeTranscript(transcription as any);
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

    if (ctype.startsWith('multipart/form-data')) {
      const form = await req.formData();
      // Allow clients to send a pre-made transcript field too
      const pre = form.get('transcript');
      if (typeof pre === 'string' && pre.trim()) {
        transcript = pre.trim();
      } else {
        // No prefilled transcript? Try audio transcription
        transcript = await transcribeFromFormData(form, openai);
      }
      const answersRaw = form.get('answers');
      if (typeof answersRaw === 'string') {
        try { answers = JSON.parse(answersRaw); } catch {}
      }
      const ctxRaw = form.get('promptContext');
      if (typeof ctxRaw === 'string') promptContext = ctxRaw;
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
    }

    // If we still have nothing, bail early with a helpful message
    if (!transcript && (!answers || answers.length === 0)) {
      return NextResponse.json(
        { error: 'No transcript or answers provided. Send JSON with { transcript } or multipart with audio.' },
        { status: 400 }
      );
    }

    // Build a clean prompt for analysis & feedback
    const userTranscript = transcript || (answers || []).join('\n\n• ');
    const prompt = [
      'You are VisaForge Interview Coach, an elite immigration interview trainer.',
      'Give highly actionable, concise feedback on the following mock interview answers.',
      'Return sections:',
      '1) Overall score (0-100)',
      '2) Strengths (bullets)',
      '3) Risks & red flags (bullets)',
      '4) Targeted improvements (steps the user should practice)',
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

    return NextResponse.json({
      feedback,
      usedTranscript: Boolean(transcript),
      usedAnswers: Array.isArray(answers) && answers.length > 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Feedback analysis failed' }, { status: 500 });
  }
}