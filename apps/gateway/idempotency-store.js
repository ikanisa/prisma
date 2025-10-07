import { Pool } from 'pg';
import { logError, logInfo, logWarn } from './logger.js';

function createPool(connectionString) {
  if (!connectionString) {
    logWarn('gateway.idempotency_unconfigured');
    return null;
  }
  const pool = new Pool({ connectionString });
  pool.on('error', (error) => {
    logError('gateway.idempotency_pool_error', error);
  });
  return pool;
}

export function createIdempotencyStore(connectionString) {
  const pool = createPool(connectionString);

  async function find({ orgId, resource, key }) {
    if (!pool) return null;
    try {
      const { rows } = await pool.query(
        'SELECT status_code, response, request_id FROM idempotency_keys WHERE org_id = $1 AND resource = $2 AND idempotency_key = $3 LIMIT 1',
        [orgId, resource, key],
      );
      if (!rows.length) {
        return null;
      }
      const row = rows[0];
      return {
        statusCode: row.status_code ?? 200,
        response: row.response ?? {},
        requestId: row.request_id ?? null,
      };
    } catch (error) {
      logError('gateway.idempotency_lookup_failed', error, { orgId, resource });
      return null;
    }
  }

  async function store({ orgId, resource, key, statusCode, response, requestId }) {
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO idempotency_keys (org_id, resource, idempotency_key, status_code, response, request_id)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (org_id, resource, idempotency_key)
         DO UPDATE SET status_code = EXCLUDED.status_code, response = EXCLUDED.response, request_id = EXCLUDED.request_id`,
        [orgId, resource, key, statusCode, JSON.stringify(response ?? {}), requestId ?? null],
      );
      logInfo('gateway.idempotency_stored', { orgId, resource, requestId });
    } catch (error) {
      logError('gateway.idempotency_store_failed', error, { orgId, resource, requestId });
    }
  }

  async function destroy() {
    if (pool) {
      await pool.end();
    }
  }

  return {
    find,
    store,
    destroy,
  };
}
