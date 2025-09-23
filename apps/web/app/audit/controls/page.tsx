"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Frequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL"
  | "EVENT_DRIVEN";
type WalkthroughResult =
  | "DESIGNED"
  | "NOT_DESIGNED"
  | "IMPLEMENTED"
  | "NOT_IMPLEMENTED";
type TestResult = "PASS" | "EXCEPTIONS";
type DeficiencySeverity = "LOW" | "MEDIUM" | "HIGH";
type DeficiencyStatus = "OPEN" | "MONITORING" | "CLOSED";

type Walkthrough = {
  id: string;
  date: string;
  result: WalkthroughResult;
  notes?: string;
};

type ControlTest = {
  id: string;
  samplePlanRef?: string | null;
  performedAt: string;
  result: TestResult;
  sampleSize: number;
  exceptions: number;
  samplingSource?: "service" | "deterministic-fixture";
};

type Control = {
  id: string;
  cycle: string;
  objective: string;
  description: string;
  owner?: string;
  frequency: Frequency;
  key: boolean;
  walkthroughs: Walkthrough[];
  tests: ControlTest[];
};

type Deficiency = {
  id: string;
  controlId?: string;
  recommendation: string;
  severity: DeficiencySeverity;
  status: DeficiencyStatus;
};

type ItgcGroup = {
  id: string;
  type: "ACCESS" | "CHANGE" | "OPERATIONS";
  scope: string;
  notes?: string;
};

type SamplingPlanItem = {
  id: string;
  populationRef?: string | null;
  description?: string | null;
  stratum?: string | null;
};

type SamplingPlanSummary = {
  id: string;
  size: number;
  generatedAt: string;
  source: "service" | "deterministic-fixture";
  items: SamplingPlanItem[];
};

type StoredAttribute = {
  id?: string;
  description?: string;
  passed?: boolean;
  note?: string;
  sampleItemId?: string | null;
  populationRef?: string | null;
  stratum?: string | null;
  manualReference?: string | null;
};

type ApiControl = {
  id: string;
  cycle: string;
  objective: string;
  description: string;
  owner: string | null;
  frequency: Frequency;
  key: boolean;
  control_walkthroughs?: Array<{
    id: string;
    walkthrough_date: string;
    notes: string | null;
    result: WalkthroughResult;
  }>;
  control_tests?: Array<{
    id: string;
    sample_plan_ref: string | null;
    performed_at: string;
    result: TestResult;
    attributes: unknown;
  }>;
};

type ApiDeficiency = {
  id: string;
  control_id: string | null;
  recommendation: string;
  severity: DeficiencySeverity;
  status: DeficiencyStatus;
};

type ApiItgc = {
  id: string;
  type: "ACCESS" | "CHANGE" | "OPERATIONS";
  scope: string;
  notes: string | null;
};

const frequencyLabels: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
  EVENT_DRIVEN: "Event-driven",
};

const demoControls: Control[] = [
  {
    id: "ctrl-rev-01",
    cycle: "Revenue",
    objective: "Revenue cut-off review",
    description: "Finance reviews unbilled shipments and deferred revenue schedules monthly.",
    owner: "Revenue manager",
    frequency: "MONTHLY",
    key: true,
    walkthroughs: [
      {
        id: "wt-1",
        date: "2025-01-20",
        result: "DESIGNED",
        notes: "Policy documented; exception noted for manual journal sign-off.",
      },
      {
        id: "wt-2",
        date: "2025-02-17",
        result: "IMPLEMENTED",
        notes: "Sample traced to supporting evidence.",
      },
    ],
    tests: [
      {
        id: "test-1",
        samplePlanRef: "REV-ATTR-01",
        performedAt: "2025-02-25T10:00:00Z",
        result: "PASS",
        sampleSize: 30,
        exceptions: 0,
        samplingSource: "service",
      },
    ],
  },
  {
    id: "ctrl-rev-02",
    cycle: "Revenue",
    objective: "Price and discount approvals",
    description: "Salesforce workflow enforces approval for discounts greater than 10% of list price.",
    owner: "Sales operations lead",
    frequency: "EVENT_DRIVEN",
    key: true,
    walkthroughs: [
      {
        id: "wt-3",
        date: "2025-02-05",
        result: "DESIGNED",
        notes: "ITGC dependency on role provisioning.",
      },
      {
        id: "wt-4",
        date: "2025-02-19",
        result: "IMPLEMENTED",
        notes: "Discount logs agree to workflow metadata.",
      },
    ],
    tests: [
      {
        id: "test-2",
        samplePlanRef: "REV-ATTR-02",
        performedAt: "2025-03-01T09:00:00Z",
        result: "PASS",
        sampleSize: 28,
        exceptions: 0,
        samplingSource: "service",
      },
    ],
  },
  {
    id: "ctrl-rev-03",
    cycle: "Revenue",
    objective: "Deferred revenue reconciliation",
    description: "Revenue team reconciles contract liability schedules to the general ledger monthly with review sign-off.",
    owner: "Financial controller",
    frequency: "MONTHLY",
    key: true,
    walkthroughs: [
      {
        id: "wt-5",
        date: "2025-02-07",
        result: "DESIGNED",
        notes: "Two-step sign-off evidenced.",
      },
      {
        id: "wt-6",
        date: "2025-02-24",
        result: "IMPLEMENTED",
        notes: "Reconciliation tie-out observed.",
      },
    ],
    tests: [
      {
        id: "test-3",
        samplePlanRef: "REV-ATTR-03",
        performedAt: "2025-03-05T14:30:00Z",
        result: "EXCEPTIONS",
        sampleSize: 32,
        exceptions: 1,
        samplingSource: "service",
      },
    ],
  },
];

