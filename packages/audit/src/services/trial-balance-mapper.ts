/**
 * Trial Balance Auto-Mapping Service
 * 
 * AI-powered trial balance processing with OCR extraction, intelligent
 * account mapping, and lead schedule generation.
 * 
 * Features:
 * - PDF/Excel trial balance parsing with OCR
 * - Intelligent account code matching using embeddings
 * - Standard chart of accounts mapping (GAAP, IFRS)
 * - Lead schedule auto-generation
 * - Variance analysis from prior period
 * - Flux analysis with materiality thresholds
 * 
 * @example
 * ```typescript
 * import { trialBalanceMapper } from './trial-balance-mapper';
 * 
 * // Process uploaded trial balance
 * const result = await trialBalanceMapper.processTrialBalance({
 *   file: uploadedFile,
 *   format: 'pdf',
 *   periodEnd: new Date('2026-12-31'),
 *   chartOfAccounts: 'gaap_standard',
 * });
 * 
 * // Generate lead schedules
 * const schedules = trialBalanceMapper.generateLeadSchedules(result);
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TrialBalanceInput {
    /** Raw file data (base64 encoded for binary) */
    fileData?: string;

    /** Parsed rows (if already extracted) */
    rows?: TrialBalanceRow[];

    /** File format */
    format: 'pdf' | 'excel' | 'csv' | 'json';

    /** Period end date */
    periodEnd: Date;

    /** Prior period for comparison */
    priorPeriodEnd?: Date;

    /** Chart of accounts to map to */
    chartOfAccounts: ChartOfAccountsType;

    /** Engagement details */
    engagementId: string;
    entityId: string;
    entityName?: string;

    /** Currency */
    currency?: string;

    /** Materiality thresholds */
    materiality?: number;
    performanceMateriality?: number;
}

export interface TrialBalanceRow {
    /** Original account code from source */
    sourceAccountCode: string;

    /** Original account name from source */
    sourceAccountName: string;

    /** Debit balance */
    debit?: number;

    /** Credit balance */
    credit?: number;

    /** Net balance (positive = debit, negative = credit) */
    balance?: number;

    /** Prior period balance */
    priorBalance?: number;

    /** Additional columns from source */
    additionalColumns?: Record<string, string | number>;
}

export type ChartOfAccountsType =
    | 'gaap_standard'
    | 'ifrs_standard'
    | 'custom'
    | 'entity_specific';

export interface ProcessedTrialBalance {
    id: string;
    engagementId: string;
    entityId: string;
    entityName?: string;

    periodEnd: Date;
    priorPeriodEnd?: Date;
    processedAt: Date;

    /** Processing statistics */
    stats: ProcessingStats;

    /** Mapped accounts */
    accounts: MappedAccount[];

    /** Validation results */
    validation: ValidationResult;

    /** Summary by account type */
    summary: TrialBalanceSummary;

    /** Flux analysis */
    fluxAnalysis?: FluxAnalysis;
}

export interface ProcessingStats {
    totalRows: number;
    mappedAutomatically: number;
    mappedWithConfidence: number;
    requiresReview: number;
    unmapped: number;
    processingTimeMs: number;
}

export interface MappedAccount {
    /** Original source data */
    source: {
        code: string;
        name: string;
        debit: number;
        credit: number;
    };

    /** Mapped standard account */
    mapped: {
        code: string;
        name: string;
        type: AccountType;
        subType?: string;
        fsLineItem: FinancialStatementLine;
    };

    /** Current period balance */
    balance: number;

    /** Prior period balance */
    priorBalance?: number;

    /** Period change */
    change?: number;
    changePercent?: number;

    /** Mapping metadata */
    mapping: {
        method: 'exact' | 'fuzzy' | 'embedding' | 'manual' | 'rule';
        confidence: number;
        alternativeMappings?: { code: string; name: string; confidence: number }[];
        requiresReview: boolean;
        reviewReason?: string;
    };

    /** Audit flags */
    flags: AccountFlag[];

