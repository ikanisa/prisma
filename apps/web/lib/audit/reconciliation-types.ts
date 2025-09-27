export type ReconciliationType = 'BANK' | 'ACCOUNTS_RECEIVABLE' | 'ACCOUNTS_PAYABLE';
export type StatementSide = 'LEDGER' | 'EXTERNAL';
export type ReconciliationStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type MatchStrategy = 'AMOUNT_AND_DATE' | 'AMOUNT_ONLY';
export type ReconItemStatus = 'OUTSTANDING' | 'RESOLVED';
export type ReconItemOrigin = 'AUTOMATCH' | 'MANUAL';
export type ReconEvidenceType = 'SUPPORT' | 'MISSTATEMENT' | 'FOLLOW_UP';

export interface StatementLineInput {
  date: string;
  description: string;
  amount: number;
  reference?: string;
}

export interface CreateReconciliationInput {
  name: string;
  type: ReconciliationType;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  orgId?: string;
  engagementId?: string;
  controlReference?: string;
  createdBy?: string;
}

export interface StatementImportInput {
  side: StatementSide;
  sourceName: string;
  statementDate: string;
  lines: StatementLineInput[];
  importedBy?: string;
}

export interface DeterministicMatchOptions {
  strategies?: MatchStrategy[];
}

export interface ResolveReconItemInput {
  resolutionNote: string;
  followUpDate?: string;
  cleared: boolean;
  evidenceLink?: string;
  flaggedAsMisstatement?: boolean;
  resolvedBy?: string;
}

export interface CloseReconciliationInput {
  closedBy: string;
  summary: string;
  controlReference?: string;
  reviewNotes?: string;
}

export interface ReconStatementLine {
  id: string;
  statementId: string;
  reconciliationId: string;
  side: StatementSide;
  date: string | null;
  description: string;
  reference?: string;
  amount: number;
  matchGroupId?: string;
}

export interface ReconStatement {
  id: string;
  reconciliationId: string;
  side: StatementSide;
  sourceName: string;
  statementDate: string | null;
  importedAt: string;
  importedBy?: string;
  lines: ReconStatementLine[];
}

export interface ReconMatchGroup {
  id: string;
  reconciliationId: string;
  strategy: MatchStrategy;
  ledgerLineIds: string[];
  externalLineIds: string[];
  createdAt: string;
}

export interface ReconEvidence {
  id: string;
  reconciliationId: string;
  evidenceType: ReconEvidenceType;
  description: string;
  createdAt: string;
  itemId?: string;
  link?: string;
  createdBy?: string;
}

export interface ReconItem {
  id: string;
  reconciliationId: string;
  side: StatementSide;
  amount: number;
  reason: string;
  origin: ReconItemOrigin;
  status: ReconItemStatus;
  isMisstatement?: boolean;
  resolutionNote?: string;
  resolvedAt?: string;
  followUpDate?: string;
  evidenceId?: string;
  createdAt: string;
  updatedAt: string;
  sourceLineIds: string[];
}

export interface ReconciliationRecord {
  id: string;
  orgId?: string;
  engagementId?: string;
  controlReference?: string;
  name: string;
  type: ReconciliationType;
  currency: string;
  status: ReconciliationStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
  lastMatchedAt?: string;
  closedAt?: string;
  closedBy?: string;
  summary?: string;
}

export interface ReconciliationSnapshot extends ReconciliationRecord {
  statements: ReconStatement[];
  matches: ReconMatchGroup[];
  items: ReconItem[];
  evidence: ReconEvidence[];
}

export interface ReconciliationSummary extends ReconciliationRecord {
  outstandingItems: number;
  outstandingTotal: number;
}
