// src/app/api/forms/generate/route.ts
import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseClient } from '@/lib/supabase';
import { USE_CASES } from '@/lib/checklists';
import type { VisaType } from '@/lib/checklists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Body = {
  visa_app_id: string;
  visa_type: VisaType;
  inputs: Record<string, any>;
  affidavit: string; // Markdown/Plain text
};

function wrapText(text: string, maxLen = 96) {
  const lines: string[] = [];
  const words = (text || '').replace(/\r/g, '').split(/\s+/);
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxLen) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line ? line + ' ' : '') + w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { visa_app_id, visa_type, inputs, affidavit } = body || ({} as Body);
    if (!visa_app_id || !visa_type) {
      return NextResponse.json({ error: 'visa_app_id and visa_type are required' }, { status: 400 });
    }
    const cfg = USE_CASES[visa_type];
    if (!cfg) {
      return NextResponse.json({ error: 'Unknown visa_type' }, { status: 400 });
    }

    // Identify current user from anon client (for path prefix)
    const supabase = createSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? null;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Gate: required inputs
    const missingInputs = (cfg.generationGates.requiredInputs || []).filter((k) => {
      const v = inputs?.[k];
      return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    });
    if (missingInputs.length > 0) {
      return NextResponse.json({ error: `Missing required inputs: ${missingInputs.join(', ')}` }, { status: 400 });
    }

    // Load evidence to verify required are complete
    const { data: evidenceRows, error: evErr } = await supabase
      .from('evidence_uploads')
      .select('*')
      .eq('user_id', userId)
      .eq('visa_app_id', visa_app_id);

    if (evErr) {
      return NextResponse.json({ error: `DB error: ${evErr.message}` }, { status: 500 });
    }

    const evidenceMap: Record<string, any> = {};
    for (const r of (evidenceRows || [])) evidenceMap[r.evidence_id] = r;

    const missingRequiredEvidence = (cfg.generationGates.requiredEvidenceIds || []).filter(
      (id) => !evidenceMap[id]?.complete
    );
    if (missingRequiredEvidence.length > 0) {
      return NextResponse.json(
        { error: `Required evidence incomplete: ${missingRequiredEvidence.join(', ')}` },
        { status: 400 }
      );
    }

    // Build packet PDF (cover + evidence index + affidavit)
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    function addPageTitle(title: string) {
      const page = pdf.addPage([612, 792]); // Letter
      page.setFont(fontBold);
      page.setFontSize(18);
      page.drawText(title, { x: 50, y: 740 });
      return page;
    }

    // Cover
    let p = addPageTitle('VisaForge – USCIS Packet');
    p.setFont(font);
    p.setFontSize(12);
    let y = 710;

    const keyLines = [
      `Path: ${cfg.title}`,
      `Core Forms: ${cfg.coreForms.join(', ')}`,
      `Generated: ${new Date().toLocaleString()}`,
    ];
    keyLines.forEach((ln) => {
      p.drawText(ln, { x: 50, y });
      y -= 16;
    });

    y -= 10;
    p.setFont(fontBold);
    p.drawText('Applicant Details', { x: 50, y });
    y -= 16;
    p.setFont(font);

    const detailPairs = Object.entries(inputs)
      .filter(([_, v]) => typeof v !== 'object' && v !== '')
      .slice(0, 40);
    for (const [k, v] of detailPairs) {
      const s = `${k}: ${String(v)}`.slice(0, 110);
      p.drawText(s, { x: 50, y });
      y -= 14;
      if (y < 60) {
        p = addPageTitle('Applicant Details (cont.)');
        p.setFont(font);
        p.setFontSize(12);
        y = 710;
      }
    }

    // Evidence Index
    p = addPageTitle('Evidence Index');
    p.setFont(font);
    p.setFontSize(12);
    y = 710;

    const allEv = cfg.evidence.map((e) => ({
      id: e.id,
      title: e.title,
      required: e.required,
      present: !!evidenceMap[e.id],
      complete: !!evidenceMap[e.id]?.complete,
      inEnglish: evidenceMap[e.id]?.in_english,
      files: (evidenceMap[e.id]?.files as Array<{ name: string; url?: string }>) || [],
      notes: evidenceMap[e.id]?.notes || '',
    }));

    for (const ev of allEv) {
      const tag = ev.required ? '[Required]' : '[Recommended]';
      const status = ev.complete ? 'Complete' : ev.present ? 'In progress' : 'Missing';
      const head = `${tag} ${ev.title} — ${status}`;
      p.drawText(head.slice(0, 96), { x: 50, y });
      y -= 14;

      if (ev.inEnglish === false) {
        p.drawText('• Needs certified translation', { x: 60, y });
        y -= 14;
      }
      if (ev.files.length) {
        p.drawText(`• Files: ${ev.files.map((f) => f.name).join(', ').slice(0, 96)}`, { x: 60, y });
        y -= 14;
      }
      if (ev.notes) {
        const noteLines = wrapText(`• Notes: ${ev.notes}`, 96);
        for (const ln of noteLines) {
          p.drawText(ln, { x: 60, y });
          y -= 14;
          if (y < 60) {
            p = addPageTitle('Evidence Index (cont.)');
            p.setFont(font);
            p.setFontSize(12);
            y = 710;
          }
        }
      }
      y -= 6;
      if (y < 60) {
        p = addPageTitle('Evidence Index (cont.)');
        p.setFont(font);
        p.setFontSize(12);
        y = 710;
      }
    }

    // Affidavit
    p = addPageTitle('Affidavit & Narratives');
    p.setFont(font);
    p.setFontSize(12);
    y = 710;
    const affidavitLines = wrapText(affidavit || '(No affidavit content)');
    for (const ln of affidavitLines) {
      p.drawText(ln, { x: 50, y });
      y -= 14;
      if (y < 60) {
        p = addPageTitle('Affidavit (cont.)');
        p.setFont(font);
        p.setFontSize(12);
        y = 710;
      }
    }

    const bytes = await pdf.save(); // Uint8Array
    // ✅ Node-friendly body for Supabase Storage:
    const buffer = Buffer.from(bytes); // Convert Uint8Array -> Buffer

    // Upload using admin client (private bucket)
    const admin = createSupabaseAdmin();
    const path = `${userId}/${visa_app_id}/packet-${Date.now()}.pdf`;

    const { error: upErr } = await admin.storage
      .from('packets')
      .upload(path, buffer, {
        upsert: true,
        contentType: 'application/pdf',
      });
    if (upErr) {
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }

    // Create a signed URL (e.g., 7 days)
    const { data: signed, error: signErr } = await admin.storage
      .from('packets')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr) {
      return NextResponse.json({ error: `Failed to create signed URL: ${signErr.message}` }, { status: 500 });
    }

    // Optionally mark a task as done
    await supabase
      .from('tasks')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('visa_app_id', visa_app_id)
      .ilike('title', '%packet%');

    return NextResponse.json({ url: signed?.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 });
  }
}
