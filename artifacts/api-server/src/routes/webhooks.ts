import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { getAdminDb } from "../lib/firebase-admin";
import { sendPushToUser } from "../lib/sendPush";

const router: IRouter = Router();

// Stripe subscription statuses that mean the practitioner is still active
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

/**
 * Look up a practitioner profile by their Stripe customer ID.
 * Returns the Firestore document reference and snapshot, or null if not found.
 */
async function findPractitionerByCustomerId(customerId: string) {
  const db = getAdminDb();
  const snap = await db
    .collection("practitionerProfiles")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0];
}

/**
 * POST /api/webhooks/stripe
 *
 * Stripe sends events here. This route must receive the raw body (Buffer)
 * so the signature can be verified — mount it before express.json().
 *
 * Events handled:
 *   checkout.session.completed        — new subscription activated
 *   customer.subscription.updated     — plan change / trial end / renewal
 *   customer.subscription.deleted     — cancellation / non-payment termination
 *   invoice.payment_failed            — payment failed; grace period or lapse
 */
router.post("/stripe", async (req: Request, res: Response): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    req.log.error("STRIPE_WEBHOOK_SECRET is not configured");
    res.status(503).json({ error: "Webhook secret not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    req.log.warn({ err: msg }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: msg });
    return;
  }

  req.log.info({ eventType: event.type, eventId: event.id }, "Stripe webhook received");

  try {
    await handleEvent(event, req);
  } catch (err) {
    req.log.error({ err, eventType: event.type }, "Error processing Stripe webhook");
    // Still return 200 so Stripe doesn't keep retrying for server-side bugs
    res.json({ received: true, error: "Processing error — logged" });
    return;
  }

  res.json({ received: true });
});

async function handleEvent(event: Stripe.Event, req: Request): Promise<void> {
  const db = getAdminDb();

  switch (event.type) {
    // ── New subscription created via Checkout ─────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.customer || !session.subscription) break;

      const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer.id;

      const doc = await findPractitionerByCustomerId(customerId);
      if (!doc) {
        req.log.warn({ customerId }, "No practitioner found for customer on checkout.session.completed");
        break;
      }

      await db.doc(`practitionerProfiles/${doc.id}`).update({
        subscriptionActive: true,
        stripeCustomerId: customerId,
        subscriptionId: typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id,
      });
      req.log.info({ userId: doc.id, customerId }, "Subscription activated via checkout");

      sendPushToUser(
        doc.id,
        "Subscription active! 🎉",
        "Your Soul Remembrance practitioner subscription is now live. Your profile is visible to clients.",
        { screen: "profile" }
      ).catch((err) => req.log.warn({ err, userId: doc.id }, "Push failed: subscription activated"));
      break;
    }

    // ── Subscription status changed (renewals, trial end, pauses, etc.) ───────
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const doc = await findPractitionerByCustomerId(customerId);
      if (!doc) {
        req.log.warn({ customerId }, "No practitioner found for customer on subscription.updated");
        break;
      }

      const active = ACTIVE_STATUSES.has(sub.status);
      await db.doc(`practitionerProfiles/${doc.id}`).update({ subscriptionActive: active });
      req.log.info({ userId: doc.id, status: sub.status, active }, "Subscription updated");
      break;
    }

    // ── Subscription cancelled / expired ─────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const doc = await findPractitionerByCustomerId(customerId);
      if (!doc) {
        req.log.warn({ customerId }, "No practitioner found for customer on subscription.deleted");
        break;
      }

      await db.doc(`practitionerProfiles/${doc.id}`).update({ subscriptionActive: false });
      req.log.info({ userId: doc.id }, "Subscription cancelled — practitioner deactivated");

      sendPushToUser(
        doc.id,
        "Subscription ended",
        "Your Soul Remembrance subscription has ended. Renew anytime to make your profile visible again.",
        { screen: "profile" }
      ).catch((err) => req.log.warn({ err, userId: doc.id }, "Push failed: subscription deleted"));
      break;
    }

    // ── Payment failed (card declined, insufficient funds, etc.) ─────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.customer) break;
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer.id;

      const doc = await findPractitionerByCustomerId(customerId);
      if (!doc) break;

      // Only deactivate after Stripe has exhausted its retry schedule
      // (billing_reason === 'subscription_cycle' means it's a renewal, not a
      // first-time payment failure which Stripe will retry automatically).
      // We deactivate here to be safe; subscription.updated will re-activate
      // if the payment eventually succeeds.
      await db.doc(`practitionerProfiles/${doc.id}`).update({ subscriptionActive: false });
      req.log.info({ userId: doc.id, customerId }, "Payment failed — practitioner deactivated");

      sendPushToUser(
        doc.id,
        "Payment failed ⚠️",
        "We couldn't collect your Soul Remembrance subscription payment. Please update your billing details to keep your profile active.",
        { screen: "profile" }
      ).catch((err) => req.log.warn({ err, userId: doc.id }, "Push failed: invoice.payment_failed"));
      break;
    }

    default:
      req.log.info({ eventType: event.type }, "Unhandled Stripe webhook event");
  }
}

export default router;
