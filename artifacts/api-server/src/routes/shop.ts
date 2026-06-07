import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

const PLATFORM_FEE_PERCENT = 3;

const VENDOR_TIER_PRICES: Record<string, number> = {
  basic: 199,
  verified: 299,
};
const FEATURED_PRICE = 499;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

// ── POST /api/shop/checkout ──────────────────────────────────────────────────
// Creates a Stripe PaymentIntent for a Soul Shop order.
// Tracks 3% platform commission per vendor in metadata.
router.post("/shop/checkout", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { items, total, userId } = req.body as {
    items: {
      productId: string;
      name: string;
      price: number;
      quantity: number;
      emoji?: string;
      vendorId?: string;
      vendorName?: string;
    }[];
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

    // Calculate per-vendor commission breakdown
    const vendorMap: Record<string, { name: string; subtotal: number }> = {};
    for (const item of items) {
      if (item.vendorId) {
        if (!vendorMap[item.vendorId]) {
          vendorMap[item.vendorId] = { name: item.vendorName ?? item.vendorId, subtotal: 0 };
        }
        vendorMap[item.vendorId].subtotal += item.price * item.quantity;
      }
    }

    const commissionSummary = Object.entries(vendorMap)
      .map(([id, v]) => {
        const fee = Math.round(v.subtotal * PLATFORM_FEE_PERCENT) / 100;
        const payout = Math.round((v.subtotal - fee) * 100) / 100;
        return `${v.name}:owed=${payout.toFixed(2)}`;
      })
      .join("|");

    const description = items.map((i) => `${i.quantity}× ${i.name}`).join(", ");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: "gbp",
      description: `Soul Shop order: ${description}`,
      metadata: {
        userId: userId ?? "guest",
        itemCount: String(items.length),
        source: "soul-shop",
        platformFeePercent: String(PLATFORM_FEE_PERCENT),
        vendorCommissions: commissionSummary.slice(0, 500),
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

// ── POST /api/shop/vendor-subscription ──────────────────────────────────────
// Creates a Stripe PaymentIntent for a vendor listing fee.
// tier: "basic" = £1.99, "verified" = £2.99, featured add-on = +£4.99
router.post("/shop/vendor-subscription", async (req, res): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { tier, featured, userId, businessName } = req.body as {
    tier: "basic" | "verified";
    featured?: boolean;
    userId?: string;
    businessName?: string;
  };

  if (!tier || !VENDOR_TIER_PRICES[tier]) {
    res.status(400).json({ error: "tier must be 'basic' or 'verified'" });
    return;
  }

  try {
    const stripe = getStripe();
    const baseAmount = VENDOR_TIER_PRICES[tier];
    const featuredAmount = featured ? FEATURED_PRICE : 0;
    const totalAmount = baseAmount + featuredAmount;

    const tierLabel = tier === "verified" ? "Verified Seller" : "Basic Listing";
    const featuredLabel = featured ? " + Featured Boost" : "";
    const description = `Soul Shop Vendor: ${tierLabel}${featuredLabel}${businessName ? ` (${businessName})` : ""}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "gbp",
      description,
      metadata: {
        source: "vendor-subscription",
        tier,
        featured: String(!!featured),
        userId: userId ?? "unknown",
        businessName: businessName ?? "",
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create vendor subscription" });
  }
});

export default router;
