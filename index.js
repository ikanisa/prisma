import { createGatewayServer } from './apps/gateway/server.js';
import { logError, logInfo } from './apps/gateway/logger.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function start() {
  try {
    const app = await createGatewayServer();
    app.listen(port, () => {
      logInfo('gateway.started', { port });
    });
  } catch (error) {
    logError('gateway.start_failed', error);
    process.exitCode = 1;
  }
}

process.on('uncaughtException', (error) => {
  logError('gateway.uncaught_exception', error);
});

process.on('unhandledRejection', (reason) => {
  logError('gateway.unhandled_rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

await start();
