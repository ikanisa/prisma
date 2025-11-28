import { FormEvent, useMemo, useState } from "react";
import { authorizedFetch } from "@/lib/api";
import { runtimeConfig } from "@/lib/runtime-config";
import { AuditWorkspaceLayout } from "./layout";

type AnalyticsKind = "JE" | "RATIO" | "VARIANCE" | "DUPLICATE" | "BENFORD";

type AdaException = {
  id: string;
  record_ref: string;
  reason: string;
  score: number | null;
  disposition: "OPEN" | "INVESTIGATING" | "RESOLVED";
  note: string | null;
  misstatement_id: string | null;
};

type AdaRun = {
  id: string;
  org_id: string;
  engagement_id: string;
  kind: AnalyticsKind;
  dataset_ref: string;
  dataset_hash: string;
  params: unknown;
  summary: {
    datasetHash: string;
    kind: AnalyticsKind;
    parameters: Record<string, unknown>;
    totals: Record<string, number>;
    details: Record<string, unknown>;
  } | null;
  started_at: string;
  finished_at: string | null;
  ada_exceptions?: AdaException[];
};

type JournalEntry = {
  id: string;
  postedAt: string;
  amount: number;
  account: string;
  description?: string;
  createdAt?: string;
  createdBy?: string;
  approvedBy?: string;
};

const demoOrgId = runtimeConfig.demoOrgId ?? "";
const demoEngagementId = runtimeConfig.demoEngagementId ?? "";
const demoUserId = runtimeConfig.demoUserId ?? "";

const demoJournalEntries: JournalEntry[] = (() => {
  const base = Array.from({ length: 30 }, (_, index) => {
    const day = ((index % 28) + 1).toString().padStart(2, "0");
    return {
      id: `JE-${(index + 1).toString().padStart(3, "0")}`,
      postedAt: `2025-01-${day}T12:00:00Z`,
      amount: (index % 3 === 0 ? 1000 : 1) * (index + 5),
      account: index % 5 === 0 ? "4800" : "4000",
      description: index % 4 === 0 ? "Manual adjustment" : "Automated posting",
      createdAt: index % 6 === 0 ? `2025-01-${day}T07:00:00Z` : undefined,
      createdBy: index % 6 === 0 ? "approver@example.com" : undefined,
      approvedBy: index % 4 === 0 ? "finance.manager@example.com" : undefined,
    } satisfies JournalEntry;
  });

  base[3] = {
    ...base[3],
    postedAt: "2025-02-03T10:15:00Z",
    description: "Manual close entry",
  };
  base[7] = {
    ...base[7],
    postedAt: "2025-01-05T08:00:00Z",
    createdAt: "2025-01-05T08:00:00Z",
    description: "Weekend posting",
  };
  base[11] = {
    ...base[11],
    amount: 20000,
    description: "Large round accrual",
  };
  base[17] = {
    ...base[17],
    amount: -15000,
    description: "Manual reversal",
  };
  return base;
})();

const ratioSample = [
  { name: "Gross margin", numerator: 185000, denominator: 250000, prior: 0.68, thresholdPct: 5 },
  { name: "Operating margin", numerator: 62000, denominator: 250000, prior: 0.24, thresholdPct: 5 },
];

const varianceSample = [
  { name: "Revenue", actual: 255000, benchmark: 240000, thresholdPct: 5, thresholdAbs: 10000 },
  { name: "OpEx", actual: 112000, benchmark: 100000, thresholdPct: 7 },
];

const duplicateSample = [
  { id: "INV-1001", amount: 5400, date: "2025-01-15", reference: "SO-1100", counterparty: "Contoso" },
  { id: "INV-1002", amount: 5400, date: "2025-01-15", reference: "SO-1100", counterparty: "Contoso" },
  { id: "INV-1003", amount: 3250, date: "2025-01-18", reference: "SO-1107", counterparty: "Northwind" },
];

const benfordSample = [
  12543, 11321, 9450, 8123, 7120, 6999, 5890, 5234, 4890, 4567, 4123, 3789, 3521, 3123, 2890, 2456, 2233, 1990, 1789,
  1678, 1555, 1434, 1340, 1290, 1195, 1120, 1080, 1010,
];

