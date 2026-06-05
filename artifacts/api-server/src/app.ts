import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import webhooksRouter from "./routes/webhooks";
import legalRouter from "./routes/legal";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// ── Stripe webhook — must receive raw body for signature verification ─────────
// Scoped to the exact webhook path so other /api routes still get JSON parsing.
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Legal pages — served at /privacy and /terms (no /api prefix)
app.use(legalRouter);

export default app;
