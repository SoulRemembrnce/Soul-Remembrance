import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

// ── POST /api/shop/checkout ──────────────────────────────────────────────────
// Creates a Stripe PaymentIntent for a Soul Shop order.
router.post("/shop/checkout", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { items, total, userId } = req.body as {
    items: { productId: string; name: string; price: number; quantity: number }[];
    total: number;
    userId?: string;
  };

  if (!items?.length || !total) {
    res.status(400).json({ error: "items and total are required" });
    return;
  }

  try {
    const stripe = getStripe();
    const amountPence = Math.round(total * 100);

    const description = items
      .map((i) => `${i.quantity}× ${i.name}`)
      .join(", ");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: "gbp",
      description: `Soul Shop order: ${description}`,
      metadata: {
        userId: userId ?? "guest",
        itemCount: String(items.length),
        source: "soul-shop",
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create payment" });
  }
});

export default router;
