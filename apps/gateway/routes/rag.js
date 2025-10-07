import multer from 'multer';
import { logError, logInfo } from '../logger.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function buildRagUrl(baseUrl, path) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    url.pathname = path;
    return url.toString();
  } catch (error) {
    logError('gateway.rag_url_invalid', error, { baseUrl, path });
    return null;
  }
}

function toJsonResponse(res, upstreamResponse) {
  return upstreamResponse
    .json()
    .then((body) => {
      res.status(upstreamResponse.status).json(body);
    })
    .catch(async (error) => {
      logError('gateway.rag_invalid_json', error, { status: upstreamResponse.status });
      const text = await upstreamResponse.text();
      res.status(502).json({ error: 'rag_service_error', detail: text.slice(0, 200) });
    });
}

function forwardHeaders(req, apiKey) {
  const headers = {
    'x-request-id': req.requestId,
    'x-org-id': req.orgId,
    traceparent: req.traceparent,
    'content-type': 'application/json',
  };
  if (req.tracestate) {
    headers.tracestate = req.tracestate;
  }
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export function registerRagRoutes(app, { ragServiceUrl, ragServiceApiKey, rateLimiter, idempotencyMiddlewareFactory }) {
  const ingestUrl = buildRagUrl(ragServiceUrl, '/v1/rag/ingest');
  const searchUrl = buildRagUrl(ragServiceUrl, '/v1/rag/search');

  app.post(
    '/v1/rag/ingest',
    upload.single('file'),
    rateLimiter({ resource: 'rag:ingest', limit: 30, windowSeconds: 60 }),
    idempotencyMiddlewareFactory({ resource: 'rag:ingest' }),
    async (req, res) => {
      if (!ingestUrl) {
        return res.status(503).json({ error: 'rag_service_unavailable' });
      }

      const file = req.file;
      const orgSlug = typeof req.body?.orgSlug === 'string' ? req.body.orgSlug.trim() : '';
      const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId.trim() : '';

      if (!file) {
        return res.status(400).json({ error: 'file_required' });
      }
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'unsupported_media_type' });
      }
      if (!orgSlug) {
        return res.status(400).json({ error: 'org_slug_required' });
      }

      const formData = new FormData();
      formData.set('orgSlug', orgSlug);
      if (documentId) {
        formData.set('documentId', documentId);
      }
      formData.set('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

      const headers = forwardHeaders(req, ragServiceApiKey);
      delete headers['content-type'];

      try {
        const response = await fetch(ingestUrl, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          logError('gateway.rag_ingest_failed', new Error(`status ${response.status}`), {
            requestId: req.requestId,
            status: response.status,
          });
          const detail = await response.text();
          return res.status(502).json({ error: 'rag_service_error', detail: detail.slice(0, 200) });
        }

        const result = await response.json();
        logInfo('gateway.rag_ingest_forwarded', { orgId: req.orgId, requestId: req.requestId });
        return res.status(200).json(result);
      } catch (error) {
        logError('gateway.rag_ingest_exception', error, { orgId: req.orgId, requestId: req.requestId });
        return res.status(502).json({ error: 'rag_service_error' });
      }
    },
  );

  app.post(
    '/v1/rag/search',
    rateLimiter({ resource: 'rag:search', limit: 60, windowSeconds: 60 }),
    idempotencyMiddlewareFactory({ resource: 'rag:search' }),
    async (req, res) => {
      if (!searchUrl) {
        return res.status(503).json({ error: 'rag_service_unavailable' });
      }

      const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      const topK = Number.isFinite(req.body?.topK) ? Number(req.body.topK) : undefined;

      if (!query) {
        return res.status(400).json({ error: 'query_required' });
      }

      const payload = { query };
      if (Number.isFinite(topK) && topK > 0) {
        payload.topK = Math.min(Math.floor(topK), 50);
      }

      try {
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: forwardHeaders(req, ragServiceApiKey),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          logError('gateway.rag_search_failed', new Error(`status ${response.status}`), {
            requestId: req.requestId,
            status: response.status,
          });
          return toJsonResponse(res, response);
        }

        const data = await response.json();
        logInfo('gateway.rag_search_forwarded', { orgId: req.orgId, requestId: req.requestId });
        return res.status(200).json(data);
      } catch (error) {
        logError('gateway.rag_search_exception', error, { orgId: req.orgId, requestId: req.requestId });
        return res.status(502).json({ error: 'rag_service_error' });
      }
    },
  );
}
