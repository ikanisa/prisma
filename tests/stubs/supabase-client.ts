import { vi } from 'vitest';

class QueryBuilder {
  private filters: Array<{ type: string; field: string; value?: any; values?: any[]; op?: string }> = [];
  private limitValue: number | null = null;
  private orderField: string | null = null;
  private orderAscending = true;

  constructor(private readonly table: string, private readonly store: Record<string, any[]>) {}

  select() {
    return this;
  }

  insert(payload: any) {
    const rows = Array.isArray(payload) ? payload : [payload];
    this.store[this.table] = this.store[this.table] || [];
    this.store[this.table].push(...rows.map(row => ({ ...row })));
    return this;
  }

  update(payload: any) {
    const rows = this.store[this.table] || [];
    const updated: any[] = [];
    for (const row of rows) {
      if (this.matches(row)) {
        Object.assign(row, payload);
        updated.push({ ...row });
      }
    }
    return this;
  }

  upsert(payload: any) {
    const rows = Array.isArray(payload) ? payload : [payload];
    for (const entry of rows) {
      const rowsForTable = this.store[this.table] || [];
      const index = rowsForTable.findIndex(row => row.id && row.id === entry.id);
      if (index >= 0) {
        rowsForTable[index] = { ...rowsForTable[index], ...entry };
      } else {
        rowsForTable.push({ ...entry });
      }
      this.store[this.table] = rowsForTable;
    }
    return this;
  }

  delete() {
    const rows = this.store[this.table] || [];
    this.store[this.table] = rows.filter(row => !this.matches(row));
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  filter(field: string, op: string, value: any) {
    this.filters.push({ type: 'op', field, op, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  maybeSingle() {
    this.limitValue = 1;
    return this;
  }

  single() {
    this.limitValue = 1;
    return this;
  }

  async then(resolve: any, reject: any) {
    try {
      const result = this.execute();
      if (this.limitValue === 1) {
        resolve({ data: result[0] ?? null, error: null });
      } else {
        resolve({ data: result, error: null });
      }
    } catch (error) {
      reject(error);
    }
  }

  private execute() {
    let rows = [...(this.store[this.table] || [])];
    rows = rows.filter(row => this.matches(row));
    if (this.orderField) {
      rows.sort((a, b) => {
        const left = a[this.orderField!];
        const right = b[this.orderField!];
        if (left === right) return 0;
        return (left < right ? -1 : 1) * (this.orderAscending ? 1 : -1);
      });
    }
    if (typeof this.limitValue === 'number') {
      rows = rows.slice(0, this.limitValue);
    }
    return rows.map(row => ({ ...row }));
  }

  private matches(row: any) {
    return this.filters.every(filter => {
      const value = row[filter.field];
      if (filter.type === 'eq') {
        return value === filter.value;
      }
      if (filter.type === 'in') {
        return filter.values?.includes(value);
      }
      if (filter.type === 'op') {
        if (filter.op === 'is' && filter.value === null) {
          return value === null;
        }
      }
      return true;
    });
  }
}

export const createSupabaseStub = (store: Record<string, any[]>) => ({
  from(table: string) {
    return new QueryBuilder(table, store);
  },
  storage: {
    from() {
      return {
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    },
    bucket() {
      return {
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    },
    async getBucket() {
      return { data: { id: 'documents' }, error: null };
    },
    async createBucket() {
      return { data: null, error: null };
    },
  },
  channel: vi.fn(() => ({ on() { return this; }, subscribe: () => ({ unsubscribe() {} }) })),
});
