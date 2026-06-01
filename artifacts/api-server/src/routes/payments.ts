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

  const {
    amount,
    currency = "gbp",
    description,
    practitionerId,
    practitionerName,
    stripeAccountId,
  } = req.body;

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

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency,
    description,
    automatic_payment_methods: { enabled: true },
    metadata: {
      practitionerId: String(practitionerId ?? ""),
      practitionerName: String(practitionerName ?? ""),
      platformFeeAmount: String(platformFeeAmount),
      platformFeePercent: String(PLATFORM_FEE_PERCENT),
      connectEnabled: stripeAccountId ? "true" : "false",
    },
  };

  // When practitioner has a Stripe Connect account, route 97.5% to them automatically
  if (stripeAccountId && typeof stripeAccountId === "string") {
    intentParams.application_fee_amount = platformFeeAmount;
    intentParams.transfer_data = { destination: stripeAccountId };
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams);

  req.log.info(
    { amount, currency, platformFeeAmount, connectEnabled: !!stripeAccountId },
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
  res.json({ url: session.url, sessionId: session.id });
});

// ── GET /api/subscriptions/check?sessionId=XXX ────────────────────────────────
// Mobile app calls this after returning from the Stripe Checkout browser tab.
// Returns { subscribed, subscriptionId, customerId } — no auth required
// because the sessionId is unguessable (Stripe-generated).
router.get("/subscriptions/check", async (req, res): Promise<void> => {
  const { sessionId } = req.query;

  if (typeof sessionId !== "string" || !sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const subscribed =
    session.payment_status === "paid" ||
    (session.status === "complete" && !!session.subscription);

  req.log.info(
    { sessionId, status: session.status, paymentStatus: session.payment_status },
    "Subscription session checked"
  );

  res.json({
    subscribed,
    subscriptionId: session.subscription ?? null,
    customerId: session.customer ?? null,
  });
});

// ── GET /api/subscriptions/success ────────────────────────────────────────────
// Landing page after successful Stripe Checkout — user sees this in the browser
// before switching back to the app.
router.get("/subscriptions/success", (_req, res): void => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Subscription Confirmed — Soul Remembrance</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #2D1B69;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #FAF5FF;
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      max-width: 380px;
      width: 100%;
    }
    .icon { font-size: 56px; margin-bottom: 20px; }
    h1 { color: #2D1B69; font-size: 22px; font-weight: 700; margin-bottom: 10px; }
    p { color: #6B7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      background: #2D1B69;
      color: #C9A84C;
      padding: 10px 22px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✨</div>
    <h1>You're all set!</h1>
    <p>Your 30-day free trial is active. Return to the Soul Remembrance app to start welcoming clients.</p>
    <div class="badge">Return to the app →</div>
  </div>
</body>
</html>`);
});

// ── GET /api/subscriptions/cancelled ──────────────────────────────────────────
router.get("/subscriptions/cancelled", (_req, res): void => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Subscription Cancelled — Soul Remembrance</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #2D1B69;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #FAF5FF;
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      max-width: 380px;
      width: 100%;
    }
    .icon { font-size: 56px; margin-bottom: 20px; }
    h1 { color: #2D1B69; font-size: 22px; font-weight: 700; margin-bottom: 10px; }
    p { color: #6B7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      background: #F5F0FF;
      color: #2D1B69;
      padding: 10px 22px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid #DDD0F0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🕊️</div>
    <h1>No worries</h1>
    <p>You can start your free trial anytime from your practitioner dashboard in the app.</p>
    <div class="badge">Return to the app</div>
  </div>
</body>
</html>`);
});

export default router;