const demoDeficiencies: Deficiency[] = [
  {
    id: "def-1",
    controlId: "ctrl-rev-03",
    recommendation: "One contract released without review evidence; require secondary reviewer sign-off before posting.",
    severity: "MEDIUM",
    status: "OPEN",
  },
];

const demoItgc: ItgcGroup[] = [
  {
    id: "itgc-1",
    type: "ACCESS",
    scope: "Oracle ERP and Salesforce provisioning",
    notes: "SoD conflicts monitored monthly by IT security.",
  },
  {
    id: "itgc-2",
    type: "CHANGE",
    scope: "Revenue recognition scripts (RevPro) change management",
  },
  {
    id: "itgc-3",
    type: "OPERATIONS",
    scope: "Daily interface monitoring between Salesforce and ERP",
  },
];

const tcwgRecipient = "TCWG pack – March 2025";

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const buildDemoSamplingPlan = (controlId: string, size: number): SamplingPlanSummary => ({
  id: `demo-plan-${controlId}-${Date.now()}`,
  size,
  generatedAt: new Date().toISOString(),
  source: "deterministic-fixture",
  items: Array.from({ length: size }, (_, index) => ({
    id: `demo-${controlId}-${index + 1}`,
    populationRef: `DEMO-${index + 1}`,
    description: `Demo sample item ${index + 1}`,
    stratum: index % 2 === 0 ? "Primary" : "Secondary",
  })),
});

const demoOrgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "";
const demoEngagementId = process.env.NEXT_PUBLIC_DEMO_ENGAGEMENT_ID ?? "";
const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "";

type StatusTone = "success" | "error" | "info";

const mapApiAttributes = (value: unknown): StoredAttribute[] => {
  if (!Array.isArray(value)) return [];
  return value as StoredAttribute[];
};

const mapControlFromApi = (record: ApiControl): Control => ({
  id: record.id,
  cycle: record.cycle,
  objective: record.objective,
  description: record.description,
  owner: record.owner ?? undefined,
  frequency: record.frequency,
  key: record.key,
  walkthroughs:
    record.control_walkthroughs?.map(walkthrough => ({
      id: walkthrough.id,
      date: walkthrough.walkthrough_date,
      result: walkthrough.result,
      notes: walkthrough.notes ?? undefined,
    })) ?? [],
  tests:
    record.control_tests?.map(test => {
      const attributes = mapApiAttributes(test.attributes);
      const exceptions = attributes.filter(attribute => attribute?.passed === false).length;
      const samplingSource = test.sample_plan_ref?.startsWith("fixture-")
        ? ("deterministic-fixture" as const)
        : test.sample_plan_ref
        ? ("service" as const)
        : undefined;
      return {
        id: test.id,
        samplePlanRef: test.sample_plan_ref,
        performedAt: test.performed_at,
        result: test.result,
        sampleSize: attributes.length,
        exceptions,
        samplingSource,
      } satisfies ControlTest;
    }) ?? [],
});

const mapDeficiencyFromApi = (record: ApiDeficiency): Deficiency => ({
  id: record.id,
  controlId: record.control_id ?? undefined,
  recommendation: record.recommendation,
  severity: record.severity,
  status: record.status,
});

const mapItgcFromApi = (record: ApiItgc): ItgcGroup => ({
  id: record.id,
  type: record.type,
  scope: record.scope,
  notes: record.notes ?? undefined,
});

