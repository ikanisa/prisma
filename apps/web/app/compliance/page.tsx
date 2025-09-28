'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';

interface PackDefinition {
  key: string;
  title: string;
  description: string;
  sample: string;
}

const PACKS: PackDefinition[] = [
  {
    key: 'malta_vat_2025',
    title: 'Malta VAT 2025',
    description: 'Compute VAT output, deductible input VAT, and net payable for Malta 2025 rules.',
    sample: JSON.stringify(
      {
        partial_exemption_coeff: 0.7,
        turnover_breakdown: {
          std_taxable_net: 10000,
          red7_taxable_net: 1500,
          red5_taxable_net: 800,
          zero_rated: 0,
          exempt: 0,
        },
        input_vat_total: 900,
      },
      null,
      2,
    ),
  },
  {
    key: 'malta_cit_2025',
    title: 'Malta CIT 2025',
    description: 'Calculate taxable income and corporate tax payable using configurable adjustments.',
    sample: JSON.stringify(
      {
        accounting_profit: 100000,
        add_backs: [
          { label: 'Entertainment disallowance', amount: 2000 },
          { label: 'Non-deductible fines', amount: 500 },
        ],
        deductions: [
          { label: 'Capital allowances', amount: 5000 },
        ],
        losses_bf: 10000,
        tax_rate: 0.35,
      },
      null,
      2,
    ),
  },
  {
    key: 'gap_sme_2025',
    title: 'GAPSME Notes 2025',
    description: 'Checklist skeleton for GAPSME reporting notes. No calculations yet.',
    sample: JSON.stringify(
      {
        notes: [
          { section: 'General Compliance', status: 'pending' },
        ],
      },
      null,
      2,
    ),
  },
];

interface EvaluationResponse {
  outputs: Record<string, number | boolean | null>;
  errors: string[];
  provenance: { packKey: string; version: string };
}

export default function CompliancePage() {
  const [selectedPack, setSelectedPack] = useState<PackDefinition>(PACKS[0]);
  const [inputJson, setInputJson] = useState<string>(PACKS[0].sample);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (pack: PackDefinition) => {
    setSelectedPack(pack);
    setResult(null);
  };

  const handleEvaluate = async () => {
    setStatusMessage(null);
    setResult(null);

    let parsedValues: Record<string, unknown>;
    try {
      parsedValues = JSON.parse(inputJson);
      if (parsedValues === null || Array.isArray(parsedValues) || typeof parsedValues !== 'object') {
        throw new Error('Values JSON must describe an object');
      }
    } catch (error) {
      setStatusMessage((error as Error).message || 'Invalid JSON payload');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/compliance/eval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packKey: selectedPack.key,
          values: parsedValues,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setStatusMessage(payload.error ?? 'Evaluation request failed');
        return;
      }

      const payload = (await response.json()) as EvaluationResponse;
      setResult(payload);
      setStatusMessage(payload.errors.length ? 'Completed with validations' : 'Evaluation successful');
    } catch (error) {
      setStatusMessage((error as Error).message || 'Unexpected error during evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance Evaluator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a compliance pack, paste JSON inputs, and generate the computed outputs using the config-driven evaluator.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PACKS.map((pack) => {
          const isSelected = pack.key === selectedPack.key;
          const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleSelect(pack);
            }
          };
          return (
            <div
              key={pack.key}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(pack)}
              onKeyDown={handleKeyDown}
              className={`rounded border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-medium">{pack.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{pack.description}</p>
                </div>
                {isSelected && <span className="text-sm font-semibold text-blue-600">Selected</span>}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="rounded border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-500 hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPack(pack);
                    setInputJson(pack.sample);
                    setResult(null);
                    setStatusMessage(null);
                  }}
                >
                  Use sample values
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="values" className="text-sm font-medium">
          Values JSON
        </label>
        <textarea
          id="values"
          className="min-h-[200px] rounded border border-border bg-background p-3 font-mono text-sm"
          value={inputJson}
          onChange={(event) => setInputJson(event.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={handleEvaluate}
          disabled={loading}
        >
          {loading ? 'Evaluating…' : 'Evaluate'}
        </button>
        {statusMessage && <span className="text-sm text-muted-foreground">{statusMessage}</span>}
      </div>

      {result && (
        <div className="space-y-4 rounded border border-border p-4">
          <div>
            <h3 className="text-lg font-semibold">Outputs</h3>
            {Object.keys(result.outputs).length === 0 ? (
              <p className="text-sm text-muted-foreground">No calculated outputs for this pack yet.</p>
            ) : (
              <dl className="mt-2 grid gap-2 md:grid-cols-2">
                {Object.entries(result.outputs).map(([key, value]) => (
                  <div key={key} className="rounded bg-muted p-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{key}</dt>
                    <dd className="text-sm font-medium">{value ?? 0}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold">Errors</h3>
            {result.errors.length === 0 ? (
              <p className="text-sm text-green-600">No validation errors.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600">
                {result.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Source: {result.provenance.packKey} ({result.provenance.version})
          </p>
        </div>
      )}
    </div>
  );
}
