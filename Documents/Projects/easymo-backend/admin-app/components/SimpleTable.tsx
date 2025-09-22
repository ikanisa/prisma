import type { ReactNode } from "react";

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface SimpleTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyLabel?: string;
}

export function SimpleTable<T extends Record<string, unknown>>({ columns, rows, emptyLabel = "No data" }: SimpleTableProps<T>) {
  if (!rows.length) {
    return <p>{emptyLabel}</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  borderBottom: "1px solid var(--color-border)",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value = row[column.key];
                return (
                  <td
                    key={String(column.key)}
                    style={{
                      padding: "0.65rem 0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    {column.render ? column.render(value, row) : formatValue(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value == null) return "—";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
