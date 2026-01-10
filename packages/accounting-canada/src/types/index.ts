/**
 * Canada Accounting Types
 * 
 * Type definitions for Canadian accounting automation.
 * Supports IFRS, ASPE, ASNFPO, and PSAS frameworks per CPA Canada Handbook.
 * 
 * @package @prisma/accounting-canada
 */

// ============================================================================
// ENTITY & FRAMEWORK TYPES
// ============================================================================

export type AccountingFramework = 'IFRS' | 'ASPE' | 'ASNFPO' | 'PSAS';

export type CanadianProvince =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU'
    | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export type EntityType =
    | 'public_company'      // TSX/TSXV listed
    | 'private_enterprise'  // Private corp
    | 'not_for_profit'      // NPO/charity
    | 'public_sector'       // Government/Crown
    | 'ccpc';               // Canadian-Controlled Private Corporation

export interface CanadianEntityProfile {
    entityId: string;
    name: string;
    entityType: EntityType;
    incorporationProvince: CanadianProvince;
    operatingProvinces: CanadianProvince[];
    revenue: number;
    totalAssets: number;
    employees: number;
    isPubliclyAccountable: boolean;
    hasPEInvestor: boolean;
    isCCPC: boolean;
    fiscalYearEnd: Date;
    requiresBilingualFS: boolean;  // Quebec entities
}

export interface FrameworkSelection {
    framework: AccountingFramework;
    reason: string;
    alternativeAllowed: boolean;
    bilingualRequired: boolean;
    regulatoryReferences: string[];
}

// ============================================================================
// FINANCIAL STATEMENT TYPES
// ============================================================================

export interface FinancialStatements {
    entityId: string;
    fiscalYearEnd: Date;
    framework: AccountingFramework;
    currency: 'CAD';
    balanceSheet: BalanceSheet;
    incomeStatement: IncomeStatement;
    cashFlowStatement: CashFlowStatement;
    statementOfChangesInEquity: StatementOfChangesInEquity;
    notes: FinancialNote[];
    auditStatus: 'draft' | 'reviewed' | 'audited';
}

export interface BalanceSheet {
    asOfDate: Date;
    assets: AssetSection;
    liabilities: LiabilitySection;
    equity: EquitySection;
}

export interface AssetSection {
    currentAssets: LineItem[];
    nonCurrentAssets: LineItem[];
    totalAssets: number;
}

export interface LiabilitySection {
    currentLiabilities: LineItem[];
    nonCurrentLiabilities: LineItem[];
    totalLiabilities: number;
}

export interface EquitySection {
    shareCapital: number;
    retainedEarnings: number;
    accumulatedOtherComprehensiveIncome?: number;  // IFRS only
    totalEquity: number;
}

export interface LineItem {
    accountCode: string;
    accountName: string;
    balance: number;
    priorYearBalance?: number;
    noteReference?: string;
}

export interface IncomeStatement {
    periodStart: Date;
    periodEnd: Date;
    revenues: LineItem[];
    costOfSales: LineItem[];
    grossProfit: number;
    operatingExpenses: LineItem[];
    operatingIncome: number;
    otherIncome: LineItem[];
    otherExpenses: LineItem[];
    incomeBeforeTax: number;
    incomeTaxExpense: number;
    netIncome: number;
    otherComprehensiveIncome?: LineItem[];  // IFRS only
    totalComprehensiveIncome?: number;       // IFRS only
}

export interface CashFlowStatement {
    periodStart: Date;
    periodEnd: Date;
    operatingActivities: CashFlowSection;
    investingActivities: CashFlowSection;
    financingActivities: CashFlowSection;
    netChangeInCash: number;
    openingCash: number;
    closingCash: number;
}

export interface CashFlowSection {
    items: LineItem[];
    total: number;
}

export interface StatementOfChangesInEquity {
    openingBalance: EquitySection;
    netIncome: number;
    dividends: number;
    otherChanges: LineItem[];
    closingBalance: EquitySection;
}

export interface FinancialNote {
    noteNumber: number;
    title: string;
    content: string;
    standardReference: string;  // e.g., 'IFRS 15' or 'ASPE 3400'
}

// ============================================================================
// BILINGUAL TYPES (QUEBEC)
// ============================================================================

export interface BilingualFinancialStatements {
    english: FinancialStatements;
    french: FrenchFinancialStatements;
    format: 'side_by_side' | 'separate';
    ordreCompliant: boolean;  // Ordre des CPA du Québec compliance
}

export interface FrenchFinancialStatements {
    entityId: string;
    fiscalYearEnd: Date;
    framework: AccountingFramework;
    currency: 'CAD';
    bilan: FrenchBalanceSheet;  // Balance Sheet
    etatDesResultats: FrenchIncomeStatement;  // Income Statement
    etatDesFluxDeTresorerie: FrenchCashFlowStatement;
    notes: FrenchFinancialNote[];
}

