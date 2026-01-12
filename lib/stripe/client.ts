import { loadStripe } from "@stripe/stripe-js";

export const getStripeClient = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
    // Return a rejected promise so the error can be handled
    return Promise.reject(new Error("Stripe publishable key is not configured"));
  }

  // Load Stripe - this will automatically load the Stripe.js script from CDN
  return loadStripe(publishableKey);
};

