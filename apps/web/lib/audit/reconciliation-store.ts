import { randomUUID } from 'crypto';
import {
  CloseReconciliationInput,
  CreateReconciliationInput,
  DeterministicMatchOptions,
  MatchStrategy,
  ReconEvidence,
  ReconItem,
  ReconciliationRecord,
  ReconciliationSnapshot,
  ReconciliationSummary,
  ReconciliationType,
  ResolveReconItemInput,
  StatementImportInput,
  StatementLineInput,
  StatementSide,
} from './reconciliation-types';
import { logReconAction } from './activity-log';

type InternalReconciliation = ReconciliationRecord & {
  controlReference?: string;
  statementIds: string[];
  matchIds: string[];
  itemIds: string[];
  evidenceIds: string[];
};

type InternalStatement = {
  id: string;
  reconciliationId: string;
  side: StatementSide;
  sourceName: string;
  statementDate: string | null;
  importedAt: string;
  importedBy?: string;
  lines: InternalStatementLine[];
};

type InternalStatementLine = {
  id: string;
  statementId: string;
  reconciliationId: string;
  side: StatementSide;
  date: string | null;
  description: string;
  reference?: string;
  amount: number;
  matchGroupId?: string;
};

type InternalMatch = {
  id: string;
  reconciliationId: string;
  strategy: MatchStrategy;
  ledgerLineIds: string[];
  externalLineIds: string[];
  createdAt: string;
};

type InternalItem = ReconItem;

type InternalEvidence = ReconEvidence;

const STORE_KEY = Symbol.for('audit.reconciliation.store');

type ReconStoreGlobal = typeof globalThis & {
  [STORE_KEY]?: ReconciliationStore;
};

function clone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeAmount(amount: number): number {
  if (Number.isNaN(amount) || !Number.isFinite(amount)) {
    throw new Error('Amount must be a finite number');
  }
  return Math.round(amount * 100) / 100;
}

function validateLines(lines: StatementLineInput[]): void {
  if (!Array.isArray(lines) || !lines.length) {
    throw new Error('At least one statement line is required');
  }
  for (const [index, line] of lines.entries()) {
    if (typeof line.description !== 'string' || !line.description.trim()) {
      throw new Error(`Line ${index + 1} is missing a description`);
    }
    if (typeof line.date !== 'string' || !line.date.trim()) {
      throw new Error(`Line ${index + 1} requires a date value`);
    }
    if (typeof line.amount !== 'number' || Number.isNaN(line.amount)) {
      throw new Error(`Line ${index + 1} requires a numeric amount`);
    }
  }
}

function defaultCurrency(input?: string): string {
  return input?.trim() || 'USD';
}

function ensureStrategyOrder(strategies?: MatchStrategy[]): MatchStrategy[] {
  if (!strategies || !strategies.length) {
    return ['AMOUNT_AND_DATE', 'AMOUNT_ONLY'];
  }
  const unique = Array.from(new Set(strategies));
  return unique.filter((strategy) => strategy === 'AMOUNT_AND_DATE' || strategy === 'AMOUNT_ONLY');
}

export class ReconciliationStore {
  private reconciliations = new Map<string, InternalReconciliation>();

  private statements = new Map<string, InternalStatement>();

  private matches = new Map<string, InternalMatch>();

  private items = new Map<string, InternalItem>();

  private evidence = new Map<string, InternalEvidence>();

  createReconciliation(input: CreateReconciliationInput): ReconciliationSnapshot {
    const now = new Date().toISOString();
    const id = randomUUID();
    const record: InternalReconciliation = {
      id,
      orgId: input.orgId,
      engagementId: input.engagementId,
      controlReference: input.controlReference,
      name: input.name.trim(),
      type: input.type,
      currency: defaultCurrency(input.currency),
      status: 'OPEN',
      periodStart: normalizeDate(input.periodStart)!,
      periodEnd: normalizeDate(input.periodEnd)!,
      createdAt: now,
      updatedAt: now,
      statementIds: [],
      matchIds: [],
      itemIds: [],
      evidenceIds: [],
    };

    if (record.periodStart > record.periodEnd) {
      throw new Error('periodStart must be on or before periodEnd');
    }

    this.reconciliations.set(id, record);

    logReconAction('RECON_CREATED', {
      reconciliationId: id,
      type: input.type,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
    });

    return this.buildSnapshot(record);
  }