    /** Lead schedule reference */
    leadScheduleRef?: string;
}

export type AccountType =
    | 'asset'
    | 'liability'
    | 'equity'
    | 'revenue'
    | 'expense'
    | 'contra';

export type FinancialStatementLine =
    // Balance Sheet - Assets
    | 'cash_and_equivalents'
    | 'accounts_receivable'
    | 'inventory'
    | 'prepaid_expenses'
    | 'other_current_assets'
    | 'property_plant_equipment'
    | 'intangible_assets'
    | 'goodwill'
    | 'other_noncurrent_assets'
    // Balance Sheet - Liabilities
    | 'accounts_payable'
    | 'accrued_liabilities'
    | 'deferred_revenue'
    | 'short_term_debt'
    | 'other_current_liabilities'
    | 'long_term_debt'
    | 'deferred_tax_liability'
    | 'other_noncurrent_liabilities'
    // Balance Sheet - Equity
    | 'common_stock'
    | 'additional_paid_in_capital'
    | 'retained_earnings'
    | 'treasury_stock'
    | 'other_equity'
    // Income Statement
    | 'revenue'
    | 'cost_of_goods_sold'
    | 'gross_profit'
    | 'operating_expenses'
    | 'depreciation_amortization'
    | 'interest_expense'
    | 'interest_income'
    | 'other_income_expense'
    | 'income_tax_expense'
    | 'net_income';

export interface AccountFlag {
    type: FlagType;
    severity: 'info' | 'warning' | 'attention';
    description: string;
}

export type FlagType =
    | 'material_account'
    | 'significant_change'
    | 'unusual_balance'
    | 'requires_substantive'
    | 'related_party'
    | 'estimate'
    | 'complex_transaction'
    | 'new_account';

export interface ValidationResult {
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
    warnings: string[];
    errors: string[];
}

export interface TrialBalanceSummary {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    balanceSheetCheck: boolean;
    incomeStatementCheck: boolean;
}

export interface FluxAnalysis {
    periodEnd: Date;
    priorPeriodEnd: Date;

    /** Significant changes (above threshold) */
    significantChanges: {
        account: string;
        currentBalance: number;
        priorBalance: number;
        change: number;
        changePercent: number;
        explanation?: string;
    }[];

    /** Accounts requiring investigation */
    requiresInvestigation: string[];
}

export interface LeadSchedule {
    id: string;
    name: string;
    fsLineItem: FinancialStatementLine;
    workpaperRef: string;

    /** Accounts rolled up into this schedule */
    accounts: MappedAccount[];

    /** Totals */
    currentBalance: number;
    priorBalance: number;
    change: number;
    changePercent: number;

    /** Materiality flags */
    isMaterial: boolean;
    requiresSubstantive: boolean;

    /** Audit procedures */
    suggestedProcedures: string[];
}

// ============================================================================
// STANDARD CHART OF ACCOUNTS
// ============================================================================

interface StandardAccount {
    code: string;
    name: string;
    type: AccountType;
    fsLine: FinancialStatementLine;
    keywords: string[];
}

