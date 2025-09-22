interface SeriesDefinition {
  key: string;
  label: string;
  color: string;
}

interface DashboardChartProps<T extends Record<string, unknown>> {
  data: T[];
  series: SeriesDefinition[];
  height?: number;
  ariaLabel: string;
}

export function DashboardChart<T extends Record<string, unknown>>({
  data,
  series,
  height = 260,
  ariaLabel,
}: DashboardChartProps<T>) {
  if (!data.length || series.length === 0) {
    return <p style={{ color: "var(--color-text-muted)" }}>No activity for the selected window.</p>;
  }

  const width = 640;
  const paddingX = 48;
  const paddingY = 32;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxValue = Math.max(
    1,
    ...data.map((point) =>
      series.reduce((acc, current) => {
        const value = Number(point[current.key as keyof T] ?? 0);
        return Math.max(acc, Number.isFinite(value) ? value : 0);
      }, 0),
    ),
  );

  const buildPoints = (key: string) =>
    data
      .map((point, index) => {
        const value = Number(point[key as keyof T] ?? 0);
        const safeValue = Number.isFinite(value) ? value : 0;
        const x = paddingX + (index / Math.max(data.length - 1, 1)) * chartWidth;
        const y = paddingY + chartHeight - (safeValue / maxValue) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, idx) => Math.round((maxValue / yTicks) * idx));

  const formatLabel = (value: string | number) => {
    if (typeof value !== "string") return String(value);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div role="img" aria-label={ariaLabel}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: "100%", height }}>
        {tickValues.map((value) => {
          const y = paddingY + chartHeight - (value / maxValue) * chartHeight;
          return (
            <g key={value}>
              <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="4 4" />
              <text x={paddingX - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
                {value}
              </text>
            </g>
          );
        })}

        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={paddingY + chartHeight}
          y2={paddingY + chartHeight}
          stroke="var(--color-border)"
        />

        {data.map((point, index) => {
          const x = paddingX + (index / Math.max(data.length - 1, 1)) * chartWidth;
          return (
            <text
              key={String(point.date ?? index)}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-muted)"
            >
              {formatLabel(point.date as string)}
            </text>
          );
        })}

        {series.map((entry) => (
          <polyline
            key={entry.key}
            points={buildPoints(entry.key)}
            fill="none"
            stroke={entry.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        <g transform={`translate(${paddingX}, ${paddingY - 12})`} fontSize="11">
          {series.map((entry, index) => (
            <g key={entry.key} transform={`translate(${index * 120}, 0)`}>
              <circle cx={0} cy={0} r={5} fill={entry.color} />
              <text x={10} y={4} fill="var(--color-text-primary)">{entry.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