export interface FrenchBalanceSheet {
    dateDeReference: Date;
    actif: FrenchAssetSection;
    passif: FrenchLiabilitySection;
    capitauxPropres: FrenchEquitySection;
}

export interface FrenchAssetSection {
    actifCourant: FrenchLineItem[];
    actifNonCourant: FrenchLineItem[];
    totalActif: number;
}

export interface FrenchLiabilitySection {
    passifCourant: FrenchLineItem[];
    passifNonCourant: FrenchLineItem[];
    totalPassif: number;
}

export interface FrenchEquitySection {
    capitalActions: number;
    beneficesNonRepartis: number;  // Retained earnings
    autresElementsCapitauxPropres?: number;
    totalCapitauxPropres: number;
}

export interface FrenchLineItem {
    codeCompte: string;
    nomCompte: string;
    solde: number;
    soldeExercicePrecedent?: number;
    referenceNote?: string;
}

export interface FrenchIncomeStatement {
    debutPeriode: Date;
    finPeriode: Date;
    produits: FrenchLineItem[];
    coutDesVentes: FrenchLineItem[];
    beneficeBrut: number;
    chargesExploitation: FrenchLineItem[];
    beneficeExploitation: number;
    autresProduits: FrenchLineItem[];
    autresCharges: FrenchLineItem[];
    beneficeAvantImpots: number;
    chargeImpots: number;
    beneficeNet: number;
}

export interface FrenchCashFlowStatement {
    debutPeriode: Date;
    finPeriode: Date;
    activitesExploitation: FrenchCashFlowSection;
    activitesInvestissement: FrenchCashFlowSection;
    activitesFinancement: FrenchCashFlowSection;
    variationTresorerie: number;
    tresorerieOuverture: number;
    tresorerieCloture: number;
}

export interface FrenchCashFlowSection {
    elements: FrenchLineItem[];
    total: number;
}

export interface FrenchFinancialNote {
    numeroNote: number;
    titre: string;
    contenu: string;
    referenceNorme: string;
}

// ============================================================================
// REVENUE RECOGNITION TYPES
// ============================================================================

export interface RevenueTransaction {
    transactionId: string;
    entityId: string;
    transactionDate: Date;
    customerName: string;
    contractDocument?: string;
    industry: 'SAAS' | 'CONSTRUCTION' | 'RETAIL' | 'SERVICES' | 'MANUFACTURING' | 'OTHER';
    totalPrice: number;
    currency: 'CAD';
    province: CanadianProvince;
    elements: ContractElement[];
}

export interface ContractElement {
    elementId: string;
    description: string;
    type: 'product' | 'service' | 'license' | 'support';
    amount: number;
    deliveryDate?: Date;
    recognitionTiming: 'point_in_time' | 'over_time';
    recognitionPeriodMonths?: number;
}

export interface RecognitionResult {
    transactionId: string;
    framework: 'IFRS15' | 'ASPE3400';
    recognitionSchedule: RecognitionScheduleItem[];
    journalEntries: JournalEntry[];
    taxImpact: TaxImpact;
    disclosureRequirements: string[];
}

export interface RecognitionScheduleItem {
    periodEnd: Date;
    revenueRecognized: number;
    deferredRevenue: number;
    cumulativeRecognized: number;
}

export interface TaxImpact {
    gstHstCollected: number;
    province: CanadianProvince;
    taxRate: number;
    taxMethod: 'HST' | 'GST_PST' | 'GST_QST' | 'GST_ONLY';
}

// ============================================================================
// JOURNAL ENTRY TYPES
// ============================================================================

export interface JournalEntry {
    entryId: string;
    entityId: string;
    entryDate: Date;
    postingDate: Date;
    description: string;
    lines: JournalEntryLine[];
    sourceDocument?: string;
    createdBy: string;
    approvedBy?: string;
    status: 'draft' | 'pending_approval' | 'posted' | 'reversed';
    auditTrail: AuditTrailEntry[];
}

export interface JournalEntryLine {
    lineNumber: number;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    taxCode?: string;
    costCenter?: string;
    project?: string;
}

export interface AuditTrailEntry {
    timestamp: Date;
    action: string;
    userId: string;
    details?: string;
}

// ============================================================================
// FINANCIAL INSTRUMENTS TYPES (IFRS 9 / ASPE 3856)
// ============================================================================

export interface FinancialInstrument {
    instrumentId: string;
    entityId: string;
    type: 'receivable' | 'equity' | 'derivative' | 'debt_security' | 'loan' | 'payable';
    name: string;
    acquisitionDate: Date;
    acquisitionCost: number;
    currentFairValue?: number;
    maturityDate?: Date;
    isQuoted: boolean;
    currency: 'CAD' | 'USD' | 'EUR' | 'OTHER';
}

