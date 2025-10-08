import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

// Map topic to a team inbox, fallback to contact@
const TOPIC_TO_EMAIL: Record<string, string> = {
  partnerships: 'partnerships@popimmigration.com',
  press: 'press@popimmigration.com',
  support: 'support@popimmigration.com',
  general: 'contact@popimmigration.com',
};

export async function POST(req: Request) {
  try {
    const { name, email, topic, message } = await req.json();

    // Basic validation
    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required.' }, { status: 400 });
    }

    const to =
      TOPIC_TO_EMAIL[(topic || '').toLowerCase()] ??
      TOPIC_TO_EMAIL.general;

    const from = process.env.RESEND_FROM || 'Pop Immigration <no-reply@popimmigration.com>';

    const subject = `[Pop Contact] ${topic || 'General'} — ${name || 'Anonymous'}`;

    const text = [
      `Name: ${name || '(not provided)'}`,
      `Email: ${email}`,
      `Topic: ${topic || 'General'}`,
      '',
      'Message:',
      message,
    ].join('\n');

    // NOTE: replyTo must be camelCase for the current Resend SDK typings
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      replyTo: email,
      text,
    });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad request' }, { status: 400 });
  }
}