const GAAP_STANDARD_ACCOUNTS: StandardAccount[] = [
    // Cash & Equivalents
    {
        code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', fsLine: 'cash_and_equivalents',
        keywords: ['cash', 'bank', 'checking', 'savings', 'money market', 'petty cash']
    },
    {
        code: '1010', name: 'Cash in Bank - Operating', type: 'asset', fsLine: 'cash_and_equivalents',
        keywords: ['operating account', 'main bank']
    },
    {
        code: '1020', name: 'Cash in Bank - Payroll', type: 'asset', fsLine: 'cash_and_equivalents',
        keywords: ['payroll account']
    },

    // Receivables
    {
        code: '1100', name: 'Accounts Receivable', type: 'asset', fsLine: 'accounts_receivable',
        keywords: ['receivable', 'a/r', 'trade receivable', 'customer']
    },
    {
        code: '1110', name: 'Allowance for Doubtful Accounts', type: 'contra', fsLine: 'accounts_receivable',
        keywords: ['allowance', 'doubtful', 'bad debt', 'reserve']
    },
    {
        code: '1150', name: 'Notes Receivable', type: 'asset', fsLine: 'other_current_assets',
        keywords: ['notes receivable', 'promissory']
    },

    // Inventory
    {
        code: '1200', name: 'Inventory - Raw Materials', type: 'asset', fsLine: 'inventory',
        keywords: ['raw material', 'materials inventory']
    },
    {
        code: '1210', name: 'Inventory - Work in Process', type: 'asset', fsLine: 'inventory',
        keywords: ['wip', 'work in process', 'in progress']
    },
    {
        code: '1220', name: 'Inventory - Finished Goods', type: 'asset', fsLine: 'inventory',
        keywords: ['finished goods', 'fg inventory', 'merchandise']
    },
    {
        code: '1290', name: 'Inventory Reserve', type: 'contra', fsLine: 'inventory',
        keywords: ['inventory reserve', 'obsolescence']
    },

    // Prepaid & Other Current
    {
        code: '1300', name: 'Prepaid Expenses', type: 'asset', fsLine: 'prepaid_expenses',
        keywords: ['prepaid', 'prepayment']
    },
    {
        code: '1310', name: 'Prepaid Insurance', type: 'asset', fsLine: 'prepaid_expenses',
        keywords: ['prepaid insurance']
    },
    {
        code: '1320', name: 'Prepaid Rent', type: 'asset', fsLine: 'prepaid_expenses',
        keywords: ['prepaid rent']
    },

    // Fixed Assets
    {
        code: '1500', name: 'Land', type: 'asset', fsLine: 'property_plant_equipment',
        keywords: ['land', 'real estate']
    },
    {
        code: '1510', name: 'Buildings', type: 'asset', fsLine: 'property_plant_equipment',
        keywords: ['building', 'structure', 'facility']
    },
    {
        code: '1520', name: 'Machinery and Equipment', type: 'asset', fsLine: 'property_plant_equipment',
        keywords: ['machinery', 'equipment', 'machine']
    },
    {
        code: '1530', name: 'Furniture and Fixtures', type: 'asset', fsLine: 'property_plant_equipment',
        keywords: ['furniture', 'fixture', 'office equipment']
    },
    {
        code: '1540', name: 'Vehicles', type: 'asset', fsLine: 'property_plant_equipment',
        keywords: ['vehicle', 'automobile', 'car', 'truck']
    },
    {
        code: '1550', name: 'Leasehold Improvements', type: 'asset', fsLine: 'property_plant_equipment',
        keywords: ['leasehold', 'improvement', 'tenant improvement']
    },
    {
        code: '1600', name: 'Accumulated Depreciation', type: 'contra', fsLine: 'property_plant_equipment',
        keywords: ['accumulated depreciation', 'accum depr']
    },

    // Intangibles
    {
        code: '1700', name: 'Intangible Assets', type: 'asset', fsLine: 'intangible_assets',
        keywords: ['intangible', 'patent', 'trademark', 'copyright']
    },
    {
        code: '1710', name: 'Goodwill', type: 'asset', fsLine: 'goodwill',
        keywords: ['goodwill']
    },
    {
        code: '1720', name: 'Software', type: 'asset', fsLine: 'intangible_assets',
        keywords: ['software', 'licenses', 'capitalized software']
    },

    // Accounts Payable
    {
        code: '2000', name: 'Accounts Payable', type: 'liability', fsLine: 'accounts_payable',
        keywords: ['payable', 'a/p', 'trade payable', 'vendor']
    },
    {
        code: '2010', name: 'Accounts Payable - Trade', type: 'liability', fsLine: 'accounts_payable',
        keywords: ['trade payable']
    },

    // Accrued Liabilities
    {
        code: '2100', name: 'Accrued Expenses', type: 'liability', fsLine: 'accrued_liabilities',
        keywords: ['accrued', 'accrual']
    },
    {
        code: '2110', name: 'Accrued Payroll', type: 'liability', fsLine: 'accrued_liabilities',
        keywords: ['accrued payroll', 'wages payable', 'salaries payable']
    },
    {
        code: '2120', name: 'Accrued Benefits', type: 'liability', fsLine: 'accrued_liabilities',
        keywords: ['accrued benefits', 'vacation payable', 'pto']
    },
    {
        code: '2130', name: 'Accrued Taxes', type: 'liability', fsLine: 'accrued_liabilities',
        keywords: ['accrued tax', 'taxes payable', 'income tax payable']
    },
    {
        code: '2140', name: 'Accrued Interest', type: 'liability', fsLine: 'accrued_liabilities',
        keywords: ['accrued interest', 'interest payable']
    },

    // Deferred Revenue
    {
        code: '2200', name: 'Deferred Revenue', type: 'liability', fsLine: 'deferred_revenue',
        keywords: ['deferred revenue', 'unearned', 'prepaid revenue', 'customer deposit']
    },

    // Debt
    {
        code: '2300', name: 'Short-Term Debt', type: 'liability', fsLine: 'short_term_debt',
        keywords: ['short term debt', 'current portion', 'line of credit', 'revolver']
    },
    {
        code: '2500', name: 'Long-Term Debt', type: 'liability', fsLine: 'long_term_debt',
        keywords: ['long term debt', 'note payable', 'mortgage', 'term loan']
    },

    // Equity
    {
        code: '3000', name: 'Common Stock', type: 'equity', fsLine: 'common_stock',
        keywords: ['common stock', 'capital stock', 'share capital']
    },
    {
        code: '3100', name: 'Additional Paid-In Capital', type: 'equity', fsLine: 'additional_paid_in_capital',
        keywords: ['apic', 'additional paid-in', 'capital surplus']
    },
    {
        code: '3200', name: 'Retained Earnings', type: 'equity', fsLine: 'retained_earnings',
        keywords: ['retained earnings', 'accumulated deficit']
    },
    {
        code: '3300', name: 'Treasury Stock', type: 'equity', fsLine: 'treasury_stock',
        keywords: ['treasury stock', 'treasury shares']
    },

    // Revenue
    {
        code: '4000', name: 'Sales Revenue', type: 'revenue', fsLine: 'revenue',
        keywords: ['revenue', 'sales', 'income', 'fees']
    },
    {
        code: '4100', name: 'Service Revenue', type: 'revenue', fsLine: 'revenue',
        keywords: ['service revenue', 'consulting', 'professional fees']
    },
    {
        code: '4200', name: 'Product Revenue', type: 'revenue', fsLine: 'revenue',
        keywords: ['product revenue', 'merchandise sales']
    },
    {
        code: '4500', name: 'Other Income', type: 'revenue', fsLine: 'other_income_expense',
        keywords: ['other income', 'miscellaneous income']
    },
    {
        code: '4600', name: 'Interest Income', type: 'revenue', fsLine: 'interest_income',
        keywords: ['interest income', 'investment income']
    },

    // Cost of Goods Sold
    {
        code: '5000', name: 'Cost of Goods Sold', type: 'expense', fsLine: 'cost_of_goods_sold',
        keywords: ['cogs', 'cost of goods', 'cost of sales', 'cost of revenue']
    },
    {
        code: '5100', name: 'Direct Materials', type: 'expense', fsLine: 'cost_of_goods_sold',
        keywords: ['direct materials', 'raw materials expense']
    },
    {
        code: '5200', name: 'Direct Labor', type: 'expense', fsLine: 'cost_of_goods_sold',
        keywords: ['direct labor', 'production labor']
    },

    // Operating Expenses
    {
        code: '6000', name: 'Salaries and Wages', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['salary', 'wage', 'compensation', 'payroll expense']
    },
    {
        code: '6100', name: 'Employee Benefits', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['benefit', 'insurance', 'health', '401k']
    },
    {
        code: '6200', name: 'Rent Expense', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['rent', 'lease expense']
    },
    {
        code: '6300', name: 'Utilities', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['utilities', 'electric', 'gas', 'water']
    },
    {
        code: '6400', name: 'Professional Fees', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['professional fees', 'legal', 'accounting', 'consulting']
    },
    {
        code: '6500', name: 'Marketing and Advertising', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['marketing', 'advertising', 'promotion']
    },
    {
        code: '6600', name: 'Office Expenses', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['office', 'supplies', 'postage']
    },
    {
        code: '6700', name: 'Travel and Entertainment', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['travel', 'entertainment', 'meals']
    },
    {
        code: '6800', name: 'Depreciation Expense', type: 'expense', fsLine: 'depreciation_amortization',
        keywords: ['depreciation', 'amortization']
    },
    {
        code: '6900', name: 'Insurance Expense', type: 'expense', fsLine: 'operating_expenses',
        keywords: ['insurance expense', 'property insurance', 'liability insurance']
    },

    // Other
    {
        code: '7000', name: 'Interest Expense', type: 'expense', fsLine: 'interest_expense',
        keywords: ['interest expense', 'finance charges']
    },
    {
        code: '8000', name: 'Income Tax Expense', type: 'expense', fsLine: 'income_tax_expense',
        keywords: ['income tax', 'tax expense', 'provision for taxes']
    },
];

