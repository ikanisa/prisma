import { logError, logWarn } from './logger.js';

const HEADER_CANDIDATES = ['x-api-key', 'x-api-key'.toLowerCase()];

function normaliseKeys(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((value) => value.trim()).filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function createApiKeyValidator({ apiKeys }) {
  const allowedKeys = new Set(normaliseKeys(apiKeys));

  if (!allowedKeys.size) {
    logWarn('gateway.api_key_unconfigured');
    return function skipApiKeyValidation(_req, _res, next) {
      next();
    };
  }

  return function validateApiKey(req, res, next) {
    const headerKey = HEADER_CANDIDATES.reduce((acc, header) => {
      if (acc) return acc;
      const value = req.headers[header];
      return typeof value === 'string' ? value.trim() : acc;
    }, '');

    let candidate = headerKey;
    if (!candidate) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        candidate = authHeader.slice(7).trim();
      }
    }

    if (!candidate) {
      logWarn('gateway.api_key_missing', { requestId: req.requestId, path: req.path });
      return res.status(401).json({ error: 'missing_api_key' });
    }

    if (!allowedKeys.has(candidate)) {
      logError('gateway.api_key_invalid', new Error('unauthorised'), {
        requestId: req.requestId,
        path: req.path,
      });
      return res.status(403).json({ error: 'invalid_api_key' });
    }

    req.apiKey = candidate;
    next();
  };
}
