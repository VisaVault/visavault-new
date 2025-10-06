import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: 'Server misconfiguration: STRIPE_SECRET_KEY is missing.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secret, {
      apiVersion: '2024-06-20',
      appInfo: { name: 'VisaVault' },
    });

    const origin = req.headers.get('origin') || 'https://visavault.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: { userId: 'user_123' },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create Stripe Checkout session' },
      { status: 500 }
    );
  }
}