const kindDescriptions: Record<AnalyticsKind, string> = {
  JE: "Journal entry risk scoring for sampling and TCWG communication.",
  RATIO: "Ratio analytics with threshold monitoring.",
  VARIANCE: "Variance testing of actuals versus benchmarks or budgets.",
  DUPLICATE: "Duplicate detection on key transaction attributes.",
  BENFORD: "Benford's Law first-digit testing for revenue or expenses.",
};

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const entries = Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return entries.reduce<Record<string, unknown>>((acc, [key, nested]) => {
        acc[key] = nested;
        return acc;
      }, {});
    }
    return val;
  });
}

function demoHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function runJeDemo(params: {
  entries: JournalEntry[];
  periodEnd: string;
  latePostingDays: number;
  roundAmountThreshold: number;
  weekendFlag: boolean;
}) {
  const periodEndDate = new Date(params.periodEnd);
  const toleranceMs = params.latePostingDays * 24 * 60 * 60 * 1000;
  const riskScores = params.entries.map(entry => {
    const postedDate = new Date(entry.postedAt);
    const createdDate = entry.createdAt ? new Date(entry.createdAt) : postedDate;
    const flags: string[] = [];
    let score = 0;

    if (postedDate.getTime() > periodEndDate.getTime() + toleranceMs) {
      flags.push("LATE_POSTING");
      score += 40;
    }
    if (params.weekendFlag && [0, 6].includes(createdDate.getUTCDay())) {
      flags.push("WEEKEND_ENTRY");
      score += 25;
    }
    const absoluteAmount = Math.abs(entry.amount);
    if (absoluteAmount >= params.roundAmountThreshold && absoluteAmount % params.roundAmountThreshold === 0) {
      flags.push("ROUND_AMOUNT");
      score += 20;
    }
    if (entry.description && /manual/i.test(entry.description)) {
      flags.push("MANUAL_REFERENCE");
      score += 15;
    }

    return {
      id: entry.id,
      account: entry.account,
      amount: entry.amount,
      postedAt: entry.postedAt,
      createdAt: entry.createdAt ?? entry.postedAt,
      flags,
      score,
    };
  });

  const ordered = [...riskScores].sort((a, b) => b.score - a.score);
  const exceptions = ordered
    .filter(item => item.score >= 50)
    .map(item => ({ recordRef: item.id, score: item.score, reason: item.flags.join(", ") }));

  return {
    summary: {
      kind: "JE" as const,
      datasetHash: demoHash(params),
      parameters: {
        periodEnd: params.periodEnd,
        latePostingDays: params.latePostingDays,
        roundAmountThreshold: params.roundAmountThreshold,
        weekendFlag: params.weekendFlag,
      },
      totals: {
        entries: params.entries.length,
        flagged: ordered.filter(item => item.flags.length > 0).length,
        exceptions: exceptions.length,
      },
      details: {
        riskScores: ordered,
        sample: ordered.filter(item => item.flags.length > 0).slice(0, 25),
      },
    },
    exceptions,
  };
}

function runRatioDemo(metrics = ratioSample) {
  const processed = metrics.map(metric => {
    const ratio = metric.denominator === 0 ? null : metric.numerator / metric.denominator;
    const deltaPct = metric.prior && metric.prior !== 0 && ratio !== null ? ((ratio - metric.prior) / metric.prior) * 100 : null;
    const flagged = deltaPct !== null && metric.thresholdPct ? Math.abs(deltaPct) > metric.thresholdPct : false;
    return { ...metric, ratio, deltaPct, flagged };
  });
  const exceptions = processed
    .filter(metric => metric.flagged)
    .map(metric => ({ recordRef: metric.name, score: Math.abs(metric.deltaPct ?? 0), reason: "Variance threshold" }));
  return {
    summary: {
      kind: "RATIO" as const,
      datasetHash: demoHash(processed),
      parameters: {},
      totals: { metrics: processed.length, exceptions: exceptions.length },
      details: { metrics: processed },
    },
    exceptions,
  };
}

function runVarianceDemo(series = varianceSample) {
  const processed = series.map(item => {
    const delta = item.actual - item.benchmark;
    const pctDelta = item.benchmark === 0 ? null : (delta / item.benchmark) * 100;
    const exceeds =
      (item.thresholdAbs && Math.abs(delta) > item.thresholdAbs) ||
      (item.thresholdPct && pctDelta !== null && Math.abs(pctDelta) > item.thresholdPct);
    return { ...item, delta, pctDelta, flagged: Boolean(exceeds) };
  });
  const exceptions = processed
    .filter(item => item.flagged)
    .map(item => ({ recordRef: item.name, score: Math.abs(item.delta), reason: "Variance threshold" }));
  return {
    summary: {
      kind: "VARIANCE" as const,
      datasetHash: demoHash(processed),
      parameters: {},
      totals: { series: processed.length, exceptions: exceptions.length },
      details: { series: processed },
    },
    exceptions,
  };
}

