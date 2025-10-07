// src/lib/persistence.ts
import { createSupabaseClient } from './supabase';
import type { Database } from '@/types/supabase';

/** Files we store inside evidence_uploads.files (private buckets). */
export type EvidenceFile = {
  name: string;
  /** A short-lived signed URL for immediate viewing/downloading (may be refreshed). */
  url?: string;
  /** The permanent storage path for the object (used to re-sign later). */
  path?: string;
};

// Normalize human-readable types (from Quiz/UI) to the canonical USE_CASES slugs used in /lib/checklists
// Slugs used by USE_CASES: 'H1B' | 'Marriage-Green-Card' | 'K1-Fiance' | 'Removal-of-Conditions' | 'Immigrant-Spouse' | 'Green-Card'
export function normalizeVisaType(input: string): string {
  const s = (input || '').toLowerCase().trim();
  // common user/quiz labels → slugs
  if (s === 'h1b') return 'H1B';
  if (s === 'marriage green card' || s === 'marriage-green-card' || s === 'marriage gc') return 'Marriage-Green-Card';
  if (s === 'k1 fiance' || s === 'k-1 fiance' || s === 'k1-fiancé' || s === 'k1') return 'K1-Fiance';
  if (s === 'removal of conditions' || s === 'roc' || s === 'removal-of-conditions') return 'Removal-of-Conditions';
  if (s === 'immigrant spouse' || s === 'spouse immigrant') return 'Immigrant-Spouse';
  if (s === 'green card' || s === 'employment-based' || s === 'employment') return 'Green-Card';
  // fallback to title case no spaces → hyphen
  return input.replace(/\s+/g, '-');
}

