import { toSql } from 'pgvector/utils';

type PgVectorValue = number[] | Float32Array | ReadonlyArray<number>;

export function vector(values: PgVectorValue) {
  const normalised = Array.from(values);
  const serialised = toSql(normalised);
  return {
    toPostgres(): string {
      return serialised;
    },
    toSql(): string {
      return serialised;
    },
    toString(): string {
      return serialised;
    },
  };
}
