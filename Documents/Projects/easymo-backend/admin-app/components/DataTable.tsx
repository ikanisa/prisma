"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as VirtualList } from "react-window";
import { saveAs } from "file-saver";

export interface DataTableColumn<T> {
  key: keyof T;
  header: string;
  width?: number;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (nextPage: number) => void;
  rowHeight?: number;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  csvFilename?: string;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T, index: number) => string | number;
  activeRowId?: string | number;
}

function toCsv<T>(columns: DataTableColumn<T>[], rows: T[]) {
  const headers = columns.map((col) => JSON.stringify(col.header));
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        if (value == null) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      })
      .map((value) => JSON.stringify(value))
      .join(","),
  );
  return [headers.join(","), ...dataRows].join("\n");
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  rowHeight = 48,
  enableSearch = true,
  searchPlaceholder = "Search…",
  csvFilename = "export.csv",
  onRowClick,
  getRowId,
  activeRowId,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const lowered = query.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        return typeof value === "string" && value.toLowerCase().includes(lowered);
      }),
    );
  }, [columns, rows, query]);

  const gridTemplate = useMemo(
    () =>
      columns
        .map((col) => {
          if (col.width) return `${col.width}px`;
          return "minmax(160px, 1fr)";
        })
        .join(" "),
    [columns],
  );

  const handleExport = () => {
    const blob = new Blob([toCsv(columns, filtered)], { type: "text/csv;charset=utf-8" });
    saveAs(blob, csvFilename);
  };

  const totalPages = total && pageSize ? Math.max(Math.ceil(total / pageSize), 1) : undefined;
  const canPage = Boolean(onPageChange && totalPages && totalPages > 1);

  return (
    <div className="datatable">
      <div className="datatable__toolbar">
        {enableSearch && (
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search rows"
          />
        )}
        <button type="button" onClick={handleExport} className="datatable__export">
          Export CSV
        </button>
      </div>
      <div className="datatable__header" style={{ gridTemplateColumns: gridTemplate }}>
        {columns.map((column) => (
          <div key={String(column.key)}>{column.header}</div>
        ))}
      </div>
      <div className="datatable__body">
        {filtered.length === 0 ? (
          <p className="datatable__empty">No records match the current filters.</p>
        ) : (
          <AutoSizer>
            {({ width, height }) => (
              <VirtualList
                itemCount={filtered.length}
                itemSize={rowHeight}
                width={width}
                height={height}
              >
                {({ index, style }) => {
                  const row = filtered[index];
                  const rowId = getRowId ? getRowId(row, index) : index;
                  const interactive = Boolean(onRowClick);
                  const isActive = interactive && activeRowId !== undefined
                    ? String(activeRowId) === String(rowId)
                    : false;

                  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
                    if (!onRowClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  };

                  const className = [
                    "datatable__row",
                    interactive ? "datatable__row--interactive" : "",
                    isActive ? "datatable__row--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div
                      className={className}
                      style={{ ...style, display: "grid", gridTemplateColumns: gridTemplate }}
                      role={interactive ? "button" : undefined}
                      tabIndex={interactive ? 0 : undefined}
                      aria-pressed={interactive ? isActive : undefined}
                      onClick={interactive ? () => onRowClick?.(row) : undefined}
                      onKeyDown={handleKeyDown}
                      data-row-id={rowId}
                    >
                      {columns.map((column) => {
                        const value = row[column.key];
                        return (
                          <div key={String(column.key)} className="datatable__cell">
                            {column.render ? column.render(value, row) : formatValue(value)}
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              </VirtualList>
            )}
          </AutoSizer>
        )}
      </div>
      {canPage && (
        <div className="datatable__pager" role="navigation" aria-label="Table pagination">
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.max((page ?? 1) - 1, 1))}
            disabled={(page ?? 1) <= 1}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              onPageChange && totalPages
                ? onPageChange(Math.min((page ?? 1) + 1, totalPages))
                : undefined
            }
            disabled={!totalPages || (page ?? 1) >= totalPages}
          >
            Next
          </button>
        </div>
      )}
      <style jsx>{`
        .datatable {
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          background: var(--color-surface);
          display: flex;
          flex-direction: column;
          min-height: 280px;
        }
        .datatable__toolbar {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        .datatable__toolbar input[type="search"] {
          flex: 1;
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.55rem 0.75rem;
          background: var(--color-surface-muted);
        }
        .datatable__export {
          background: var(--color-surface-muted);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.55rem 0.9rem;
          cursor: pointer;
        }
        .datatable__header {
          display: grid;
          align-items: center;
          gap: 0.25rem;
          padding: 0.65rem 1rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          border-bottom: 1px solid var(--color-border);
        }
        .datatable__body {
          flex: 1;
          min-height: 220px;
        }
        .datatable__row {
          gap: 0.25rem;
          align-items: center;
          padding: 0 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        .datatable__row--interactive {
          cursor: pointer;
        }
        .datatable__row--interactive:hover,
        .datatable__row--interactive:focus {
          background: var(--color-surface-muted);
        }
        .datatable__row--active {
          outline: 2px solid var(--color-accent-strong);
          outline-offset: -1px;
        }
        .datatable__cell {
          padding: 0 0.25rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .datatable__empty {
          margin: 0;
          padding: 1rem;
          color: var(--color-text-muted);
        }
        .datatable__pager {
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: flex-end;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--color-border);
        }
        .datatable__pager button {
          border-radius: 0.5rem;
          padding: 0.4rem 0.85rem;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          cursor: pointer;
        }
        .datatable__pager button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value == null) return "—";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
