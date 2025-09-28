/* eslint-env node */
import { app } from "./routes";
import pino from "pino";
import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

// Lightweight request logger / correlation
app.use((req, _res, next) => {
  const reqId = randomUUID();
  const eventId = req.header("x-event-id") ?? undefined;
  const userId = req.header("x-user-id") ?? undefined;
  // @ts-ignore Attach a child logger to the request
  req.log = logger.child({ reqId, eventId, userId, method: req.method, path: req.path });
  next();
});

// Health check: env, DNS, and time drift
app.get("/health", async (_req, res) => {
  const requiredEnv = ["LOG_LEVEL"];
  const env = Object.fromEntries(requiredEnv.map((v) => [v, Boolean(process.env[v])])) as Record<
    string,
    boolean
  >;

  let dnsOk = true;
  try {
    await lookup("example.com");
  } catch {
    dnsOk = false;
  }

  let timeDrift: number | null = null;
  try {
    const resp = await fetch("https://worldtimeapi.org/api/ip");
    const data = await resp.json();
    const serverTime = Date.parse(data.utc_datetime);
    timeDrift = Math.abs(Date.now() - serverTime);
  } catch {
    timeDrift = null;
  }

  const healthy = Object.values(env).every(Boolean) && dnsOk && timeDrift !== null && timeDrift < 5_000;
  res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "fail", env, dns: dnsOk, timeDrift });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
