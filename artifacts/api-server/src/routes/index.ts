import { Router, type IRouter } from "express";
import connectRouter from "./connect";
import emailsRouter from "./emails";
import healthRouter from "./health";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentsRouter);
router.use(connectRouter);
router.use(emailsRouter);

export default router;
