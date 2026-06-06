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

  try {
    const paymentIntent = await stripe.paymentIntents.create(intentParams);
    req.log.info(
      { amount, currency, platformFeeAmount, connectEnabled: !!stripeAccountId },
      "PaymentIntent created"
    );
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    req.log.error({ err }, "Stripe paymentIntents.create failed");
    res.status(502).json({ error: err?.message ?? "Payment processing error" });
  }
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
    allow_promotion_codes: true,
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

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    req.log.info({ sessionId: session.id }, "Subscription checkout session created");
    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    req.log.error({ err }, "Stripe checkout session creation failed");
    res.status(502).json({ error: err?.message ?? "Could not create subscription session" });
  }
});

// ── GET /api/payments/subscription-success ────────────────────────────────────
// Stripe redirects here after checkout completes. Shows a simple page so
// the browser has a valid HTTPS destination and Stripe marks the session complete.
router.get("/payments/subscription-success", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment successful</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#2D1B69;color:#fff;text-align:center;padding:24px}h1{font-size:1.5rem;margin-bottom:8px}p{opacity:.8}</style>
</head><body>
<div><h1>✨ You're all set!</h1><p>Your free trial has started. You can close this tab and return to the app.</p></div>
</body></html>`);
});

// ── GET /api/payments/subscription-cancel ─────────────────────────────────────
router.get("/payments/subscription-cancel", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment cancelled</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#2D1B69;color:#fff;text-align:center;padding:24px}h1{font-size:1.5rem;margin-bottom:8px}p{opacity:.8}</style>
</head><body>
<div><h1>Payment cancelled</h1><p>You can close this tab and return to the app.</p></div>
</body></html>`);
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

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const subscribed =
      session.status === "complete" ||
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    req.log.info(
      { sessionId, status: session.status, paymentStatus: session.payment_status },
      "Subscription session checked"
    );

    res.json({
      subscribed,
      subscriptionId: session.subscription ?? null,
      customerId: session.customer ?? null,
    });
  } catch (err: any) {
    req.log.error({ err }, "Stripe session retrieve failed");
    res.status(502).json({ error: err?.message ?? "Could not check subscription status" });
  }
});

// ── POST /api/payments/create-trial-setup ────────────────────────────────────
// Native PaymentSheet flow: creates a Stripe customer + SetupIntent so the app
// can collect the card natively (no browser). 3DS is handled by the Stripe SDK.
router.post("/payments/create-trial-setup", async (req, res): Promise<void> => {
  const { name, email } = req.body;
  const stripe = getStripe();

  try {
    const customerParams: Stripe.CustomerCreateParams = {
      name: typeof name === "string" ? name : undefined,
    };
    if (email && typeof email === "string") customerParams.email = email;

    const customer = await stripe.customers.create(customerParams);

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-06-20" }
    );

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      automatic_payment_methods: { enabled: true },
    });

    req.log.info({ customerId: customer.id }, "Trial setup intent created");
    res.json({
      customerId: customer.id,
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
    });
  } catch (err: any) {
    req.log.error({ err }, "create-trial-setup failed");
    res.status(502).json({ error: err?.message ?? "Could not create setup intent" });
  }
});

// ── POST /api/payments/activate-trial ────────────────────────────────────────
// Called after PaymentSheet succeeds. Retrieves the confirmed payment method
// directly from the SetupIntent (works for all payment types, not just cards).
router.post("/payments/activate-trial", async (req, res): Promise<void> => {
  const { customerId, setupIntentId } = req.body;
  if (typeof customerId !== "string" || !customerId) {
    res.status(400).json({ error: "customerId is required" });
    return;
  }

  const stripe = getStripe();

  try {
    // Get the confirmed payment method directly from the SetupIntent —
    // this works regardless of payment method type (card, Link, etc.)
    let paymentMethodId: string | undefined;

    if (typeof setupIntentId === "string" && setupIntentId) {
      const si = await stripe.setupIntents.retrieve(setupIntentId);
      if (typeof si.payment_method === "string") {
        paymentMethodId = si.payment_method;
      } else if (si.payment_method && typeof si.payment_method === "object") {
        paymentMethodId = si.payment_method.id;
      }
    }

    // Fallback: list all payment methods on the customer
    if (!paymentMethodId) {
      const allMethods = await stripe.paymentMethods.list({ customer: customerId });
      if (allMethods.data.length) {
        paymentMethodId = allMethods.data[0].id;
      }
    }

    if (!paymentMethodId) {
      res.status(400).json({ error: "No payment method found — please try again" });
      return;
    }

    // Ensure the payment method is attached to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }).catch(() => {
      // Already attached — ignore the error
    });

    // Set as the customer's default
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: 399,
            recurring: { interval: "month" },
            product_data: {
              name: "Soul Remembrance — Practitioner Plan",
              description: "Verified listing, booking tools, analytics & community.",
            },
          },
        },
      ],
      trial_period_days: 30,
      default_payment_method: paymentMethodId,
    });

    req.log.info({ customerId, subscriptionId: subscription.id }, "Trial subscription activated");
    res.json({ subscribed: true, subscriptionId: subscription.id });
  } catch (err: any) {
    req.log.error({ err }, "activate-trial failed");
    res.status(502).json({ error: err?.message ?? "Could not activate subscription" });
  }
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

// ── POST /api/payments/create-featured-intent ─────────────────────────────────
// Creates a one-time PaymentIntent for the £4.99 / 30-day Featured Practitioner boost.
router.post("/payments/create-featured-intent", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    req.log.error("STRIPE_SECRET_KEY not configured");
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { userId } = req.body;
  if (typeof userId !== "string" || !userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const stripe = getStripe();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: 499, // £4.99 in pence
      currency: "gbp",
      description: "Soul Remembrance — Featured Practitioner (30 days)",
      automatic_payment_methods: { enabled: true },
      metadata: { userId, type: "featured_placement" },
    });
    req.log.info({ userId }, "Featured practitioner PaymentIntent created");
    res.json({ clientSecret: intent.client_secret });
  } catch (err: any) {
    req.log.error({ err }, "Stripe featured intent creation failed");
    res.status(502).json({ error: err?.message ?? "Payment processing error" });
  }
});

export default router;
