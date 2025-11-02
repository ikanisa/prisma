import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';

export type QueryLogEvent = {
  table: string;
  action: string;
  args?: unknown[];
};

export interface SupabaseQueryLoggerOptions {
  enabled?: boolean;
  logger?: (event: QueryLogEvent) => void;
}

const trackedOperations = new Set<string>(['select', 'insert', 'update', 'upsert', 'delete']);

const serialiseArgument = (value: unknown): unknown => {
  if (value === null) return null;
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map(serialiseArgument);
  }

  if (valueType === 'object') {
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      record[key] = serialiseArgument(entry);
    }
    return record;
  }

  return String(value);
};

const wrapBuilder = (
  table: string,
  builder: unknown,
  logger: (event: QueryLogEvent) => void,
): unknown => {
  if (!builder || typeof builder !== 'object') {
    return builder;
  }

  return new Proxy(builder as Record<string, unknown>, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      const method = String(property);
      if (method === 'then' || method === 'catch' || method === 'finally') {
        return value.bind(target);
      }

      return (...args: unknown[]) => {
        if (trackedOperations.has(method)) {
          logger({
            table,
            action: method,
            args: args.map(serialiseArgument),
          });
        }

        const result = value.apply(target, args);
        if (typeof result === 'object' && result !== null) {
          return wrapBuilder(table, result, logger);
        }

        return result;
      };
    },
  });
};

export function instrumentSupabaseClient(
  client: SupabaseClient<Database>,
  options: SupabaseQueryLoggerOptions = {},
): SupabaseClient<Database> {
  const { enabled = false, logger = () => {} } = options;
  if (!enabled) {
    return client;
  }

  return new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === 'from' && typeof value === 'function') {
        return (table: string) => {
          logger({ table, action: 'from' });
          const builder = value.call(target, table);
          return wrapBuilder(table, builder, logger);
        };
      }

      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
