import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FROM = process.env.REMINDER_FROM_EMAIL || 'VisaForge <no-reply@yourdomain.com>';

export async function GET() {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });

    const supabase = createSupabaseClient();
    const now = new Date();
    const in7 = new Date(); in7.setDate(now.getDate() + 7);

    // Fetch tasks due within 7 days and not done
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'done')
      .lte('due_date', in7.toISOString());
    if (error) throw error;

    // Group by user + visa_app
    const byUser: Record<string, typeof tasks> = {};
    (tasks || []).forEach((t) => {
      byUser[t.user_id] = byUser[t.user_id] || [];
      byUser[t.user_id].push(t);
    });

    const resend = new Resend(resendApiKey);
    let sent = 0;

    for (const [user_id, list] of Object.entries(byUser)) {
      // Lookup email (either in users table or via auth user metadata if you store it there)
      const { data: users } = await supabase.from('users').select('email').eq('id', user_id).limit(1);
      const to = users?.[0]?.email;
      if (!to) continue;

      const lines = list.map((t) => `• ${t.title}${t.due_date ? ` (due ${new Date(t.due_date).toLocaleDateString()})` : ''}`).join('\n');
      const text = `Hi from VisaForge — upcoming items due:\n\n${lines}\n\nOpen your dashboard: https://YOUR_DOMAIN/dashboard\n\nYou’re close. Don’t lose your momentum!`;

      await resend.emails.send({
        from: FROM,
        to,
        subject: 'VisaForge – items due soon',
        text,
      });
      sent++;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}