// src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Tier = 'starter' | 'complete' | 'premium';

function defaultEntitlementsForTier(tier: Tier) {
  if (tier === 'premium') return { qaIncluded: 2, translationsIncluded: 4, validations: true, mockInterviewPro: true, mockInterviewsIncluded: 2 };
  if (tier === 'complete') return { qaIncluded: 1, translationsIncluded: 2, validations: true, mockInterviewPro: true, mockInterviewsIncluded: 1 };
  return { qaIncluded: 0, translationsIncluded: 0, validations: false, mockInterviewPro: false, mockInterviewsIncluded: 0 };
}
function defaultStorageDaysForTier(tier: Tier) {
  if (tier === 'premium') return 90;
  if (tier === 'complete') return 90;
  return 30;
}

const asInt = (v: any, fallback: number) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};
const asBool = (v: any, fallback: boolean) => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').toLowerCase().trim();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
};
const normalizeTier = (t: any): Tier => {
  const s = String(t ?? '').toLowerCase();
  return (['starter', 'complete', 'premium'] as Tier[]).includes(s as Tier) ? (s as Tier) : 'starter';
};

// --- helpers ---
async function ensureUserByEmail(email: string): Promise<string | null> {
  const { data: hit, error: qErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('email', email)
    .limit(1);
  if (qErr) return null;
  if (hit?.length) return hit[0].id;

  const { data: ins, error: iErr } = await supabaseAdmin
    .from('users')
    .insert([{ email }])
    .select('id')
    .limit(1);
  if (iErr || !ins?.length) return null;
  return ins[0].id;
}

async function findOrCreateVisaApp(user_id: string, preferredVisaType?: string | null): Promise<string | null> {
  if (preferredVisaType) {
    const { data: byType } = await supabaseAdmin
      .from('visa_apps')
      .select('id, created_at')
      .eq('user_id', user_id)
      .ilike('visa_type', preferredVisaType)
      .order('created_at', { ascending: false })
      .limit(1);
    if (byType?.length) return byType[0].id;
  }
  const { data: latest } = await supabaseAdmin
    .from('visa_apps')
    .select('id, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (latest?.length) return latest[0].id;

  const { data: ins, error: insErr } = await supabaseAdmin
    .from('visa_apps')
    .insert([{
      user_id,
      visa_type: preferredVisaType || 'H1B',
      score: 0,
      status: 'In Progress',
      progress: 0,
      cost_estimate: 0,
      policy_notes: null,
      meta: {},
    }])
    .select('id')
    .limit(1);
  if (insErr || !ins?.length) return null;
  return ins[0].id;
}

// Narrow Stripe's Customer/DeletedCustomer (and Response<...>) safely.
async function getEmailFromCustomerRef(
  ref: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<string> {
  if (!ref) return '';

  // If we have an ID string, retrieve first.
  if (typeof ref === 'string') {
    const resp = await stripe.customers.retrieve(ref);
    // stripe-node returns a "Response<T>" which spreads into the object plus "lastResponse".
    const cust = resp as Stripe.Customer | Stripe.DeletedCustomer;
    if ('deleted' in cust && cust.deleted) return '';
    return (cust as Stripe.Customer).email ?? '';
  }

  // Already an object (maybe expanded on session)
  const cust = ref as Stripe.Customer | Stripe.DeletedCustomer;
  if ('deleted' in cust && cust.deleted) return '';
  return (cust as Stripe.Customer).email ?? '';
}

export async function POST(req: Request) {
  try {
    const sig = req.headers.get('stripe-signature');
    if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });

    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ ok: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // ✅ Safely resolve email using the helper (no direct ".email" on retrieve())
    const email =
      session.customer_details?.email ||
      (await getEmailFromCustomerRef(session.customer)) ||
      '';

    if (!email) {
      return NextResponse.json({ error: 'No customer email on session' }, { status: 400 });
    }

    const user_id = await ensureUserByEmail(email);
    if (!user_id) return NextResponse.json({ error: 'Could not link Stripe customer to user' }, { status: 500 });

    // Your metadata
    const md = session.metadata || {};
    const tier = normalizeTier(md.tier);
    const defaults = defaultEntitlementsForTier(tier);

    const translationsIncluded = asInt(md.translationsIncluded, defaults.translationsIncluded);
    const qaIncluded = asInt(md.qaIncluded, defaults.qaIncluded);
    const storageDays = asInt(md.storageDays, defaultStorageDaysForTier(tier));
    const rfeReadiness = asBool(md.rfeReadiness, false);
    const expedited = asBool(md.Expedited, false);
    const mockInterviewsIncluded = asInt(md.mockInterviewsIncluded, defaults.mockInterviewsIncluded);
    const visaTypeFromMeta = md.visaType || null;

    const visa_app_id = await findOrCreateVisaApp(user_id, visaTypeFromMeta);
    if (!visa_app_id) return NextResponse.json({ error: 'Failed to resolve visa app' }, { status: 500 });

    // Load existing meta
    const { data: appRows } = await supabaseAdmin
      .from('visa_apps')
      .select('meta')
      .eq('id', visa_app_id)
      .limit(1);
    const existingMeta = (appRows?.[0]?.meta as any) || {};

    // Merge entitlements
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + storageDays);

    const mergedMeta = {
      ...existingMeta,
      planTier: tier,
      entitlements: {
        ...(existingMeta.entitlements || {}),
        qaIncluded,
        translationsIncluded,
        validations: defaults.validations,
        mockInterviewPro: defaults.mockInterviewPro,
        mockInterviewsIncluded,
      },
      usage: {
        ...(existingMeta.usage || {}),
        mockInterviewCreditsRemaining:
          typeof existingMeta?.usage?.mockInterviewCreditsRemaining === 'number'
            ? existingMeta.usage.mockInterviewCreditsRemaining
            : mockInterviewsIncluded,
      },
      storageUntil: until.toISOString(),
      flags: {
        ...(existingMeta.flags || {}),
        rfeReadiness,
        expedited,
      },
      stripeCheckoutSessionId: session.id,
      updatedAt: now.toISOString(),
    };

    const { error: upErr } = await supabaseAdmin
      .from('visa_apps')
      .update({ meta: mergedMeta })
      .eq('id', visa_app_id);

    if (upErr) return NextResponse.json({ error: `Update failed: ${upErr.message}` }, { status: 500 });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Webhook error' }, { status: 400 });
  }
}