function runDuplicateDemo(transactions = duplicateSample) {
  const groups: Record<string, typeof transactions> = {};
  transactions.forEach(tx => {
    const key = JSON.stringify([tx.amount.toFixed(2), tx.date, tx.reference, tx.counterparty]);
    groups[key] = groups[key] ? [...groups[key], tx] : [tx];
  });
  const duplicates = Object.values(groups).filter(group => group.length > 1);
  const exceptions = duplicates.flatMap(group =>
    group.map(item => ({ recordRef: item.id, score: group.length, reason: "Duplicate transaction pattern" })),
  );
  return {
    summary: {
      kind: "DUPLICATE" as const,
      datasetHash: demoHash(transactions),
      parameters: {},
      totals: { transactions: transactions.length, duplicateGroups: duplicates.length, exceptions: exceptions.length },
      details: { groups: duplicates },
    },
    exceptions,
  };
}

function runBenfordDemo(figures = benfordSample) {
  const digits = Array.from({ length: 9 }, (_, index) => index + 1);
  const counts = digits.map(digit => ({ digit, observed: 0 }));
  figures.forEach(value => {
    const match = String(Math.abs(value)).match(/^[0]*([1-9])/);
    if (match) {
      const digit = Number(match[1]);
      const target = counts.find(item => item.digit === digit);
      if (target) target.observed += 1;
    }
  });
  const rows = counts.map(item => {
    const observedPct = figures.length === 0 ? 0 : item.observed / figures.length;
    const expectedPct = Math.log10(1 + 1 / item.digit);
    return { ...item, observedPct, expectedPct, variance: observedPct - expectedPct };
  });
  const exceptions = rows
    .filter(row => Math.abs(row.variance) > 0.05)
    .map(row => ({ recordRef: row.digit.toString(), score: Math.abs(row.variance), reason: "Benford variance" }));
  return {
    summary: {
      kind: "BENFORD" as const,
      datasetHash: demoHash(rows),
      parameters: {},
      totals: { figures: figures.length, exceptions: exceptions.length },
      details: { rows },
    },
    exceptions,
  };
}