export default function ControlsWorkspace() {
  const [orgId, setOrgId] = useState(demoOrgId);
  const [engagementId, setEngagementId] = useState(demoEngagementId);
  const [userId, setUserId] = useState(demoUserId);

  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone | null>(null);

  const [controls, setControls] = useState<Control[]>(demoControls);
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>(demoDeficiencies);
  const [itgcGroups, setItgcGroups] = useState<ItgcGroup[]>(demoItgc);

  const [selectedControlId, setSelectedControlId] = useState<string>(demoControls[0]?.id ?? "");

  const [newControlCycle, setNewControlCycle] = useState("Revenue");
  const [newControlObjective, setNewControlObjective] = useState("");
  const [newControlDescription, setNewControlDescription] = useState("");
  const [newControlOwner, setNewControlOwner] = useState("");
  const [newControlFrequency, setNewControlFrequency] = useState<Frequency>("MONTHLY");
  const [newControlKey, setNewControlKey] = useState(true);

  const [newWalkthroughDate, setNewWalkthroughDate] = useState(todayIso());
  const [newWalkthroughNotes, setNewWalkthroughNotes] = useState("");
  const [newWalkthroughResult, setNewWalkthroughResult] = useState<WalkthroughResult>("IMPLEMENTED");

  const [sampleOutcome, setSampleOutcome] = useState<TestResult>("PASS");
  const [sampleSeverity, setSampleSeverity] = useState<DeficiencySeverity>("MEDIUM");
  const [sampleRecommendation, setSampleRecommendation] = useState(
    "Require documented reviewer sign-off before revenue release journals are posted.",
  );
  const [sampleSize, setSampleSize] = useState(25);
  const [sampleExceptions, setSampleExceptions] = useState(0);

  const [lastSamplingPlan, setLastSamplingPlan] = useState<SamplingPlanSummary | null>(null);

  const [isFetching, setIsFetching] = useState(false);
  const [isSavingControl, setIsSavingControl] = useState(false);
  const [isRecordingWalkthrough, setIsRecordingWalkthrough] = useState(false);
  const [isRunningSample, setIsRunningSample] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const selectedControl = useMemo(
    () => controls.find(control => control.id === selectedControlId) ?? controls[0],
    [controls, selectedControlId],
  );

  useEffect(() => {
    setLastSamplingPlan(null);
  }, [selectedControlId, mode]);

  const tcwgNotices = useMemo(() => {
    return deficiencies.map(def => {
      const relatedControl = def.controlId ? controls.find(ctrl => ctrl.id === def.controlId) : undefined;
      return {
        id: `${tcwgRecipient}-${def.id}`,
        headline: relatedControl
          ? `${relatedControl.cycle}: ${relatedControl.objective}`
          : def.controlId ?? "Unmapped control",
        recommendation: def.recommendation,
        severity: def.severity,
        status: def.status,
      };
    });
  }, [controls, deficiencies]);

  const showStatus = (message: string, tone: StatusTone = "info") => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const resetStatus = () => {
    setStatusMessage(null);
    setStatusTone(null);
  };

  const connectToSupabase = async () => {
    if (!orgId || !engagementId) {
      showStatus("Provide an organisation ID and engagement ID to connect to Supabase.", "error");
      return;
    }

    setIsFetching(true);
    setFetchError(null);
    resetStatus();

    try {
      const response = await fetch(
        `/api/controls?orgId=${encodeURIComponent(orgId)}&engagementId=${encodeURIComponent(engagementId)}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load controls from Supabase.");
      }

      const body = (await response.json()) as {
        controls: ApiControl[];
        deficiencies: ApiDeficiency[];
        itgcGroups: ApiItgc[];
      };

      const mappedControls = body.controls?.map(mapControlFromApi) ?? [];
      const mappedDeficiencies = body.deficiencies?.map(mapDeficiencyFromApi) ?? [];
      const mappedItgc = body.itgcGroups?.map(mapItgcFromApi) ?? [];

      setControls(mappedControls.length > 0 ? mappedControls : []);
      setDeficiencies(mappedDeficiencies);
      setItgcGroups(mappedItgc);

      if (mappedControls.length === 0) {
        setSelectedControlId("");
      } else {
        setSelectedControlId(prev =>
          prev && mappedControls.some(control => control.id === prev) ? prev : mappedControls[0].id,
        );
      }

      setMode("live");
      if (mappedControls.length === 0) {
        showStatus("Connected to Supabase – no controls recorded yet. Use the form below to add one.", "info");
      } else {
        showStatus("Controls, walkthroughs, and deficiencies loaded from Supabase.", "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect to Supabase.";
      setFetchError(message);
      setMode("demo");
      showStatus("Fell back to demo data because live data could not be loaded.", "error");
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddControl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatus();

    if (!newControlObjective.trim() || !newControlDescription.trim()) {
      showStatus("Provide both an objective and description for the control.", "error");
      return;
    }

    setIsSavingControl(true);

    const baseControl: Control = {
      id: `ctrl-${Date.now()}`,
      cycle: newControlCycle.trim() || "Revenue",
      objective: newControlObjective.trim(),
      description: newControlDescription.trim(),
      owner: newControlOwner.trim() || undefined,
      frequency: newControlFrequency,
      key: newControlKey,
      walkthroughs: [],
      tests: [],
    };

    try {
      if (mode === "live") {
        if (!orgId || !engagementId || !userId) {
          throw new Error("Provide organisation, engagement, and user identifiers to add controls in live mode.");
        }

        const response = await fetch("/api/controls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            engagementId,
            userId,
            cycle: baseControl.cycle,
            objective: baseControl.objective,
            description: baseControl.description,
            frequency: baseControl.frequency,
            owner: baseControl.owner,
            key: baseControl.key,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to create control.");
        }

        const { control } = (await response.json()) as { control: ApiControl };
        const mapped = mapControlFromApi(control);
        setControls(prev => [...prev, mapped]);
        setSelectedControlId(mapped.id);
        showStatus("Control added and ready for walkthroughs and testing.", "success");
      } else {
        setControls(prev => [...prev, baseControl]);
        setSelectedControlId(baseControl.id);
        showStatus("Control added in demo mode.", "success");
      }

      setNewControlObjective("");
      setNewControlDescription("");
      setNewControlOwner("");
      setNewControlFrequency("MONTHLY");
      setNewControlKey(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add control.";
      showStatus(message, "error");
    } finally {
      setIsSavingControl(false);
    }
  };

  const handleRecordWalkthrough = async () => {
    if (!selectedControl) {
      showStatus("Select a control before recording a walkthrough.", "error");
      return;
    }

    resetStatus();
    setIsRecordingWalkthrough(true);

    const walkthrough: Walkthrough = {
      id: `wt-${Date.now()}`,
      date: newWalkthroughDate,
      result: newWalkthroughResult,
      notes: newWalkthroughNotes.trim() || undefined,
    };

    try {
      if (mode === "live") {
        if (!orgId || !userId) {
          throw new Error("Provide organisation and user identifiers to record walkthroughs in live mode.");
        }

        const response = await fetch("/api/controls/walkthrough", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            controlId: selectedControl.id,
            userId,
            date: walkthrough.date,
            notes: walkthrough.notes,
            result: walkthrough.result,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to record walkthrough.");
        }

        const { walkthrough: saved } = (await response.json()) as {
          walkthrough: { id: string; walkthrough_date: string; notes: string | null; result: WalkthroughResult };
        };

        const mapped: Walkthrough = {
          id: saved.id,
          date: saved.walkthrough_date,
          result: saved.result,
          notes: saved.notes ?? undefined,
        };

        setControls(prev =>
          prev.map(control =>
            control.id === selectedControl.id
              ? { ...control, walkthroughs: [...control.walkthroughs, mapped] }
              : control,
          ),
        );
        showStatus("Walkthrough documented.", "success");
      } else {
        setControls(prev =>
          prev.map(control =>
            control.id === selectedControl.id
              ? { ...control, walkthroughs: [...control.walkthroughs, walkthrough] }
              : control,
          ),
        );
        showStatus("Walkthrough recorded in demo mode.", "success");
      }

      setNewWalkthroughNotes("");
      setNewWalkthroughResult("IMPLEMENTED");
      setNewWalkthroughDate(todayIso());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to record walkthrough.";
      showStatus(message, "error");
    } finally {
      setIsRecordingWalkthrough(false);
    }
  };

  const handleRunSample = async () => {
    if (!selectedControl) {
      showStatus("Select a control before running attribute testing.", "error");
      return;
    }

    if (sampleSize < 25) {
      showStatus("Sample size must be at least 25 items.", "error");
      return;
    }

    if (sampleExceptions > sampleSize) {
      showStatus("Exceptions cannot exceed the sample size.", "error");
      return;
    }

    const result: TestResult = sampleExceptions > 0 ? "EXCEPTIONS" : sampleOutcome;
    if (result === "EXCEPTIONS" && !sampleRecommendation.trim()) {
      showStatus("Provide a recommendation when exceptions are noted.", "error");
      return;
    }

    resetStatus();
    setIsRunningSample(true);

    const attributes = Array.from({ length: sampleSize }, (_, index) => ({
      id: `attr-${index + 1}`,
      description: `Sample item ${index + 1}`,
      passed: index >= sampleExceptions,
      note: index < sampleExceptions ? "Exception noted" : undefined,
    }));

    try {
      if (mode === "live") {
        if (!orgId || !engagementId || !userId) {
          throw new Error("Provide organisation, engagement, and user identifiers to run testing in live mode.");
        }

        const response = await fetch("/api/controls/test/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            engagementId,
            controlId: selectedControl.id,
            userId,
            attributes,
            result,
            deficiencyRecommendation: result === "EXCEPTIONS" ? sampleRecommendation.trim() : undefined,
            deficiencySeverity: result === "EXCEPTIONS" ? sampleSeverity : undefined,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to record test run.");
        }

        const { test: savedTest, deficiency, samplingPlan } = (await response.json()) as {
          test: {
            id: string;
            sample_plan_ref: string | null;
            performed_at: string;
            result: TestResult;
            attributes: unknown;
          };
          deficiency: ApiDeficiency | null;
          samplingPlan?: SamplingPlanSummary | null;
        };

        const savedAttributes = mapApiAttributes(savedTest.attributes);
        const mappedTest: ControlTest = {
          id: savedTest.id,
          samplePlanRef: savedTest.sample_plan_ref,
          performedAt: savedTest.performed_at,
          result: savedTest.result,
          sampleSize: savedAttributes.length,
          exceptions: savedAttributes.filter(attribute => attribute?.passed === false).length,
          samplingSource:
            samplingPlan?.source ??
            (savedTest.sample_plan_ref?.startsWith("fixture-") ? "deterministic-fixture" : "service"),
        };

        setLastSamplingPlan(
          samplingPlan ?? {
            id: mappedTest.samplePlanRef ?? `plan-${mappedTest.id}`,
            size: mappedTest.sampleSize,
            generatedAt: new Date().toISOString(),
            source: mappedTest.samplingSource ?? "service",
            items: [],
          },
        );

        setControls(prev =>
          prev.map(control =>
            control.id === selectedControl.id
              ? { ...control, tests: [...control.tests, mappedTest] }
              : control,
          ),
        );

        const planLabel = mappedTest.samplePlanRef ?? "sampling plan";
        const planSourceLabel =
          mappedTest.samplingSource === "service" ? "Sampling C1" : "deterministic fixture";
        if (deficiency) {
          const mappedDef = mapDeficiencyFromApi(deficiency);
          setDeficiencies(prev => [mappedDef, ...prev]);
          showStatus(
            `Test recorded with ${planLabel} (${planSourceLabel}); deficiency pushed to TCWG pack.`,
            "success",
          );
        } else {
          showStatus(`Test recorded with ${planLabel} (${planSourceLabel}).`, "success");
        }
      } else {
        const plan = buildDemoSamplingPlan(selectedControl.id, sampleSize);
        const demoTest: ControlTest = {
          id: `test-${Date.now()}`,
          samplePlanRef: plan.id,
          performedAt: plan.generatedAt,
          result,
          sampleSize,
          exceptions: sampleExceptions,
          samplingSource: plan.source,
        };

        setLastSamplingPlan(plan);
        setControls(prev =>
          prev.map(control =>
            control.id === selectedControl.id
              ? { ...control, tests: [...control.tests, demoTest] }
              : control,
          ),
        );

        if (result === "EXCEPTIONS") {
          const demoDef: Deficiency = {
            id: `def-${Date.now()}`,
            controlId: selectedControl.id,
            recommendation: sampleRecommendation.trim(),
            severity: sampleSeverity,
            status: "OPEN",
          };
          setDeficiencies(prev => [demoDef, ...prev]);
          showStatus(
            `Test recorded with fixture plan ${plan.id}; deficiency added for TCWG in demo mode.`,
            "success",
          );
        } else {
          showStatus(`Test recorded in demo mode using plan ${plan.id}.`, "success");
        }
      }

      setSampleOutcome("PASS");
      setSampleExceptions(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run control testing.";
      showStatus(message, "error");
    } finally {
      setIsRunningSample(false);
    }
  };

  return (
    <main className="space-y-6 p-6" aria-labelledby="audit-controls-heading">
      <header className="space-y-2">
        <h1 id="audit-controls-heading" className="text-2xl font-semibold">
          Audit Controls &amp; ITGC Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Register key controls, document design and implementation walkthroughs, execute attribute testing, and promote any
          deficiencies directly into Those Charged With Governance (TCWG) reporting.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-4 shadow-sm" aria-labelledby="engagement-context">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="engagement-context" className="text-lg font-semibold">
              Engagement context
            </h2>
            <p className="text-sm text-muted-foreground">
              Provide identifiers to pull live data from Supabase. Leave blank to work in demo mode with local data.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              mode === "live"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {mode === "live" ? "Live Supabase data" : "Demo data (local)"}
          </span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium" htmlFor="org-id">
            Organisation ID
            <input
              id="org-id"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={orgId}
              onChange={event => setOrgId(event.target.value.trim())}
              placeholder="UUID"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="engagement-id">
            Engagement ID
            <input
              id="engagement-id"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={engagementId}
              onChange={event => setEngagementId(event.target.value.trim())}
              placeholder="UUID"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="user-id">
            User ID (for audit log)
            <input
              id="user-id"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={userId}
              onChange={event => setUserId(event.target.value.trim())}
              placeholder="UUID"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            onClick={connectToSupabase}
            disabled={isFetching}
          >
            {isFetching ? "Loading..." : "Connect & refresh"}
          </button>
          {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}
        </div>
      </section>

      {statusMessage && (
        <div
          className={`rounded border p-3 text-sm ${
            statusTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : statusTone === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          {statusMessage}
        </div>
      )}

      <section className="rounded-lg border bg-card p-4 shadow-sm" aria-labelledby="controls-matrix">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="controls-matrix" className="text-lg font-semibold">
            Controls matrix
          </h2>
          <label className="text-sm">
            <span className="mr-2 font-medium">Focus control</span>
            <select
              className="rounded border px-2 py-1"
              value={selectedControl?.id ?? ""}
              onChange={event => setSelectedControlId(event.target.value)}
            >
              {controls.map(control => (
                <option key={control.id} value={control.id}>
                  {control.cycle} · {control.objective}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="p-2">Cycle</th>
                <th className="p-2">Objective</th>
                <th className="p-2">Description</th>
                <th className="p-2">Owner</th>
                <th className="p-2">Frequency</th>
                <th className="p-2">Key?</th>
                <th className="p-2">Walkthroughs</th>
                <th className="p-2">Tests</th>
              </tr>
            </thead>
            <tbody>
              {controls.map(control => (
                <tr key={control.id} className="border-b last:border-0">
                  <td className="p-2">{control.cycle}</td>
                  <td className="p-2 font-medium">{control.objective}</td>
                  <td className="p-2 text-muted-foreground">{control.description}</td>
                  <td className="p-2">{control.owner ?? "—"}</td>
                  <td className="p-2">{frequencyLabels[control.frequency]}</td>
                  <td className="p-2">{control.key ? "Yes" : "No"}</td>
                  <td className="p-2">{control.walkthroughs.length}</td>
                  <td className="p-2">{control.tests.length}</td>
                </tr>
              ))}
              {controls.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-muted-foreground">
                    No controls recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-lg border bg-muted/30 p-4" aria-labelledby="add-control">
          <h3 id="add-control" className="text-sm font-semibold">
            Add a new control
          </h3>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleAddControl}>
            <label className="text-sm font-medium" htmlFor="control-cycle">
              Cycle
              <input
                id="control-cycle"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={newControlCycle}
                onChange={event => setNewControlCycle(event.target.value)}
                placeholder="Revenue"
              />
            </label>
            <label className="text-sm font-medium" htmlFor="control-objective">
              Objective
              <input
                id="control-objective"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={newControlObjective}
                onChange={event => setNewControlObjective(event.target.value)}
                placeholder="Describe the objective"
              />
            </label>
            <label className="text-sm font-medium md:col-span-2" htmlFor="control-description">
              Description
              <textarea
                id="control-description"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={newControlDescription}
                onChange={event => setNewControlDescription(event.target.value)}
                rows={3}
                placeholder="How is the control performed?"
              />
            </label>
            <label className="text-sm font-medium" htmlFor="control-owner">
              Owner
              <input
                id="control-owner"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={newControlOwner}
                onChange={event => setNewControlOwner(event.target.value)}
                placeholder="Control owner"
              />
            </label>
            <label className="text-sm font-medium" htmlFor="control-frequency">
              Frequency
              <select
                id="control-frequency"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={newControlFrequency}
                onChange={event => setNewControlFrequency(event.target.value as Frequency)}
              >
                {Object.entries(frequencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={newControlKey}
                onChange={event => setNewControlKey(event.target.checked)}
              />
              Key control
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                disabled={isSavingControl}
              >
                {isSavingControl ? "Saving..." : "Add control"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]" aria-label="Control evidence capture">
        <article className="rounded-lg border bg-card p-4 shadow-sm" aria-labelledby="walkthrough-and-testing">
          <h3 id="walkthrough-and-testing" className="text-lg font-semibold">
            Walkthroughs &amp; attribute testing
          </h3>
          {selectedControl ? (
            <div className="mt-4 space-y-6">
              <div>
                <h4 className="text-sm font-semibold">{selectedControl.objective}</h4>
                <p className="text-sm text-muted-foreground">{selectedControl.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Owner: {selectedControl.owner ?? "—"} · Frequency: {frequencyLabels[selectedControl.frequency]} · Key:
                  {" "}
                  {selectedControl.key ? "Yes" : "No"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2" aria-label="Walkthrough capture">
                <div className="rounded border p-3">
                  <h4 className="text-sm font-semibold">Record walkthrough</h4>
                  <label className="mt-2 block text-sm font-medium" htmlFor="walkthrough-date">
                    Date
                    <input
                      id="walkthrough-date"
                      type="date"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={newWalkthroughDate}
                      onChange={event => setNewWalkthroughDate(event.target.value)}
                    />
                  </label>
                  <label className="mt-2 block text-sm font-medium" htmlFor="walkthrough-result">
                    Result
                    <select
                      id="walkthrough-result"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={newWalkthroughResult}
                      onChange={event => setNewWalkthroughResult(event.target.value as WalkthroughResult)}
                    >
                      <option value="DESIGNED">Designed</option>
                      <option value="NOT_DESIGNED">Not designed</option>
                      <option value="IMPLEMENTED">Implemented</option>
                      <option value="NOT_IMPLEMENTED">Not implemented</option>
                    </select>
                  </label>
                  <label className="mt-2 block text-sm font-medium" htmlFor="walkthrough-notes">
                    Notes
                    <textarea
                      id="walkthrough-notes"
                      className="mt-1 h-20 w-full rounded border px-2 py-1 text-sm"
                      value={newWalkthroughNotes}
                      onChange={event => setNewWalkthroughNotes(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="mt-3 w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    onClick={handleRecordWalkthrough}
                    disabled={isRecordingWalkthrough}
                  >
                    {isRecordingWalkthrough ? "Saving..." : "Record walkthrough"}
                  </button>
                </div>

                <div className="rounded border p-3" aria-label="Attribute testing">
                  <h4 className="text-sm font-semibold">Run attribute sample (n ≥ 25)</h4>
                  <div className="mt-2 rounded border border-dashed bg-muted/40 p-3 text-xs" aria-live="polite">
                    {lastSamplingPlan ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Latest sampling plan</p>
                        <p>
                          <span className="font-medium">{lastSamplingPlan.id}</span>
                          {" · "}
                          {lastSamplingPlan.size} items
                          {" · "}
                          {lastSamplingPlan.source === "service" ? "Sampling C1" : "Deterministic fixture"}
                        </p>
                        <p className="text-muted-foreground">
                          Generated {formatDateTime(lastSamplingPlan.generatedAt)}
                        </p>
                      </div>
                    ) : (
                      <p>
                        No sampling plan generated yet. Running a sample will request one from Sampling C1 (with a deterministic
                        fallback if unavailable).
                      </p>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-sm font-medium" htmlFor="sample-size">
                      Sample size
                      <input
                        id="sample-size"
                        type="number"
                        min={25}
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        value={sampleSize}
                        onChange={event => {
                          const value = Number(event.target.value);
                          const safeValue = Number.isNaN(value) ? 25 : Math.max(25, value);
                          setSampleSize(safeValue);
                          setSampleExceptions(prev => Math.min(prev, safeValue));
                        }}
                      />
                    </label>
                    <label className="text-sm font-medium" htmlFor="sample-exceptions">
                      Exceptions
                      <input
                        id="sample-exceptions"
                        type="number"
                        min={0}
                        max={sampleSize}
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        value={sampleExceptions}
                        onChange={event => {
                          const value = Number(event.target.value);
                          const safeValue = Number.isNaN(value) ? 0 : Math.min(Math.max(0, value), sampleSize);
                          setSampleExceptions(safeValue);
                          if (safeValue === 0) {
                            setSampleOutcome("PASS");
                          }
                        }}
                      />
                    </label>
                  </div>
                  <label className="mt-2 block text-sm font-medium" htmlFor="sample-outcome">
                    Outcome
                    <select
                      id="sample-outcome"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={sampleOutcome}
                      onChange={event => {
                        const value = event.target.value as TestResult;
                        setSampleOutcome(value);
                        if (value === "PASS") {
                          setSampleExceptions(0);
                        }
                      }}
                    >
                      <option value="PASS">Pass – no deviations</option>
                      <option value="EXCEPTIONS">Exceptions – raise deficiency</option>
                    </select>
                  </label>
                  <label className="mt-2 block text-sm font-medium" htmlFor="sample-recommendation">
                    Recommendation (required when exceptions noted)
                    <textarea
                      id="sample-recommendation"
                      className="mt-1 h-20 w-full rounded border px-2 py-1 text-sm"
                      value={sampleRecommendation}
                      onChange={event => setSampleRecommendation(event.target.value)}
                    />
                  </label>
                  <label className="mt-2 block text-sm font-medium" htmlFor="sample-severity">
                    Severity for exceptions
                    <select
                      id="sample-severity"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={sampleSeverity}
                      onChange={event => setSampleSeverity(event.target.value as DeficiencySeverity)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="mt-3 w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    onClick={handleRunSample}
                    disabled={isRunningSample}
                  >
                    {isRunningSample ? "Running..." : "Run sample"}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Recent walkthroughs</h4>
                <ul className="mt-2 space-y-2">
                  {selectedControl.walkthroughs.map(item => (
                    <li key={item.id} className="rounded border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatDate(item.date)}</span>
                        <span>{item.result.replace("_", " ")}</span>
                      </div>
                      {item.notes && <p className="mt-1 text-muted-foreground">{item.notes}</p>}
                    </li>
                  ))}
                  {selectedControl.walkthroughs.length === 0 && (
                    <li className="text-sm text-muted-foreground">No walkthroughs recorded yet.</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Recent test runs</h4>
                <ul className="mt-2 space-y-2">
                  {selectedControl.tests.map(test => (
                    <li key={test.id} className="rounded border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{test.samplePlanRef ?? "Sampling run"}</span>
                        <span
                          className={
                            test.result === "PASS"
                              ? "text-emerald-600"
                              : "text-destructive font-semibold"
                          }
                        >
                          {test.result} · {test.sampleSize} items
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Performed {formatDateTime(test.performedAt)}</p>
                      {test.exceptions > 0 && <p className="mt-1">Exceptions: {test.exceptions}</p>}
                    </li>
                  ))}
                  {selectedControl.tests.length === 0 && (
                    <li className="text-sm text-muted-foreground">No testing performed yet.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Add a control to begin capturing evidence.</p>
          )}
        </article>

        <article className="rounded-lg border bg-card p-4 shadow-sm" aria-labelledby="deficiency-tracker">
          <h3 id="deficiency-tracker" className="text-lg font-semibold">
            Deficiency tracker
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Exceptions from walkthroughs or testing automatically surface here for remediation and TCWG communications.
          </p>
          <ul className="mt-4 space-y-2">
            {deficiencies.map(def => {
              const control = def.controlId ? controls.find(ctrl => ctrl.id === def.controlId) : undefined;
              return (
                <li key={def.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{control ? control.objective : def.controlId ?? "Unmapped"}</span>
                    <span
                      className={
                        def.severity === "HIGH"
                          ? "text-destructive font-semibold"
                          : def.severity === "MEDIUM"
                          ? "text-amber-600 font-semibold"
                          : "text-emerald-600"
                      }
                    >
                      {def.severity}
                    </span>
                  </div>
                  <p className="mt-1">{def.recommendation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Status: {def.status}</p>
                </li>
              );
            })}
            {deficiencies.length === 0 && <li className="text-sm text-muted-foreground">No open deficiencies.</li>}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Monitoring panels">
        <article className="rounded-lg border bg-card p-4 shadow-sm" aria-labelledby="itgc-panel">
          <h3 id="itgc-panel" className="text-lg font-semibold">
            ITGC coverage
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the information technology general controls underpinning the engagement systems.
          </p>
          <ul className="mt-4 space-y-2">
            {itgcGroups.map(group => (
              <li key={group.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{group.type} controls</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Scope</span>
                </div>
                <p className="mt-1">{group.scope}</p>
                {group.notes && <p className="mt-1 text-xs text-muted-foreground">{group.notes}</p>}
              </li>
            ))}
            {itgcGroups.length === 0 && <li className="text-sm text-muted-foreground">No ITGC groupings captured.</li>}
          </ul>
        </article>

        <article className="rounded-lg border bg-card p-4 shadow-sm" aria-labelledby="tcwg-pack">
          <h3 id="tcwg-pack" className="text-lg font-semibold">
            {tcwgRecipient}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Items raised here flow automatically from the deficiency register for governance discussions.
          </p>
          <ul className="mt-4 space-y-2">
            {tcwgNotices.map(notice => (
              <li key={notice.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{notice.headline}</span>
                  <span
                    className={
                      notice.severity === "HIGH"
                        ? "text-destructive font-semibold"
                        : notice.severity === "MEDIUM"
                        ? "text-amber-600 font-semibold"
                        : "text-emerald-600"
                    }
                  >
                    {notice.severity}
                  </span>
                </div>
                <p className="mt-1">{notice.recommendation}</p>
                <p className="mt-1 text-xs text-muted-foreground">Status: {notice.status}</p>
              </li>
            ))}
            {tcwgNotices.length === 0 && <li className="text-sm text-muted-foreground">No items for TCWG this period.</li>}
          </ul>
        </article>
      </section>
    </main>
  );
}
