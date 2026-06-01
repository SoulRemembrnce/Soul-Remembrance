import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

const PLATFORM_FEE_PERCENT = 2.5;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

// ── POST /api/payments/create-intent ──────────────────────────────────────────
// Creates a PaymentIntent for a client booking.
// Soul Remembrance collects the full amount; the 2.5% platform fee is
// recorded in metadata for auditing until Stripe Connect is wired up.
router.post("/payments/create-intent", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    req.log.error("STRIPE_SECRET_KEY not configured");
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { amount, currency = "gbp", description, practitionerId, practitionerName } = req.body;

  if (typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    res.status(400).json({ error: "amount must be a positive integer (pence)" });
    return;
  }
  if (typeof description !== "string" || !description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const platformFeeAmount = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    description,
    automatic_payment_methods: { enabled: true },
    metadata: {
      practitionerId: String(practitionerId ?? ""),
      practitionerName: String(practitionerName ?? ""),
      platformFeeAmount: String(platformFeeAmount),
      platformFeePercent: String(PLATFORM_FEE_PERCENT),
    },
  });

  req.log.info(
    { amount, currency, platformFeeAmount },
    "PaymentIntent created"
  );
  res.json({ clientSecret: paymentIntent.client_secret });
});

// ── POST /api/payments/create-subscription-session ────────────────────────────
// Creates a Stripe Checkout Session for the practitioner £3.99/month plan.
// Includes a 30-day free trial — no charge on day 0.
// Returns { url } which the mobile app opens in a browser.
router.post("/payments/create-subscription-session", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    req.log.error("STRIPE_SECRET_KEY not configured");
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { name, email, successUrl, cancelUrl } = req.body;

  if (typeof successUrl !== "string" || typeof cancelUrl !== "string") {
    res.status(400).json({ error: "successUrl and cancelUrl are required" });
    return;
  }

  const stripe = getStripe();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: 399, // £3.99 in pence
          recurring: { interval: "month" },
          product_data: {
            name: "Soul Remembrance — Practitioner Plan",
            description: "Verified listing, booking tools, analytics & community. 30-day free trial.",
          },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 30,
      metadata: { practitionerName: name ?? "" },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (email && typeof email === "string") {
    sessionParams.customer_email = email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  req.log.info({ sessionId: session.id }, "Subscription checkout session created");
  res.json({ url: session.url });
});

export default router;