export default function AnalyticsWorkspace() {
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [orgId, setOrgId] = useState(demoOrgId);
  const [engagementId, setEngagementId] = useState(demoEngagementId);
  const [userId, setUserId] = useState(demoUserId);
  const [runs, setRuns] = useState<AdaRun[]>([]);
  const [activeKind, setActiveKind] = useState<AnalyticsKind>("JE");
  const [datasetRef, setDatasetRef] = useState("journal-2025-q1");
  const [periodEnd, setPeriodEnd] = useState("2025-01-31");
  const [latePostingDays, setLatePostingDays] = useState(5);
  const [roundThreshold, setRoundThreshold] = useState(1000);
  const [includeWeekend, setIncludeWeekend] = useState(true);
  const [customEntries, setCustomEntries] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasLiveConnection = useMemo(
    () => mode === "live" && orgId.trim().length > 0 && engagementId.trim().length > 0 && userId.trim().length > 0,
    [mode, orgId, engagementId, userId],
  );

  const handleLoadRuns = async () => {
    if (!hasLiveConnection) {
      setStatus("Provide organisation, engagement, and user identifiers to load Supabase data.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const response = await authorizedFetch(
        `/api/ada/run?orgId=${encodeURIComponent(orgId)}&engagementId=${encodeURIComponent(engagementId)}`,
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to load analytics runs.");
      }
      const body = await response.json();
      setRuns(body.runs ?? []);
      setStatus(`Loaded ${body.runs?.length ?? 0} analytics runs.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load analytics runs.");
    } finally {
      setLoading(false);
    }
  };

  const parseCustomJournalEntries = (): JournalEntry[] | null => {
    if (!customEntries.trim()) return null;
    try {
      const parsed = JSON.parse(customEntries);
      if (!Array.isArray(parsed)) throw new Error("Custom journal payload must be an array.");
      return parsed as JournalEntry[];
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invalid custom journal JSON.");
      return null;
    }
  };

  const buildJeParams = () => {
    const custom = parseCustomJournalEntries();
    const entries = custom ?? demoJournalEntries;
    return {
      entries,
      periodEnd,
      latePostingDays,
      roundAmountThreshold: roundThreshold,
      weekendFlag: includeWeekend,
    };
  };

  const runDemo = (kind: AnalyticsKind) => {
    const now = new Date().toISOString();
    let summary;
    let exceptions;

    if (kind === "JE") {
      const params = buildJeParams();
      const result = runJeDemo(params);
      summary = result.summary;
      exceptions = result.exceptions;
    } else if (kind === "RATIO") {
      const result = runRatioDemo();
      summary = result.summary;
      exceptions = result.exceptions;
    } else if (kind === "VARIANCE") {
      const result = runVarianceDemo();
      summary = result.summary;
      exceptions = result.exceptions;
    } else if (kind === "DUPLICATE") {
      const result = runDuplicateDemo();
      summary = result.summary;
      exceptions = result.exceptions;
    } else {
      const result = runBenfordDemo();
      summary = result.summary;
      exceptions = result.exceptions;
    }

    const demoRun: AdaRun = {
      id: `demo-${Date.now()}`,
      org_id: orgId || "demo-org",
      engagement_id: engagementId || "demo-engagement",
      kind,
      dataset_ref: datasetRef,
      dataset_hash: summary?.datasetHash ?? demoHash(summary),
      params: kind === "JE" ? buildJeParams() : {},
      summary,
      started_at: now,
      finished_at: now,
      ada_exceptions: exceptions.map((exception, index) => ({
        id: `demo-ex-${Date.now()}-${index}`,
        record_ref: exception.recordRef,
        reason: exception.reason,
        score: exception.score,
        disposition: "OPEN",
        note: null,
        misstatement_id: null,
      })),
    };
    setRuns(previous => [demoRun, ...previous]);
    setStatus(`${kind} analytics run completed in demo mode.`);
  };

  const runLive = async (kind: AnalyticsKind) => {
    if (!hasLiveConnection) {
      setStatus("Configure live identifiers before running analytics.");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      let params: unknown;
      if (kind === "JE") {
        params = buildJeParams();
      } else if (kind === "RATIO") {
        params = { metrics: ratioSample };
      } else if (kind === "VARIANCE") {
        params = { series: varianceSample };
      } else if (kind === "DUPLICATE") {
        params = {
          transactions: duplicateSample,
          matchOn: ["amount", "date", "reference"],
        };
      } else {
        params = { figures: benfordSample };
      }

      const response = await authorizedFetch("/api/ada/run", {
        method: "POST",
        body: JSON.stringify({
          kind,
          orgId,
          engagementId,
          userId,
          datasetRef,
          params,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Analytics run failed.");
      }

      const body = await response.json();
      setRuns(previous => [body.run, ...previous]);
      setStatus(`${kind} analytics run completed and stored.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to run analytics.");
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "demo") {
      runDemo(activeKind);
    } else {
      await runLive(activeKind);
    }
  };

  const updateExceptionDisposition = async (
    runId: string,
    exceptionId: string,
    disposition: AdaException["disposition"],
  ) => {
    if (mode === "demo") {
      setRuns(previous =>
        previous.map(run =>
          run.id === runId
            ? {
                ...run,
                ada_exceptions: run.ada_exceptions?.map(exception =>
                  exception.id === exceptionId ? { ...exception, disposition } : exception,
                ),
              }
            : run,
        ),
      );
      setStatus("Updated demo exception disposition.");
      return;
    }

    if (!hasLiveConnection) {
      setStatus("Configure live identifiers before updating exceptions.");
      return;
    }

    try {
      const response = await authorizedFetch("/api/ada/exception/update", {
        method: "POST",
        body: JSON.stringify({ orgId, userId, exceptionId, disposition }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to update exception.");
      }
      const body = await response.json();
      setRuns(previous =>
        previous.map(run =>
          run.id === runId
            ? {
                ...run,
                ada_exceptions: run.ada_exceptions?.map(exception =>
                  exception.id === exceptionId ? body.exception : exception,
                ),
              }
            : run,
        ),
      );
      setStatus("Exception disposition updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update exception.");
    }
  };

  const exportCsv = (run: AdaRun) => {
    if (!run.summary) return;
    const details = run.summary.details ?? {};
    const rows: string[][] = [];
    if (run.kind === "JE" && Array.isArray((details as { riskScores?: unknown[] }).riskScores)) {
      const riskScores = (details as { riskScores: Array<Record<string, unknown>> }).riskScores;
      rows.push(["Entry ID", "Account", "Amount", "Flags", "Score"]);
      riskScores.forEach(item => {
        rows.push([
          String(item.id ?? ""),
          String(item.account ?? ""),
          String(item.amount ?? ""),
          Array.isArray(item.flags) ? item.flags.join(";") : "",
          String(item.score ?? ""),
        ]);
      });
    } else if (run.kind === "RATIO" && Array.isArray((details as { metrics?: unknown[] }).metrics)) {
      const metrics = (details as { metrics: Array<Record<string, unknown>> }).metrics;
      rows.push(["Metric", "Ratio", "Prior", "Delta %", "Flagged"]);
      metrics.forEach(metric => {
      const delta = metric.deltaPct;
      rows.push([
        String(metric.name ?? ""),
        String(metric.ratio ?? ""),
        String(metric.prior ?? ""),
        typeof delta === "number" ? delta.toFixed(2) : "",
        String(metric.flagged ?? ""),
      ]);
      });
    } else {
      rows.push(["Field", "Value"]);
      Object.entries(run.summary.totals ?? {}).forEach(([key, value]) => {
        rows.push([key, value.toString()]);
      });
    }
    const csvContent = rows.map(row => row.map(column => `"${column.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${run.kind.toLowerCase()}-analytics-${run.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendToSampling = (run: AdaRun) => {
    setStatus(`Sampling hand-off prepared for run ${run.id}. Attach dataset hash ${run.summary?.datasetHash}.`);
  };

  return (
    <AuditWorkspaceLayout>
      <section className="flex flex-col gap-6">
        <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Deterministic Analytics</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Run ISA 500/520 compliant analytics across journal entries, ratios, variances, duplicates, and Benford profiles.
          Each run produces an ATT-ready evidence pack with dataset hashes, parameters, and exceptions ready for TCWG and
          sampling workflows.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${mode === "demo" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              type="button"
              onClick={() => setMode("demo")}
            >
              Demo mode
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${mode === "live" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              type="button"
              onClick={() => setMode("live")}
            >
              Live Supabase
            </button>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col text-sm">
              <span className="text-muted-foreground">Organisation ID</span>
              <input
                className="mt-1 rounded border px-2 py-1"
                value={orgId}
                onChange={event => setOrgId(event.target.value)}
                placeholder="org_123"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-muted-foreground">Engagement ID</span>
              <input
                className="mt-1 rounded border px-2 py-1"
                value={engagementId}
                onChange={event => setEngagementId(event.target.value)}
                placeholder="eng_2025"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-muted-foreground">User ID</span>
              <input
                className="mt-1 rounded border px-2 py-1"
                value={userId}
                onChange={event => setUserId(event.target.value)}
                placeholder="user_service"
              />
            </label>
          </div>
          <button
            className="rounded-md bg-muted px-3 py-2 text-sm"
            type="button"
            onClick={handleLoadRuns}
            disabled={loading || mode === "demo"}
          >
            Load live runs
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-muted-foreground">{status}</p>}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <form onSubmit={handleRun} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Run analytics</h2>
              <p className="text-sm text-muted-foreground">Select the analytic stream and configure parameters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(kindDescriptions) as AnalyticsKind[]).map(kind => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveKind(kind)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${activeKind === kind ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {kind}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{kindDescriptions[activeKind]}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="text-muted-foreground">Dataset reference</span>
              <input
                className="mt-1 rounded border px-2 py-1"
                value={datasetRef}
                onChange={event => setDatasetRef(event.target.value)}
                placeholder="journal-2025-q1"
              />
            </label>
            {activeKind === "JE" && (
              <label className="flex flex-col text-sm">
                <span className="text-muted-foreground">Period end</span>
                <input
                  type="date"
                  className="mt-1 rounded border px-2 py-1"
                  value={periodEnd}
                  onChange={event => setPeriodEnd(event.target.value)}
                />
              </label>
            )}
          </div>

          {activeKind === "JE" && (
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col text-sm">
                <span className="text-muted-foreground">Late posting window (days)</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-2 py-1"
                  value={latePostingDays}
                  onChange={event => setLatePostingDays(Number(event.target.value) || 0)}
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-muted-foreground">Round amount threshold</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 rounded border px-2 py-1"
                  value={roundThreshold}
                  onChange={event => setRoundThreshold(Number(event.target.value) || 1)}
                />
              </label>
              <label className="flex flex-row items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeWeekend}
                  onChange={event => setIncludeWeekend(event.target.checked)}
                />
                Flag weekend postings
              </label>
            </div>
          )}

          {activeKind === "JE" && (
              <label className="flex flex-col text-sm">
                <span className="text-muted-foreground">Custom journal JSON (optional)</span>
                <textarea
                  className="mt-1 h-32 rounded border px-2 py-1 font-mono"
                  value={customEntries}
                  onChange={event => setCustomEntries(event.target.value)}
                  placeholder='[{"id":"JE-001","postedAt":"2025-01-31T12:00:00Z","amount":1000}]'
                />
              </label>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={loading}
            >
              {loading ? "Running..." : `Run ${activeKind} analytics`}
            </button>
            {activeKind === "JE" && (
              <p className="text-xs text-muted-foreground">
                Demo dataset includes 30 entries with automated late posting, weekend, and round-amount scenarios.
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Recent analytics runs</h2>
          <p className="text-sm text-muted-foreground">
            Each run captures dataset hashes, parameters, and ATT-aligned summaries. Export CSVs or push exceptions to
            sampling, JE testing, or TCWG packs.
          </p>
        </div>

        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analytics runs yet. Execute a run to populate this section.</p>
        ) : (
          <div className="space-y-4">
            {runs.map(run => (
              <article key={run.id} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{run.kind} analytics</h3>
                    <p className="text-xs text-muted-foreground">
                      Dataset {run.dataset_ref} · Hash {run.dataset_hash} · Started {new Date(run.started_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md bg-muted px-3 py-1 text-xs" type="button" onClick={() => exportCsv(run)}>
                      Export CSV
                    </button>
                    <button className="rounded-md bg-muted px-3 py-1 text-xs" type="button" onClick={() => sendToSampling(run)}>
                      Send to Sampling / JE Testing
                    </button>
                  </div>
                </div>

                {run.summary && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {Object.entries(run.summary.totals ?? {}).map(([key, value]) => (
                      <div key={key} className="rounded border bg-background p-3">
                        <p className="text-xs uppercase text-muted-foreground">{key}</p>
                        <p className="text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {run.kind === "JE" && run.summary && Array.isArray((run.summary.details as { sample?: unknown[] }).sample) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Sample selection (top exceptions)</h4>
                    <table className="mt-2 w-full table-auto text-left text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-2 py-1">Entry ID</th>
                          <th className="px-2 py-1">Account</th>
                          <th className="px-2 py-1">Amount</th>
                          <th className="px-2 py-1">Flags</th>
                          <th className="px-2 py-1">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((run.summary.details as { sample: Array<Record<string, unknown>> }).sample ?? []).map(item => (
                          <tr key={String(item.id)} className="border-b last:border-0">
                            <td className="px-2 py-1 font-mono">{String(item.id)}</td>
                            <td className="px-2 py-1">{String(item.account ?? "")}</td>
                            <td className="px-2 py-1">{String(item.amount ?? "")}</td>
                            <td className="px-2 py-1">{Array.isArray(item.flags) ? item.flags.join(", ") : ""}</td>
                            <td className="px-2 py-1">{String(item.score ?? "")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {run.ada_exceptions && run.ada_exceptions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold">Exceptions</h4>
                    {run.ada_exceptions.map(exception => (
                      <div key={exception.id} className="rounded border bg-background p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{exception.record_ref}</p>
                            <p className="text-xs text-muted-foreground">{exception.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-muted px-2 py-1 text-xs">Score: {exception.score ?? "n/a"}</span>
                            <select
                              className="rounded border px-2 py-1 text-xs"
                              value={exception.disposition}
                              onChange={event =>
                                updateExceptionDisposition(run.id, exception.id, event.target.value as AdaException["disposition"])
                              }
                            >
                              <option value="OPEN">Open</option>
                              <option value="INVESTIGATING">Investigating</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      </section>
    </AuditWorkspaceLayout>
  );
}
