import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.JUKELINGO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'JUKELINGO_API_KEY missing' }, { status: 500 });
    }
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const targetLang = (form.get('targetLang') as string) || 'en';
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Example forward — replace URL with your JukeLingo endpoint
    const upstream = await fetch('https://api.jukelingo.com/v1/translate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form, // pass through multipart form with file
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Translate error' }, { status: 500 });
  }
}