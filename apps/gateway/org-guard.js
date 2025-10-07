import { logWarn } from './logger.js';

const ORG_ID_HEADER = 'x-org-id';
const ORG_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidOrgId(value) {
  return typeof value === 'string' && ORG_ID_PATTERN.test(value.trim());
}

export function createOrgGuard() {
  return function orgGuard(req, res, next) {
    const rawOrgId = req.headers[ORG_ID_HEADER];
    if (Array.isArray(rawOrgId)) {
      return res.status(400).json({ error: 'invalid_org_id_header' });
    }
    if (!rawOrgId || !isValidOrgId(rawOrgId)) {
      logWarn('gateway.org_guard_missing', { requestId: req.requestId, path: req.path });
      return res.status(400).json({ error: 'invalid_org_id' });
    }

    req.orgId = rawOrgId.trim();
    res.locals.orgId = req.orgId;
    return next();
  };
}
