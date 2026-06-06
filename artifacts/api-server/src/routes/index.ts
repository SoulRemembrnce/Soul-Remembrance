import { Router, type IRouter } from "express";
import connectRouter from "./connect";
import emailsRouter from "./emails";
import healthRouter from "./health";
import notificationsRouter from "./notifications";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentsRouter);
router.use(connectRouter);
router.use(emailsRouter);
router.use(notificationsRouter);

export default router;

// Note: webhooksRouter is mounted directly in app.ts (before express.json())
// so Stripe signature verification receives the raw request body.
