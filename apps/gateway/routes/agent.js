import { logError, logInfo, logWarn } from '../logger.js';

function buildAgentUrl(baseUrl) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    if (!url.pathname || url.pathname === '/' || url.pathname === '') {
      url.pathname = '/v1/chat';
    }
    return url;
  } catch (error) {
    logError('gateway.agent_url_invalid', error, { baseUrl });
    return null;
  }
}

function forwardHeaders(req, extra = {}) {
  const headers = {
    'x-request-id': req.requestId,
    'x-org-id': req.orgId,
    traceparent: req.traceparent,
    ...extra,
  };
  if (req.tracestate) {
    headers.tracestate = req.tracestate;
  }
  return headers;
}

export function registerAgentRoutes(app, { agentServiceUrl, agentServiceApiKey, rateLimiter }) {
  const upstream = buildAgentUrl(agentServiceUrl);

  const rateLimitMiddleware = typeof rateLimiter === 'function'
    ? rateLimiter({ resource: 'agent:chat', limit: 30, windowSeconds: 60 })
    : (_req, _res, next) => next();

  app.get('/v1/agent/chat', rateLimitMiddleware, async (req, res) => {
    if (!upstream) {
      logWarn('gateway.agent_unavailable', { requestId: req.requestId });
      return res.status(503).json({ error: 'agent_service_unavailable' });
    }

    logInfo('gateway.agent_chat_start', { orgId: req.orgId, requestId: req.requestId });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const controller = new AbortController();
    const heartbeat = setInterval(() => {
      res.write(`: keep-alive ${Date.now()}\n\n`);
    }, 15000);

    const upstreamHeaders = forwardHeaders(req);
    if (agentServiceApiKey) {
      upstreamHeaders.authorization = `Bearer ${agentServiceApiKey}`;
    }

    try {
      const upstreamResponse = await fetch(upstream, {
        method: 'GET',
        headers: upstreamHeaders,
        signal: controller.signal,
      });

      if (!upstreamResponse.ok || !upstreamResponse.body) {
        clearInterval(heartbeat);
        logError('gateway.agent_upstream_error', new Error(`status ${upstreamResponse.status}`), {
          requestId: req.requestId,
          status: upstreamResponse.status,
        });
        return res.status(502).json({ error: 'agent_service_error' });
      }

      const reader = upstreamResponse.body.getReader();
      req.on('close', () => {
        controller.abort();
        clearInterval(heartbeat);
        reader.cancel().catch(() => {});
      });

      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          break;
        }
        if (value) {
          res.write(Buffer.from(value));
        }
      }

      clearInterval(heartbeat);
      res.end();
      logInfo('gateway.agent_chat_complete', { orgId: req.orgId, requestId: req.requestId });
      return undefined;
    } catch (error) {
      clearInterval(heartbeat);
      logError('gateway.agent_chat_failed', error, { orgId: req.orgId, requestId: req.requestId });
      if (!res.headersSent) {
        return res.status(502).json({ error: 'agent_service_error' });
      }
      res.end();
      return undefined;
    }
  });
}
