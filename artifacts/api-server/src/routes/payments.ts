import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

router.post("/payments/create-intent", async (req, res): Promise<void> => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    req.log.error("STRIPE_SECRET_KEY is not configured");
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const { amount, currency = "gbp", description } = req.body;

  if (typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    res.status(400).json({ error: "amount must be a positive integer (pence)" });
    return;
  }
  if (typeof description !== "string" || !description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    description,
    automatic_payment_methods: { enabled: true },
  });

  req.log.info({ amount, currency }, "PaymentIntent created");
  res.json({ clientSecret: paymentIntent.client_secret });
});

export default router;