export async function getCurrentUserId(): Promise<string> {
  try {
    const supabase = createSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
}

/** Get the most recent visa app for the current user (any type). */
export async function getLatestVisaApp(): Promise<Database['public']['Tables']['visa_apps']['Row'] | null> {
  try {
    const supabase = createSupabaseClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('visa_apps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) console.warn('getLatestVisaApp error', error);
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Ensure a visa_app row exists for the given human-readable type (e.g., "Marriage Green Card").
 * Reuses the latest app if it matches the normalized type; otherwise inserts a new one.
 */
export async function ensureVisaApp(visa_type_human: string): Promise<Database['public']['Tables']['visa_apps']['Row'] | null> {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();
    const normalized = normalizeVisaType(visa_type_human);

    const { data: existing, error: selErr } = await supabase
      .from('visa_apps')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!selErr && existing && existing.length && normalizeVisaType(existing[0].visa_type) === normalized) {
      return existing[0] as any;
    }

    const { data: inserted, error } = await supabase
      .from('visa_apps')
      .insert([{
        user_id,
        visa_type: normalized,
        score: 0,
        status: 'In Progress',
        progress: 0,
        cost_estimate: 0,
        policy_notes: null,
        meta: null,
      }])
      .select('*')
      .limit(1);

    if (error) {
      console.warn('ensureVisaApp insert error', error);
      return existing?.[0] ?? null;
    }
    return inserted?.[0] ?? null;
  } catch (e) {
    console.warn('ensureVisaApp fail', e);
    return null;
  }
}

/** Upsert a single evidence_uploads row keyed by (user_id, visa_app_id, evidence_id). */
export async function upsertEvidenceUpload(input: {
  visa_app_id: string;
  evidence_id: string;
  files: EvidenceFile[]; // e.g., [{ name, url?, path? }]
  notes?: string;
  in_english?: boolean | null;
  complete?: boolean;
}) {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();

    const { error } = await supabase.from('evidence_uploads').upsert(
      {
        user_id,
        visa_app_id: input.visa_app_id,
        evidence_id: input.evidence_id,
        files: input.files as unknown as Database['public']['Tables']['evidence_uploads']['Row']['files'],
        notes: input.notes ?? null,
        in_english: input.in_english ?? null,
        complete: Boolean(input.complete),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,visa_app_id,evidence_id' }
    );
    if (error) console.warn('evidence upsert error', error);
  } catch (e) {
    console.warn('evidence upsert fail', e);
  }
}

/**
 * INTERNAL: Given a storage object path, mint a fresh signed URL (7 days).
 * Returns undefined if signing fails.
 */
async function signEvidencePath(path?: string): Promise<string | undefined> {
  if (!path) return undefined;
  try {
    const supabase = createSupabaseClient();
    const { data } = await supabase.storage
      .from('evidence')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    return data?.signedUrl;
  } catch {
    return undefined;
  }
}

/** Get all evidence_uploads for the current user & visa_app, re-signing any file URLs that need it. */
export async function listEvidenceUploads(visa_app_id: string) {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();

    const { data, error } = await supabase
      .from('evidence_uploads')
      .select('*')
      .eq('user_id', user_id)
      .eq('visa_app_id', visa_app_id);

    if (error) {
      console.warn('listEvidenceUploads error', error);
      return [];
    }
    if (!data) return [];

    // Re-sign any file that has a path but no (valid) URL.
    for (const row of data) {
      const files = (row.files as EvidenceFile[]) || [];
      let changed = false;

      for (const f of files) {
        const needsSigning =
          // missing URL
          !f.url ||
          // or URL that doesn't look like a web URL (very defensive)
          (typeof f.url === 'string' && !/^https?:\/\//i.test(f.url));

        if (f.path && needsSigning) {
          const fresh = await signEvidencePath(f.path);
          if (fresh) {
            f.url = fresh;
            changed = true;
          }
        }
      }

      if (changed) {
        // Best-effort persist refreshed URLs for smoother UX
        await supabase
          .from('evidence_uploads')
          .update({ files: files as any, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        (row as any).files = files;
      }
    }

    return data ?? [];
  } catch (e) {
    console.warn('listEvidenceUploads fail', e);
    return [];
  }
}

/**
 * One-click maintenance: Refresh signed URLs for every file in a case.
 * Useful if a user returns after links expired.
 */
export async function refreshEvidenceSignedUrls(visa_app_id: string): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();

    const { data } = await supabase
      .from('evidence_uploads')
      .select('id, files')
      .eq('user_id', user_id)
      .eq('visa_app_id', visa_app_id);

    if (!data || !data.length) return;

    for (const row of data) {
      const files = (row.files as EvidenceFile[]) || [];
      let changed = false;

      for (const f of files) {
        if (f.path) {
          const fresh = await signEvidencePath(f.path);
          if (fresh) {
            f.url = fresh;
            changed = true;
          }
        }
      }

      if (changed) {
        await supabase
          .from('evidence_uploads')
          .update({ files: files as any, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }
    }
  } catch (e) {
    console.warn('refreshEvidenceSignedUrls fail', e);
  }
}

// ---------------- TASKS ----------------

export async function seedTasksForVisaApp(
  visa_app_id: string,
  items: Array<{ title: string; evidence_id?: string | null }>
) {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();

    // If tasks exist, skip seed
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user_id)
      .eq('visa_app_id', visa_app_id)
      .limit(1);
    if (existing && existing.length) return;

    const due = new Date();
    due.setDate(due.getDate() + 7);
    const rows = items.map((i) => ({
      user_id,
      visa_app_id,
      title: i.title,
      evidence_id: i.evidence_id ?? null,
      status: 'todo' as const,
      due_date: due.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('tasks').insert(rows);
  } catch (e) {
    console.warn('seed tasks fail', e);
  }
}

export async function listTasks(visa_app_id: string) {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user_id)
      .eq('visa_app_id', visa_app_id)
      .order('created_at', { ascending: true });
    if (error) console.warn('listTasks error', error);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function setTaskStatus(task_id: string, status: 'todo' | 'waiting' | 'done') {
  try {
    const supabase = createSupabaseClient();
    await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', task_id);
  } catch (e) {
    console.warn('task update fail', e);
  }
}

/** When an evidence item is non-English & requires translation, ensure a "translation" task exists (Waiting on You). */
export async function ensureTranslationTask(visa_app_id: string, evidence_id: string, title: string) {
  try {
    const supabase = createSupabaseClient();
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user_id)
      .eq('visa_app_id', visa_app_id)
      .eq('evidence_id', evidence_id)
      .limit(1);

    if (error) console.warn('ensureTranslationTask select error', error);
    if (data && data.length) return;

    const due = new Date();
    due.setDate(due.getDate() + 7);
    await supabase.from('tasks').insert({
      user_id,
      visa_app_id,
      evidence_id,
      title,
      status: 'waiting',
      due_date: due.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('ensure translation task fail', e);
  }
}

// ---------------- META (inputs + affidavit) ----------------

/** Get meta (inputs + affidavit) from visa_apps row. */
export async function getVisaAppMeta(visa_app_id: string): Promise<any | null> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('visa_apps')
      .select('meta')
      .eq('id', visa_app_id)
      .limit(1);
    if (error) console.warn('getVisaAppMeta error', error);
    return data?.[0]?.meta ?? null;
  } catch {
    return null;
  }
}

/** Update visa_apps.meta */
export async function upsertVisaAppMeta(visa_app_id: string, meta: any): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    await supabase.from('visa_apps').update({ meta }).eq('id', visa_app_id);
  } catch {
    // ignore
  }
}