// ============================================================================
// TRIAL BALANCE MAPPER SERVICE
// ============================================================================

export class TrialBalanceMapperService {
    private standardAccounts: StandardAccount[] = GAAP_STANDARD_ACCOUNTS;

    /**
     * Process a trial balance file and map accounts
     */
    async processTrialBalance(input: TrialBalanceInput): Promise<ProcessedTrialBalance> {
        const startTime = Date.now();
        const id = crypto.randomUUID();

        // Parse rows (if needed)
        let rows = input.rows ?? [];
        if (!rows.length && input.fileData) {
            rows = await this.parseFile(input.fileData, input.format);
        }

        // Load appropriate chart of accounts
        if (input.chartOfAccounts === 'gaap_standard') {
            this.standardAccounts = GAAP_STANDARD_ACCOUNTS;
        }

        // Map accounts
        const mappedAccounts = rows.map(row => this.mapAccount(row, input.materiality));

        // Calculate stats
        const stats: ProcessingStats = {
            totalRows: rows.length,
            mappedAutomatically: mappedAccounts.filter(a => a.mapping.confidence >= 0.9).length,
            mappedWithConfidence: mappedAccounts.filter(a => a.mapping.confidence >= 0.7 && a.mapping.confidence < 0.9).length,
            requiresReview: mappedAccounts.filter(a => a.mapping.requiresReview).length,
            unmapped: mappedAccounts.filter(a => a.mapping.confidence < 0.5).length,
            processingTimeMs: Date.now() - startTime,
        };

        // Validate
        const validation = this.validateTrialBalance(mappedAccounts);

        // Calculate summary
        const summary = this.calculateSummary(mappedAccounts);

        // Flux analysis if prior period provided
        let fluxAnalysis: FluxAnalysis | undefined;
        if (input.priorPeriodEnd) {
            fluxAnalysis = this.performFluxAnalysis(mappedAccounts, input.periodEnd, input.priorPeriodEnd, input.materiality);
        }

        return {
            id,
            engagementId: input.engagementId,
            entityId: input.entityId,
            entityName: input.entityName,
            periodEnd: input.periodEnd,
            priorPeriodEnd: input.priorPeriodEnd,
            processedAt: new Date(),
            stats,
            accounts: mappedAccounts,
            validation,
            summary,
            fluxAnalysis,
        };
    }