  listSummaries(): ReconciliationSummary[] {
    const summaries: ReconciliationSummary[] = [];
    for (const recon of this.reconciliations.values()) {
      const snapshot = this.buildSnapshot(recon);
      const outstanding = snapshot.items.filter((item) => item.status === 'OUTSTANDING');
      const outstandingTotal = outstanding.reduce((sum, item) => sum + item.amount, 0);
      summaries.push({
        id: snapshot.id,
        orgId: snapshot.orgId,
        engagementId: snapshot.engagementId,
        controlReference: snapshot.controlReference,
        name: snapshot.name,
        type: snapshot.type,
        currency: snapshot.currency,
        status: snapshot.status,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        lastMatchedAt: snapshot.lastMatchedAt,
        closedAt: snapshot.closedAt,
        closedBy: snapshot.closedBy,
        summary: snapshot.summary,
        outstandingItems: outstanding.length,
        outstandingTotal: Math.round(outstandingTotal * 100) / 100,
      });
    }

    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getSnapshot(id: string): ReconciliationSnapshot | null {
    const record = this.reconciliations.get(id);
    if (!record) {
      return null;
    }
    return this.buildSnapshot(record);
  }

  importStatement(reconciliationId: string, payload: StatementImportInput) {
    const recon = this.requireReconciliation(reconciliationId);
    validateLines(payload.lines);

    const now = new Date().toISOString();
    const statementId = randomUUID();
    const normalizedDate = normalizeDate(payload.statementDate);

    const lines: InternalStatementLine[] = payload.lines.map((line) => ({
      id: randomUUID(),
      statementId,
      reconciliationId,
      side: payload.side,
      date: normalizeDate(line.date),
      description: line.description.trim(),
      reference: line.reference?.trim() || undefined,
      amount: normalizeAmount(line.amount),
    }));

    lines.sort((a, b) => {
      const dateCompare = (a.date ?? '').localeCompare(b.date ?? '');
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return a.description.localeCompare(b.description);
    });

    const statement: InternalStatement = {
      id: statementId,
      reconciliationId,
      side: payload.side,
      sourceName: payload.sourceName.trim(),
      statementDate: normalizedDate,
      importedAt: now,
      importedBy: payload.importedBy?.trim() || undefined,
      lines,
    };

    this.statements.set(statementId, statement);
    recon.statementIds.push(statementId);
    recon.status = recon.status === 'OPEN' ? 'IN_PROGRESS' : recon.status;
    recon.updatedAt = now;

    logReconAction('RECON_STATEMENT_IMPORTED', {
      reconciliationId,
      statementId,
      side: payload.side,
      lineCount: lines.length,
      sourceName: payload.sourceName,
    });

    return {
      statement: clone(statement),
      snapshot: this.buildSnapshot(recon),
    };
  }

  runDeterministicMatch(reconciliationId: string, options?: DeterministicMatchOptions) {
    const recon = this.requireReconciliation(reconciliationId);
    const strategies = ensureStrategyOrder(options?.strategies);
    const now = new Date().toISOString();

    // Clear previous auto generated matches
    for (const matchId of recon.matchIds) {
      this.matches.delete(matchId);
    }
    recon.matchIds = [];

    const statements = recon.statementIds
      .map((id) => this.statements.get(id))
      .filter((stmt): stmt is InternalStatement => Boolean(stmt));

    for (const statement of statements) {
      statement.lines = statement.lines.map((line) => ({ ...line, matchGroupId: undefined }));
      this.statements.set(statement.id, statement);
    }

    const retainedItemIds: string[] = [];
    const resolvedAutoLineIds = new Set<string>();
    for (const itemId of recon.itemIds) {
      const item = this.items.get(itemId);
      if (!item) {
        continue;
      }
      if (item.origin === 'AUTOMATCH' && item.status === 'OUTSTANDING') {
        this.items.delete(itemId);
      } else {
        if (item.origin === 'AUTOMATCH' && Array.isArray(item.sourceLineIds)) {
          for (const lineId of item.sourceLineIds) {
            resolvedAutoLineIds.add(lineId);
          }
        }
        retainedItemIds.push(itemId);
      }
    }
    recon.itemIds = retainedItemIds;

    const ledgerLines: InternalStatementLine[] = [];
    const externalLines: InternalStatementLine[] = [];
    for (const statement of statements) {
      for (const line of statement.lines) {
        if (line.side === 'LEDGER') {
          ledgerLines.push(line);
        } else {
          externalLines.push(line);
        }
      }
    }

    const ledgerById = new Map(ledgerLines.map((line) => [line.id, line] as const));
    const externalById = new Map(externalLines.map((line) => [line.id, line] as const));
    const unmatchedLedger = new Set(ledgerLines.map((line) => line.id));
    const unmatchedExternal = new Set(externalLines.map((line) => line.id));

    const matches: InternalMatch[] = [];

    const applyMatch = (
      ledgerLine: InternalStatementLine,
      externalLine: InternalStatementLine,
      strategy: MatchStrategy,
    ) => {
      const matchId = randomUUID();
      ledgerLine.matchGroupId = matchId;
      externalLine.matchGroupId = matchId;
      unmatchedLedger.delete(ledgerLine.id);
      unmatchedExternal.delete(externalLine.id);
      const match: InternalMatch = {
        id: matchId,
        reconciliationId,
        strategy,
        ledgerLineIds: [ledgerLine.id],
        externalLineIds: [externalLine.id],
        createdAt: now,
      };
      matches.push(match);
      this.matches.set(matchId, match);
      recon.matchIds.push(matchId);
    };

    if (strategies.includes('AMOUNT_AND_DATE')) {
      const externalBuckets = new Map<string, InternalStatementLine[]>();
      for (const line of externalLines) {
        if (!line.date || !unmatchedExternal.has(line.id)) {
          continue;
        }
        const key = `${line.amount.toFixed(2)}|${line.date}`;
        const bucket = externalBuckets.get(key) ?? [];
        bucket.push(line);
        externalBuckets.set(key, bucket);
      }

      for (const line of ledgerLines) {
        if (!line.date || !unmatchedLedger.has(line.id)) {
          continue;
        }
        const key = `${line.amount.toFixed(2)}|${line.date}`;
        const bucket = externalBuckets.get(key);
        if (!bucket || !bucket.length) {
          continue;
        }
        const candidate = bucket.shift()!;
        applyMatch(line, candidate, 'AMOUNT_AND_DATE');
        if (!bucket.length) {
          externalBuckets.delete(key);
        }
      }
    }

    if (strategies.includes('AMOUNT_ONLY')) {
      const externalBuckets = new Map<string, InternalStatementLine[]>();
      for (const line of externalLines) {
        if (!unmatchedExternal.has(line.id)) {
          continue;
        }
        const key = line.amount.toFixed(2);
        const bucket = externalBuckets.get(key) ?? [];
        bucket.push(line);
        externalBuckets.set(key, bucket);
      }

      for (const line of ledgerLines) {
        if (!unmatchedLedger.has(line.id)) {
          continue;
        }
        const key = line.amount.toFixed(2);
        const bucket = externalBuckets.get(key);
        if (!bucket || !bucket.length) {
          continue;
        }
        const candidate = bucket.shift()!;
        applyMatch(line, candidate, 'AMOUNT_ONLY');
        if (!bucket.length) {
          externalBuckets.delete(key);
        }
      }
    }

    const outstandingItems: InternalItem[] = [];

    unmatchedLedger.forEach((lineId) => {
      const line = ledgerById.get(lineId);
      if (!line) {
        return;
      }
      if (resolvedAutoLineIds.has(line.id)) {
        return;
      }
      const itemId = randomUUID();
      const item: InternalItem = {
        id: itemId,
        reconciliationId,
        side: 'LEDGER',
        amount: line.amount,
        reason: 'LEDGER_UNMATCHED',
        origin: 'AUTOMATCH',
        status: 'OUTSTANDING',
        isMisstatement: false,
        createdAt: now,
        updatedAt: now,
        sourceLineIds: [line.id],
      };
      this.items.set(itemId, item);
      recon.itemIds.push(itemId);
      outstandingItems.push(item);
    });

    unmatchedExternal.forEach((lineId) => {
      const line = externalById.get(lineId);
      if (!line) {
        return;
      }
      if (resolvedAutoLineIds.has(line.id)) {
        return;
      }
      const itemId = randomUUID();
      const item: InternalItem = {
        id: itemId,
        reconciliationId,
        side: 'EXTERNAL',
        amount: line.amount,
        reason: 'EXTERNAL_UNMATCHED',
        origin: 'AUTOMATCH',
        status: 'OUTSTANDING',
        isMisstatement: false,
        createdAt: now,
        updatedAt: now,
        sourceLineIds: [line.id],
      };
      this.items.set(itemId, item);
      recon.itemIds.push(itemId);
      outstandingItems.push(item);
    });

    recon.lastMatchedAt = now;
    if (recon.status === 'OPEN' && (matches.length || outstandingItems.length)) {
      recon.status = 'IN_PROGRESS';
    }
    recon.updatedAt = now;

    logReconAction('RECON_AUTOMATCH_COMPLETED', {
      reconciliationId,
      matchCount: matches.length,
      outstandingCount: outstandingItems.length,
      strategies,
    });

    return {
      matches: matches.map((match) => clone(match)),
      outstanding: outstandingItems.map((item) => clone(item)),
      snapshot: this.buildSnapshot(recon),
    };
  }

  resolveItem(itemId: string, payload: ResolveReconItemInput) {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Reconciling item not found');
    }

    const recon = this.requireReconciliation(item.reconciliationId);
    const now = new Date().toISOString();

    const isMisstatement = Boolean(payload.flaggedAsMisstatement);
    const shouldResolve = payload.cleared || isMisstatement;

    item.resolutionNote = payload.resolutionNote.trim();
    item.followUpDate = payload.followUpDate ? normalizeDate(payload.followUpDate) ?? undefined : undefined;
    item.resolvedAt = shouldResolve ? now : undefined;
    item.status = shouldResolve ? 'RESOLVED' : 'OUTSTANDING';
    item.isMisstatement = isMisstatement;
    item.updatedAt = now;

    const evidence: InternalEvidence = {
      id: randomUUID(),
      reconciliationId: item.reconciliationId,
      evidenceType: isMisstatement ? 'MISSTATEMENT' : 'SUPPORT',
      description: payload.resolutionNote,
      createdAt: now,
      itemId: item.id,
      link: payload.evidenceLink?.trim() || undefined,
      createdBy: payload.resolvedBy?.trim() || undefined,
    };

    this.evidence.set(evidence.id, evidence);
    recon.evidenceIds.push(evidence.id);
    item.evidenceId = evidence.id;
    recon.updatedAt = now;

    logReconAction('RECON_ITEM_RESOLVED', {
      reconciliationId: item.reconciliationId,
      itemId: item.id,
      resolved: shouldResolve,
      misstatement: isMisstatement,
    });

    return {
      item: clone(item),
      evidence: clone(evidence),
      snapshot: this.buildSnapshot(recon),
    };
  }

