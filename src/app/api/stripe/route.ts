import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PRICES } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const { kind, tier, upsell, successPath = '/dashboard', cancelPath = '/pricing' } = await req.json();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let params: Stripe.Checkout.SessionCreateParams;

    if (kind === 'case') {
      // Case purchase (one-time)
      const priceId =
        tier === 'starter' ? PRICES.STARTER
        : tier === 'complete' ? PRICES.COMPLETE
        : tier === 'premium' ? PRICES.PREMIUM
        : null;

      if (!priceId) {
        return NextResponse.json({ error: 'Unknown case tier' }, { status: 400 });
      }

      params = {
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}${successPath}?p=case&t=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}${cancelPath}`,
        metadata: { kind: 'case', tier: tier as string },
      };
    } else if (kind === 'membership') {
      // Membership subscription
      if (!PRICES.MEMBERSHIP_MONTHLY) {
        return NextResponse.json({ error: 'Membership price not configured' }, { status: 400 });
      }
      params = {
        mode: 'subscription',
        line_items: [{ price: PRICES.MEMBERSHIP_MONTHLY, quantity: 1 }],
        success_url: `${appUrl}${successPath}?p=membership&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}${cancelPath}`,
        metadata: { kind: 'membership' },
      };
    } else if (kind === 'upsell') {
      // Upsell one-time
      const priceMap: Record<string, string> = {
        mock: PRICES.UPSELL_MOCK_PRO,
        attorney: PRICES.UPSELL_ATTORNEY_QA,
        review: PRICES.UPSELL_HUMAN_REVIEW,
        expedite: PRICES.UPSELL_EXPEDITE,
        translation: PRICES.UPSELL_TRANSLATION,
      };
      const priceId = priceMap[upsell as string];
      if (!priceId) return NextResponse.json({ error: 'Unknown upsell' }, { status: 400 });

      params = {
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}${successPath}?p=upsell&u=${upsell}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}${cancelPath}`,
        metadata: { kind: 'upsell', upsell: String(upsell) },
      };
    } else {
      return NextResponse.json({ error: 'Unknown checkout kind' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Stripe error' }, { status: 500 });
  }
}