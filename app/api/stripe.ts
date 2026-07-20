// stripe.ts
import Stripe from 'stripe';
const stripe = new Stripe('your_stripe_test_secret_key', {
  apiVersion: '2020-08-27'
});

export const createStripeCharge = async (amount, currency) => {
  return await stripe.charges.create({
    amount,
    currency,
    source: 'tok_visa', // obtained with Stripe.js
  });
};