  closeReconciliation(reconciliationId: string, payload: CloseReconciliationInput) {
    const recon = this.requireReconciliation(reconciliationId);
    if (recon.status === 'CLOSED') {
      throw new Error('Reconciliation already closed');
    }

    const now = new Date().toISOString();
    recon.status = 'CLOSED';
    recon.closedAt = now;
    recon.closedBy = payload.closedBy.trim();
    recon.summary = payload.summary.trim();
    recon.controlReference = payload.controlReference?.trim() || recon.controlReference;
    recon.updatedAt = now;

    const closureEvidence: InternalEvidence = {
      id: randomUUID(),
      reconciliationId,
      evidenceType: 'SUPPORT',
      description: payload.summary,
      createdAt: now,
      createdBy: payload.closedBy.trim(),
    };

    this.evidence.set(closureEvidence.id, closureEvidence);
    recon.evidenceIds.push(closureEvidence.id);

    const outstanding: InternalItem[] = [];
    for (const itemId of recon.itemIds) {
      const item = this.items.get(itemId);
      if (item && item.status === 'OUTSTANDING') {
        outstanding.push(item);
      }
    }

    const evidenceRecords: InternalEvidence[] = [closureEvidence];

    if (outstanding.length) {
      const outstandingTotal = outstanding.reduce((sum, item) => sum + item.amount, 0);
      const misstatementEvidence: InternalEvidence = {
        id: randomUUID(),
        reconciliationId,
        evidenceType: 'MISSTATEMENT',
        description: `Closing with ${outstanding.length} unresolved items totalling ${outstandingTotal.toFixed(2)} ${recon.currency}. ${
          payload.reviewNotes ? payload.reviewNotes.trim() : ''
        }`.trim(),
        createdAt: now,
        createdBy: payload.closedBy.trim(),
      };
      this.evidence.set(misstatementEvidence.id, misstatementEvidence);
      recon.evidenceIds.push(misstatementEvidence.id);
      evidenceRecords.push(misstatementEvidence);

      for (const item of outstanding) {
        item.status = 'RESOLVED';
        item.isMisstatement = true;
        item.resolutionNote = item.resolutionNote || 'Carried forward as misstatement on close';
        item.resolvedAt = now;
        item.updatedAt = now;
        item.evidenceId = item.evidenceId || misstatementEvidence.id;
      }
    }

    if (payload.reviewNotes) {
      const followUpEvidence: InternalEvidence = {
        id: randomUUID(),
        reconciliationId,
        evidenceType: 'FOLLOW_UP',
        description: payload.reviewNotes.trim(),
        createdAt: now,
        createdBy: payload.closedBy.trim(),
      };
      this.evidence.set(followUpEvidence.id, followUpEvidence);
      recon.evidenceIds.push(followUpEvidence.id);
      evidenceRecords.push(followUpEvidence);
    }

    logReconAction('RECON_CLOSED', {
      reconciliationId,
      outstandingCarried: outstanding.length,
      closedBy: payload.closedBy,
    });

    return {
      snapshot: this.buildSnapshot(recon),
      evidence: evidenceRecords.map((record) => clone(record)),
    };
  }

