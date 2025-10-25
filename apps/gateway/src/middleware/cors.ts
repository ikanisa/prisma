import cors from 'cors';
import type { RequestHandler } from 'express';

function buildAllowedOrigins(allowedOrigins: readonly string[]): { allowAll: boolean; values: Set<string> } {
  const values = new Set<string>();
  let allowAll = false;
  for (const origin of allowedOrigins) {
    const trimmed = origin.trim();
    if (!trimmed) continue;
    if (trimmed === '*') {
      allowAll = true;
      values.clear();
      break;
    }
    values.add(trimmed);
  }
  return { allowAll, values };
}

export function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const { allowAll, values } = buildAllowedOrigins(allowedOrigins);
  const corsHandler = cors({
    origin(origin, callback) {
      if (!origin || allowAll || values.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS_ORIGIN_NOT_ALLOWED'));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  });

  return (req, res, next) => {
    corsHandler(req, res, (err) => {
      if (err) {
        res.status(403).json({ error: 'cors_origin_not_allowed' });
        return;
      }
      if (res.headersSent) {
        return;
      }
      next();
    });
  };
}