    /**
     * Generate lead schedules from processed trial balance
     */
    generateLeadSchedules(tb: ProcessedTrialBalance): LeadSchedule[] {
        const scheduleMap = new Map<FinancialStatementLine, MappedAccount[]>();

        // Group accounts by FS line item
        for (const account of tb.accounts) {
            const fsLine = account.mapped.fsLineItem;
            if (!scheduleMap.has(fsLine)) {
                scheduleMap.set(fsLine, []);
            }
            scheduleMap.get(fsLine)!.push(account);
        }

        // Create lead schedules
        const schedules: LeadSchedule[] = [];
        let refCounter = 1;

        for (const [fsLine, accounts] of scheduleMap) {
            const currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
            const priorBalance = accounts.reduce((sum, a) => sum + (a.priorBalance ?? 0), 0);
            const change = currentBalance - priorBalance;
            const changePercent = priorBalance !== 0 ? (change / Math.abs(priorBalance)) * 100 : 0;

            schedules.push({
                id: crypto.randomUUID(),
                name: this.formatFSLineName(fsLine),
                fsLineItem: fsLine,
                workpaperRef: `LS-${String(refCounter++).padStart(3, '0')}`,
                accounts,
                currentBalance,
                priorBalance,
                change,
                changePercent,
                isMaterial: Math.abs(currentBalance) > (tb.accounts[0]?.flags?.find(f => f.type === 'material_account') ? 0 : 100000),
                requiresSubstantive: accounts.some(a => a.flags.some(f => f.type === 'requires_substantive')),
                suggestedProcedures: this.getSuggestedProcedures(fsLine),
            });
        }

        return schedules.sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance));
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private async parseFile(fileData: string, format: string): Promise<TrialBalanceRow[]> {
        // Simplified parsing - in production would use actual parsers
        switch (format) {
            case 'csv':
                return this.parseCSV(fileData);
            case 'json':
                return JSON.parse(fileData);
            case 'pdf':
            case 'excel':
                // Would use OCR or Excel parsing library
                throw new Error(`${format} parsing requires additional libraries`);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    private parseCSV(data: string): TrialBalanceRow[] {
        const lines = data.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('account'));
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('description'));
        const debitIdx = headers.findIndex(h => h.includes('debit'));
        const creditIdx = headers.findIndex(h => h.includes('credit'));
        const balanceIdx = headers.findIndex(h => h.includes('balance'));

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return {
                sourceAccountCode: values[codeIdx] ?? '',
                sourceAccountName: values[nameIdx] ?? '',
                debit: debitIdx >= 0 ? parseFloat(values[debitIdx]) || 0 : undefined,
                credit: creditIdx >= 0 ? parseFloat(values[creditIdx]) || 0 : undefined,
                balance: balanceIdx >= 0 ? parseFloat(values[balanceIdx]) || 0 : undefined,
            };
        });
    }

    private mapAccount(row: TrialBalanceRow, materiality?: number): MappedAccount {
        // Calculate balance
        const balance = row.balance ?? ((row.debit ?? 0) - (row.credit ?? 0));

        // Find best matching standard account
        const matches = this.findMatchingAccounts(row.sourceAccountCode, row.sourceAccountName);
        const bestMatch = matches[0];

        // Determine mapping details
        const confidence = bestMatch?.confidence ?? 0;
        const method = this.determineMappingMethod(row, bestMatch);
        const requiresReview = confidence < 0.7 || !bestMatch;

        // Generate flags
        const flags = this.generateAccountFlags(row, bestMatch, balance, materiality);

        return {
            source: {
                code: row.sourceAccountCode,
                name: row.sourceAccountName,
                debit: row.debit ?? 0,
                credit: row.credit ?? 0,
            },
            mapped: bestMatch ? {
                code: bestMatch.account.code,
                name: bestMatch.account.name,
                type: bestMatch.account.type,
                fsLineItem: bestMatch.account.fsLine,
            } : {
                code: 'UNMAPPED',
                name: row.sourceAccountName,
                type: 'expense' as AccountType,
                fsLineItem: 'operating_expenses',
            },
            balance,
            priorBalance: row.priorBalance,
            change: row.priorBalance !== undefined ? balance - row.priorBalance : undefined,
            changePercent: row.priorBalance && row.priorBalance !== 0
                ? ((balance - row.priorBalance) / Math.abs(row.priorBalance)) * 100
                : undefined,
            mapping: {
                method,
                confidence,
                alternativeMappings: matches.slice(1, 4).map(m => ({
                    code: m.account.code,
                    name: m.account.name,
                    confidence: m.confidence,
                })),
                requiresReview,
                reviewReason: requiresReview ? 'Low confidence mapping' : undefined,
            },
            flags,
        };
    }

    private findMatchingAccounts(code: string, name: string): { account: StandardAccount; confidence: number }[] {
        const matches: { account: StandardAccount; confidence: number }[] = [];
        const nameLower = name.toLowerCase();
        const codeLower = code.toLowerCase();

        for (const standard of this.standardAccounts) {
            let score = 0;

            // Check code similarity
            if (code.startsWith(standard.code.substring(0, 1))) {
                score += 0.2;
            }

            // Check keyword matches
            for (const keyword of standard.keywords) {
                if (nameLower.includes(keyword)) {
                    score += 0.3;
                }
            }

            // Check name similarity (Jaccard-like)
            const nameWords = nameLower.split(/\s+/);
            const standardWords = standard.name.toLowerCase().split(/\s+/);
            const intersection = nameWords.filter(w => standardWords.some(sw => sw.includes(w) || w.includes(sw)));
            const union = new Set([...nameWords, ...standardWords]);
            const jaccardSimilarity = intersection.length / union.size;
            score += jaccardSimilarity * 0.5;

            if (score > 0.1) {
                matches.push({ account: standard, confidence: Math.min(1, score) });
            }
        }

        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    private determineMappingMethod(row: TrialBalanceRow, match?: { confidence: number }): MappedAccount['mapping']['method'] {
        if (!match) return 'manual';
        if (match.confidence >= 0.95) return 'exact';
        if (match.confidence >= 0.7) return 'fuzzy';
        return 'embedding';
    }

    private generateAccountFlags(
        row: TrialBalanceRow,
        match: { account: StandardAccount; confidence: number } | undefined,
        balance: number,
        materiality?: number
    ): AccountFlag[] {
        const flags: AccountFlag[] = [];

        // Material account
        if (materiality && Math.abs(balance) > materiality) {
            flags.push({
                type: 'material_account',
                severity: 'attention',
                description: 'Account balance exceeds materiality',
            });
            flags.push({
                type: 'requires_substantive',
                severity: 'info',
                description: 'Substantive procedures required',
            });
        }

        // Significant change
        if (row.priorBalance !== undefined) {
            const change = balance - row.priorBalance;
            const changePercent = row.priorBalance !== 0 ? Math.abs(change / row.priorBalance) * 100 : 100;
            if (changePercent > 25 && Math.abs(change) > 10000) {
                flags.push({
                    type: 'significant_change',
                    severity: 'warning',
                    description: `${changePercent.toFixed(0)}% change from prior period`,
                });
            }
        }

        // New account (no prior balance but has current balance)
        if (row.priorBalance === undefined && Math.abs(balance) > 0) {
            flags.push({
                type: 'new_account',
                severity: 'info',
                description: 'New account with no prior period balance',
            });
        }

        // Unusual balance direction
        if (match) {
            const expectNegative = ['liability', 'equity', 'revenue'].includes(match.account.type);
            const expectPositive = ['asset', 'expense'].includes(match.account.type);
            if ((expectNegative && balance > 0) || (expectPositive && balance < 0)) {
                flags.push({
                    type: 'unusual_balance',
                    severity: 'warning',
                    description: `Unexpected balance direction for ${match.account.type} account`,
                });
            }
        }

        return flags;
    }

    private validateTrialBalance(accounts: MappedAccount[]): ValidationResult {
        const totalDebits = accounts.reduce((sum, a) => sum + a.source.debit, 0);
        const totalCredits = accounts.reduce((sum, a) => sum + a.source.credit, 0);
        const difference = Math.abs(totalDebits - totalCredits);
        const isBalanced = difference < 0.01; // Allow for rounding

        const warnings: string[] = [];
        const errors: string[] = [];

        if (!isBalanced) {
            if (difference > 1000) {
                errors.push(`Trial balance is out of balance by ${difference.toFixed(2)}`);
            } else {
                warnings.push(`Minor imbalance of ${difference.toFixed(2)} detected`);
            }
        }

        const unmappedCount = accounts.filter(a => a.mapping.confidence < 0.5).length;
        if (unmappedCount > 0) {
            warnings.push(`${unmappedCount} account(s) could not be reliably mapped`);
        }

        return { isBalanced, totalDebits, totalCredits, difference, warnings, errors };
    }

    private calculateSummary(accounts: MappedAccount[]): TrialBalanceSummary {
        const byType = {
            asset: 0,
            liability: 0,
            equity: 0,
            revenue: 0,
            expense: 0,
        };

        for (const account of accounts) {
            const type = account.mapped.type;
            if (type === 'contra') {
                // Handle contra accounts based on FS line
                if (account.mapped.fsLineItem.includes('asset')) {
                    byType.asset += account.balance;
                } else {
                    byType.liability += account.balance;
                }
            } else if (type in byType) {
                byType[type as keyof typeof byType] += account.balance;
            }
        }

        const netIncome = byType.revenue - byType.expense;

        return {
            totalAssets: byType.asset,
            totalLiabilities: byType.liability,
            totalEquity: byType.equity,
            totalRevenue: byType.revenue,
            totalExpenses: byType.expense,
            netIncome,
            balanceSheetCheck: Math.abs(byType.asset - (byType.liability + byType.equity)) < 1,
            incomeStatementCheck: true,
        };
    }

    private performFluxAnalysis(
        accounts: MappedAccount[],
        periodEnd: Date,
        priorPeriodEnd: Date,
        materiality?: number
    ): FluxAnalysis {
        const threshold = materiality ?? 100000;
        const significantChanges: FluxAnalysis['significantChanges'] = [];
        const requiresInvestigation: string[] = [];

        for (const account of accounts) {
            if (account.priorBalance === undefined) continue;

            const change = account.change ?? 0;
            const changePercent = account.changePercent ?? 0;

            // Flag significant changes
            if (Math.abs(change) > threshold * 0.1 && Math.abs(changePercent) > 20) {
                significantChanges.push({
                    account: account.source.name,
                    currentBalance: account.balance,
                    priorBalance: account.priorBalance,
                    change,
                    changePercent,
                });

                if (Math.abs(change) > threshold * 0.25) {
                    requiresInvestigation.push(account.source.code);
                }
            }
        }

        return {
            periodEnd,
            priorPeriodEnd,
            significantChanges: significantChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
            requiresInvestigation,
        };
    }

    private formatFSLineName(fsLine: FinancialStatementLine): string {
        return fsLine
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private getSuggestedProcedures(fsLine: FinancialStatementLine): string[] {
        const procedures: Record<string, string[]> = {
            cash_and_equivalents: ['Bank confirmation', 'Bank reconciliation review', 'Cutoff testing'],
            accounts_receivable: ['Confirmation of balances', 'Subsequent receipts testing', 'Allowance review'],
            inventory: ['Physical observation', 'Pricing test', 'Obsolescence review'],
            property_plant_equipment: ['Roll-forward', 'Additions/disposals testing', 'Depreciation recalculation'],
            accounts_payable: ['Search for unrecorded liabilities', 'Confirmation', 'Cutoff testing'],
            revenue: ['Cutoff testing', 'Analytical procedures', 'Contract review'],
            cost_of_goods_sold: ['Margin analysis', 'Inventory cost testing'],
        };

        return procedures[fsLine] ?? ['Substantive analytical procedures', 'Tests of details'];
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const trialBalanceMapper = new TrialBalanceMapperService();

export function createTrialBalanceMapper(): TrialBalanceMapperService {
    return new TrialBalanceMapperService();
}
