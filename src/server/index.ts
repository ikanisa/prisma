/* eslint-env node */
import fastify from 'fastify';
import pino from 'pino';
import { lookup } from 'node:dns/promises';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const app = fastify({
  logger,
});

app.addHook('onRequest', (req, _reply, done) => {
  const eventId = req.headers['x-event-id'] as string | undefined;
  const userId = req.headers['x-user-id'] as string | undefined;
  req.log = req.log.child({ reqId: req.id, eventId, userId });
  done();
});

app.get('/health', async (_req, _reply) => {
  const requiredEnv = ['LOG_LEVEL'];
  const env = Object.fromEntries(requiredEnv.map((v) => [v, Boolean(process.env[v])])) as Record<string, boolean>;

  let dnsOk = true;
  try {
    await lookup('example.com');
  } catch {
    dnsOk = false;
  }

  let timeDrift: number | null = null;
  try {
    const res = await fetch('https://worldtimeapi.org/api/ip');
    const data = await res.json();
    const serverTime = Date.parse(data.utc_datetime);
    timeDrift = Math.abs(Date.now() - serverTime);
  } catch {
    timeDrift = null;
  }

  const healthy =
    Object.values(env).every(Boolean) && dnsOk && timeDrift !== null && timeDrift < 5_000;

  return { status: healthy ? 'ok' : 'fail', env, dns: dnsOk, timeDrift };
});

const port = Number(process.env.PORT) || 3000;
app.listen({ port }, (err, address) => {
  if (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