  private requireReconciliation(id: string): InternalReconciliation {
    const record = this.reconciliations.get(id);
    if (!record) {
      throw new Error('Reconciliation not found');
    }
    return record;
  }

  private buildSnapshot(record: InternalReconciliation): ReconciliationSnapshot {
    const statements = record.statementIds
      .map((id) => this.statements.get(id))
      .filter((stmt): stmt is InternalStatement => Boolean(stmt))
      .map((stmt) => clone(stmt));

    const matches = record.matchIds
      .map((id) => this.matches.get(id))
      .filter((match): match is InternalMatch => Boolean(match))
      .map((match) => clone(match));

    const items = record.itemIds
      .map((id) => this.items.get(id))
      .filter((item): item is InternalItem => Boolean(item))
      .map((item) => clone(item))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const evidence = record.evidenceIds
      .map((id) => this.evidence.get(id))
      .filter((entry): entry is InternalEvidence => Boolean(entry))
      .map((entry) => clone(entry))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      id: record.id,
      orgId: record.orgId,
      engagementId: record.engagementId,
      controlReference: record.controlReference,
      name: record.name,
      type: record.type as ReconciliationType,
      currency: record.currency,
      status: record.status,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastMatchedAt: record.lastMatchedAt,
      closedAt: record.closedAt,
      closedBy: record.closedBy,
      summary: record.summary,
      statements,
      matches,
      items,
      evidence,
    };
  }
}

export function getReconciliationStore(): ReconciliationStore {
  const globalObject = globalThis as ReconStoreGlobal;
  if (!globalObject[STORE_KEY]) {
    globalObject[STORE_KEY] = new ReconciliationStore();
  }
  return globalObject[STORE_KEY]!;
}
