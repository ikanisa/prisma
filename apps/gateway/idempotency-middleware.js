import { logError, logInfo } from './logger.js';

const IDEMPOTENCY_HEADERS = ['x-idempotency-key', 'idempotency-key'];

function resolveKey(req) {
  for (const header of IDEMPOTENCY_HEADERS) {
    const value = req.headers[header];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function resolveResource(req, resource) {
  if (typeof resource === 'function') {
    return resource(req);
  }
  if (typeof resource === 'string' && resource.trim()) {
    return resource.trim();
  }
  return `${req.method.toUpperCase()} ${req.path}`;
}

export function createIdempotencyMiddleware(store, options = {}) {
  return async function idempotencyHandler(req, res, next) {
    const key = resolveKey(req);
    if (!key || !req.orgId) {
      return next();
    }

    const resource = resolveResource(req, options.resource);

    try {
      const existing = await store?.find({ orgId: req.orgId, resource, key });
      if (existing) {
        res.setHeader('X-Idempotency-Key', key);
        res.setHeader('X-Idempotency-Cache', 'HIT');
        if (existing.requestId) {
          res.setHeader('X-Replayed-From-Request', existing.requestId);
        }
        return res.status(existing.statusCode ?? 200).json(existing.response ?? {});
      }
    } catch (error) {
      logError('gateway.idempotency_lookup_exception', error, { resource, orgId: req.orgId, requestId: req.requestId });
    }

    res.setHeader('X-Idempotency-Key', key);

    const originalJson = res.json.bind(res);
    res.json = function patchedJson(body) {
      res.json = originalJson;
      const statusCode = res.statusCode || 200;
      if (statusCode >= 200 && statusCode < 500) {
        store
          ?.store({
            orgId: req.orgId,
            resource,
            key,
            statusCode,
            response: body,
            requestId: req.requestId,
          })
          .catch((error) => {
            logError('gateway.idempotency_store_exception', error, {
              resource,
              orgId: req.orgId,
              requestId: req.requestId,
            });
          });
      }
      return originalJson(body);
    };

    logInfo('gateway.idempotency_pending', { orgId: req.orgId, resource, requestId: req.requestId });
    return next();
  };
}
