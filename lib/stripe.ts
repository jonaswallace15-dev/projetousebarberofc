import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build_purposes_only', {
  apiVersion: '2026-03-25.dahlia' as any,
});
