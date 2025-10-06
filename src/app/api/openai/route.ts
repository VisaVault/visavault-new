import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: OPENAI_API_KEY is missing' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    const answer = completion.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('OpenAI error:', err.message, err.code, err.status);
    return NextResponse.json(
      { error: `Failed to fetch OpenAI response: ${err.message}` },
      { status: err.status || 500 }
    );
  }
}