export interface InstrumentClassification {
    instrumentId: string;
    framework: 'IFRS9' | 'ASPE3856';
    classification: IFRS9Classification | ASPE3856Classification;
    measurementBasis: 'amortized_cost' | 'fair_value_pnl' | 'fair_value_oci' | 'cost';
    ecl?: ExpectedCreditLoss;  // IFRS 9 only
}

export type IFRS9Classification =
    | 'amortized_cost'       // Hold to collect, SPPI pass
    | 'fvoci'                // Hold and sell, SPPI pass
    | 'fvtpl'                // Trading or SPPI fail
    | 'fvoci_equity';        // Irrevocable election for equity

export type ASPE3856Classification =
    | 'cost'                 // Unquoted equity
    | 'fair_value_ni'        // Derivatives, quoted investments
    | 'amortized_cost';      // Debt instruments

export interface ExpectedCreditLoss {
    stage: 1 | 2 | 3;
    bucket: 'current' | '30_days' | '60_days' | '90_plus_days';
    historicalLossRate: number;
    forwardLookingAdjustment: number;
    eclAmount: number;
    calculationDate: Date;
}

// ============================================================================
// DEPRECIATION / CCA TYPES
// ============================================================================

export interface FixedAsset {
    assetId: string;
    entityId: string;
    description: string;
    assetClass: AssetClass;
    acquisitionDate: Date;
    acquisitionCost: number;
    residualValue: number;
    usefulLifeYears: number;
    depreciationMethod: DepreciationMethod;
    accumulatedDepreciation: number;
    netBookValue: number;
    ccaClass?: number;  // Capital Cost Allowance class
    ccaRate?: number;   // CCA rate for tax purposes
}

export type AssetClass =
    | 'land'
    | 'buildings'
    | 'machinery'
    | 'vehicles'
    | 'furniture'
    | 'computer_equipment'
    | 'leasehold_improvements'
    | 'intangibles';

export type DepreciationMethod =
    | 'straight_line'
    | 'declining_balance'
    | 'units_of_production';

export interface DepreciationSchedule {
    assetId: string;
    period: Date;
    openingBalance: number;
    depreciationExpense: number;
    closingBalance: number;
    ccaDeduction?: number;  // Tax depreciation
    temporaryDifference?: number;  // Book vs tax
}

// ============================================================================
// MONTH-END CLOSE TYPES
// ============================================================================

export interface MonthEndCloseTask {
    taskId: string;
    entityId: string;
    periodEnd: Date;
    phase: ClosePhase;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    assignee?: string;
    dueDate: Date;
    completedDate?: Date;
}

export type ClosePhase =
    | 'transaction_processing'
    | 'reconciliations'
    | 'adjustments_accruals'
    | 'financial_statement_generation'
    | 'review_finalization';

export interface ClosePackage {
    entityId: string;
    periodEnd: Date;
    financialStatements: FinancialStatements;
    journalEntries: JournalEntry[];
    reconciliations: BankReconciliation[];
    analytics: VarianceAnalysis;
    daysToClose: number;
}

export interface BankReconciliation {
    accountId: string;
    accountName: string;
    periodEnd: Date;
    bookBalance: number;
    bankBalance: number;
    outstandingDeposits: ReconciliationItem[];
    outstandingCheques: ReconciliationItem[];
    otherReconciling: ReconciliationItem[];
    reconciled: boolean;
    variance: number;
}

export interface ReconciliationItem {
    date: Date;
    description: string;
    amount: number;
    type: 'deposit' | 'cheque' | 'adjustment' | 'bank_fee' | 'interest';
}

export interface VarianceAnalysis {
    periodEnd: Date;
    revenueVariance: VarianceItem;
    expenseVariance: VarianceItem;
    netIncomeVariance: VarianceItem;
    significantVariances: VarianceItem[];
}

export interface VarianceItem {
    description: string;
    actual: number;
    budget?: number;
    priorPeriod?: number;
    varianceAmount: number;
    variancePercent: number;
    explanation?: string;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AgentType =
    | 'standards_engine'
    | 'revenue_recognition'
    | 'financial_instruments'
    | 'depreciation'
    | 'bilingual'
    | 'month_end_close'
    | 'journal_entry'
    | 'balance_sheet'
    | 'income_statement'
    | 'analytics';

export type AutonomyLevel = 'full' | 'supervised' | 'review_required';

export interface AgentConfig {
    agentType: AgentType;
    autonomyLevel: AutonomyLevel;
    enableAI: boolean;
    framework?: AccountingFramework;
    province?: CanadianProvince;
}

export interface AgentContext {
    entityId: string;
    userId: string;
    organizationId: string;
    fiscalYearEnd: Date;
    framework: AccountingFramework;
    province: CanadianProvince;
}

export interface AgentResponse<T = unknown> {
    success: boolean;
    data?: T;
    errors?: string[];
    warnings?: string[];
    auditTrail: AuditTrailEntry[];
    processingTimeMs: number;
}
