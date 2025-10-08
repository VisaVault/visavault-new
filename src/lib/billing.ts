export const PRICES = {
  STARTER: process.env.STRIPE_PRICE_CASE_STARTER!,
  COMPLETE: process.env.STRIPE_PRICE_CASE_COMPLETE!,
  PREMIUM: process.env.STRIPE_PRICE_CASE_PREMIUM!,
  MEMBERSHIP_MONTHLY: process.env.STRIPE_PRICE_MEMBERSHIP_MONTHLY!,
  UPSELL_MOCK_PRO: process.env.STRIPE_PRICE_UPSELL_MOCK_PRO!,
  UPSELL_ATTORNEY_QA: process.env.STRIPE_PRICE_UPSELL_ATTORNEY_QA!,
  UPSELL_HUMAN_REVIEW: process.env.STRIPE_PRICE_UPSELL_HUMAN_REVIEW!,
  UPSELL_EXPEDITE: process.env.STRIPE_PRICE_UPSELL_EXPEDITE!,
  UPSELL_TRANSLATION: process.env.STRIPE_PRICE_UPSELL_TRANSLATION!,
};

export type CaseTier = 'starter' | 'complete' | 'premium';

export const CASE_ENTITLEMENTS: Record<CaseTier, {
  storageDays: number;
  translationsIncluded: number;
  qaIncluded: number;
  expedited: boolean;
  rfeReadiness: boolean;
}> = {
  starter:  { storageDays: 30, translationsIncluded: 0, qaIncluded: 0, expedited: false, rfeReadiness: false },
  complete: { storageDays: 90, translationsIncluded: 2, qaIncluded: 1, expedited: false, rfeReadiness: false },
  premium:  { storageDays: 90, translationsIncluded: 4, qaIncluded: 2, expedited: true,  rfeReadiness: true  },
};
