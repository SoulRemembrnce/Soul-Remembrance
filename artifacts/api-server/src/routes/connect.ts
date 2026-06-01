import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

// ── POST /api/connect/onboard ────────────────────────────────────────────────
// Creates (or retrieves) a Stripe Connect Express account for a practitioner
// and returns a fresh Account Link URL for onboarding.
router.post("/connect/onboard", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { userId, email, name, existingAccountId } = req.body;

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const stripe = getStripe();
  let accountId: string = existingAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      default_currency: "gbp",
      ...(email && typeof email === "string" ? { email } : {}),
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { userId, practitionerName: name ?? "" },
    });
    accountId = account.id;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${apiUrl}/api/connect/refresh?account_id=${accountId}`,
    return_url: `${apiUrl}/api/connect/return?account_id=${accountId}`,
    type: "account_onboarding",
  });

  req.log.info({ accountId }, "Connect onboarding link created");
  res.json({ url: accountLink.url, accountId });
});

// ── GET /api/connect/status/:accountId ──────────────────────────────────────
// Check whether a Connect account has completed onboarding and is enabled.
router.get("/connect/status/:accountId", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const stripe = getStripe();
  try {
    const account = await stripe.accounts.retrieve(req.params.accountId);
    res.json({
      accountId: account.id,
      enabled: account.charges_enabled && account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements?.currently_due ?? [],
    });
  } catch {
    res.status(404).json({ error: "Account not found" });
  }
});

// ── GET /api/connect/return ──────────────────────────────────────────────────
// Stripe redirects here after onboarding completes.
router.get("/connect/return", (_req, res): void => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="background:#2D1B69;display:flex;align-items:center;justify-content:center;
                   height:100vh;margin:0;font-family:sans-serif;flex-direction:column;gap:12px;">
        <div style="color:#C9A84C;font-size:48px;">✓</div>
        <h2 style="color:#fff;margin:0;font-size:20px;">Account connected!</h2>
        <p style="color:rgba(255,255,255,0.65);margin:0;text-align:center;padding:0 24px;">
          You can close this window and return to the app.
        </p>
        <script>setTimeout(() => window.close(), 2500);</script>
      </body>
    </html>
  `);
});

// ── GET /api/connect/refresh ─────────────────────────────────────────────────
// Stripe redirects here if the onboarding link expires.
router.get("/connect/refresh", (_req, res): void => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="background:#2D1B69;display:flex;align-items:center;justify-content:center;
                   height:100vh;margin:0;font-family:sans-serif;flex-direction:column;gap:12px;">
        <h2 style="color:#fff;margin:0;">Session expired</h2>
        <p style="color:rgba(255,255,255,0.65);margin:0;text-align:center;padding:0 24px;">
          Please return to the app and tap "Set up payouts" again.
        </p>
        <script>setTimeout(() => window.close(), 2500);</script>
      </body>
    </html>
  `);
});

export default router;
