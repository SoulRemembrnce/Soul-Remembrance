import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { getAdminDb } from "../lib/firebase-admin";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

async function cancelSubscriptionIfActive(stripe: Stripe, subscriptionId: string, log: any) {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status !== "canceled") {
      await stripe.subscriptions.cancel(subscriptionId);
      log.info({ subscriptionId }, "Stripe subscription cancelled on account deletion");
    }
  } catch (err: any) {
    log.warn({ subscriptionId, err: err.message }, "Could not cancel subscription — may already be cancelled");
  }
}

// ── DELETE /api/account ────────────────────────────────────────────────────────
// Called by the mobile app before deleting the Firebase Auth account.
// Cancels any active Stripe subscriptions for the user (practitioner + vendor).
router.delete("/account", async (req, res): Promise<void> => {
  const { uid } = req.body;

  if (typeof uid !== "string" || !uid) {
    res.status(400).json({ error: "uid is required" });
    return;
  }

  const stripe = getStripe();
  const db = getAdminDb();

  try {
    const cancellations: Promise<void>[] = [];

    // Check practitioner profile for subscription
    const practSnap = await db.collection("practitionerProfiles").doc(uid).get();
    if (practSnap.exists) {
      const data = practSnap.data() ?? {};
      if (typeof data.subscriptionId === "string" && data.subscriptionId) {
        cancellations.push(cancelSubscriptionIfActive(stripe, data.subscriptionId, req.log));
      }
    }

    // Check vendor profile for subscription
    const vendorSnap = await db.collection("vendorProfiles").doc(uid).get();
    if (vendorSnap.exists) {
      const data = vendorSnap.data() ?? {};
      if (typeof data.subscriptionId === "string" && data.subscriptionId) {
        cancellations.push(cancelSubscriptionIfActive(stripe, data.subscriptionId, req.log));
      }
    }

    await Promise.all(cancellations);

    req.log.info({ uid, count: cancellations.length }, "Account deletion subscriptions cancelled");
    res.json({ ok: true, cancelled: cancellations.length });
  } catch (err: any) {
    req.log.error({ uid, err: err.message }, "Account deletion cleanup failed");
    res.status(500).json({ error: err.message ?? "Account deletion cleanup failed" });
  }
});

export default router;
