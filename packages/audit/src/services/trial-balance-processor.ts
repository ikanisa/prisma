/**
 * Trial Balance Processor
 * 
 * Handles trial balance import, parsing, validation, and normalization.
 * Supports CSV, Excel, and common accounting software formats.
 * 
 * @example
 * ```typescript
 * const processor = new TrialBalanceProcessor();
 * const result = await processor.importFromCSV(fileContent, {
 *     engagementId: 'eng-123',
 *     periodEnd: new Date('2025-12-31'),
 * });
 * 
 * if (result.success) {
 *     console.log(`Imported ${result.trialBalance.totalAccounts} accounts`);
 * }
 * ```
 */

import type {
    TrialBalance,
    TrialBalanceAccount,
    ImportResult,
    ImportError,
    ImportWarning,
    ColumnMapping,
    TrialBalanceField,
    RawAccountRow,
    AccountType,
    AccountFlag,
    ImportFormat,
} from '../types/trial-balance.js';
import { calculateStatistics } from '../utils/statistical-analysis.js';

// ============================================================================
// PROCESSOR OPTIONS
// ============================================================================

export interface ImportOptions {
    engagementId: string;
    periodStart?: Date;
    periodEnd: Date;
    periodType?: 'month' | 'quarter' | 'year' | 'custom';
    presentationCurrency?: string;
    exchangeRates?: Record<string, number>;
    priorPeriodId?: string;
    columnMappings?: ColumnMapping[];
    skipHeaderRows?: number;
    delimiter?: string;
    encoding?: string;
}

// ============================================================================
// COLUMN PATTERNS FOR AUTO-MAPPING
// ============================================================================

const COLUMN_PATTERNS: Record<TrialBalanceField, RegExp[]> = {
    accountNumber: [
        /^(account|acct|acc)[_\s]*(number|num|no|code|id)?$/i,
        /^(gl|ledger)[_\s]*(code|number|no)?$/i,
        /^code$/i,
    ],
    accountName: [
        /^(account|acct|acc)[_\s]*(name|desc|description|title)?$/i,
        /^(name|description|desc|title)$/i,
    ],
    accountType: [
        /^(account|acct)?[_\s]*(type|category|class)$/i,
    ],
    debit: [
        /^debit[s]?$/i,
        /^dr$/i,
        /^debit[_\s]*(amount|balance)?$/i,
    ],
    credit: [
        /^credit[s]?$/i,
        /^cr$/i,
        /^credit[_\s]*(amount|balance)?$/i,
    ],
    balance: [
        /^balance$/i,
        /^(net|ending|closing)?[_\s]*balance$/i,
        /^amount$/i,
    ],
    openingBalance: [
        /^(opening|beginning|start)[_\s]*(balance|bal)?$/i,
        /^ob$/i,
    ],
    closingBalance: [
        /^(closing|ending|end)[_\s]*(balance|bal)?$/i,
        /^cb$/i,
    ],
    currency: [
        /^currency$/i,
        /^(ccy|curr)$/i,
    ],
    department: [
        /^(department|dept)$/i,
        /^(business[_\s]*unit|bu)$/i,
    ],
    costCenter: [
        /^(cost[_\s]*center|cc)$/i,
        /^(profit[_\s]*center|pc)$/i,
    ],
    notes: [
        /^(notes?|memo|comments?)$/i,
    ],
};

// ============================================================================
// ACCOUNT TYPE DETECTION PATTERNS
// ============================================================================

const ACCOUNT_TYPE_PATTERNS: { type: AccountType; patterns: RegExp[] }[] = [
    {
        type: 'asset',
        patterns: [
            /^1\d{2,}/,  // Common numbering: 1xxx = assets
            /\b(asset|cash|bank|receivable|inventory|prepaid|equipment|property|investment)\b/i,
        ],
    },
    {
        type: 'liability',
        patterns: [
            /^2\d{2,}/,  // Common numbering: 2xxx = liabilities
            /\b(liability|payable|accrued|deferred|debt|loan|mortgage)\b/i,
        ],
    },
    {
        type: 'equity',
        patterns: [
            /^3\d{2,}/,  // Common numbering: 3xxx = equity
            /\b(equity|capital|stock|retained|earnings|reserve)\b/i,
        ],
    },
    {
        type: 'revenue',
        patterns: [
            /^4\d{2,}/,  // Common numbering: 4xxx = revenue
            /\b(revenue|income|sales|fee|interest[_\s]*income)\b/i,
        ],
    },
    {
        type: 'expense',
        patterns: [
            /^[5-9]\d{2,}/,  // Common numbering: 5xxx-9xxx = expenses
            /\b(expense|cost|salary|wage|rent|depreciation|amortization|tax[_\s]*expense)\b/i,
        ],
    },
];

// ============================================================================
// TRIAL BALANCE PROCESSOR
// ============================================================================

export class TrialBalanceProcessor {
    private mappingConfidenceThreshold = 0.7;

    /**
     * Import trial balance from CSV content
     */
    async importFromCSV(
        content: string,
        options: ImportOptions
    ): Promise<ImportResult> {
        const startTime = Date.now();
        const errors: ImportError[] = [];
        const warnings: ImportWarning[] = [];

        try {
            // Parse CSV
            const rows = this.parseCSV(content, options.delimiter ?? ',');

            if (rows.length === 0) {
                return this.errorResult('No data found in CSV file', startTime);
            }

            // Extract headers and data rows
            const skipRows = options.skipHeaderRows ?? 0;
            const headers = rows[skipRows];
            const dataRows = rows.slice(skipRows + 1);

            if (!headers || headers.length === 0) {
                return this.errorResult('No headers found in CSV file', startTime);
            }

            // Auto-map columns if not provided
            const columnMappings = options.columnMappings ?? this.autoMapColumns(headers);
            const mappingConfidence = this.calculateMappingConfidence(columnMappings, headers);

            // Validate required mappings
            const requiredFields: TrialBalanceField[] = ['accountNumber', 'accountName'];
            const hasBalance = columnMappings.some(m =>
                m.targetField === 'balance' || m.targetField === 'debit' || m.targetField === 'credit'
            );

            for (const field of requiredFields) {
                if (!columnMappings.some(m => m.targetField === field)) {
                    errors.push({
                        code: 'MISSING_REQUIRED_FIELD',
                        message: `Required field "${field}" could not be mapped`,
                        severity: 'error',
                    });
                }
            }

            if (!hasBalance) {
                errors.push({
                    code: 'MISSING_BALANCE_FIELD',
                    message: 'No balance, debit, or credit column could be mapped',
                    severity: 'error',
                });
            }

            if (errors.some(e => e.severity === 'fatal' || e.severity === 'error')) {
                return {
                    success: false,
                    columnMappings,
                    mappingConfidence,
                    suggestedMappings: this.suggestMissingMappings(columnMappings, headers),
                    errors,
                    warnings,
                    totalRows: dataRows.length,
                    importedRows: 0,
                    skippedRows: dataRows.length,
                    processingTimeMs: Date.now() - startTime,
                };
            }

            // Parse accounts
            const accounts: TrialBalanceAccount[] = [];
            let skippedRows = 0;

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNumber = skipRows + i + 2; // 1-indexed, after header

                try {
                    const account = this.parseAccountRow(row, headers, columnMappings, rowNumber, options);

                    if (account) {
                        // Detect account type if not provided
                        if (!account.accountType || account.accountType === 'other') {
                            account.accountType = this.detectAccountType(account);
                        }

                        // Add audit flags
                        account.flags = this.generateFlags(account);

                        accounts.push(account);
                    } else {
                        skippedRows++;
                    }
                } catch (error) {
                    warnings.push({
                        row: rowNumber,
                        code: 'ROW_PARSE_ERROR',
                        message: error instanceof Error ? error.message : String(error),
                    });
                    skippedRows++;
                }
            }

            // Calculate totals
            const totalDebits = accounts.reduce((sum, a) => sum + a.debit, 0);
            const totalCredits = accounts.reduce((sum, a) => sum + a.credit, 0);
            const balanceDifference = Math.abs(totalDebits - totalCredits);
            const isBalanced = balanceDifference < 0.01;

            if (!isBalanced) {
                warnings.push({
                    code: 'UNBALANCED_TB',
                    message: `Trial balance is out of balance by ${balanceDifference.toFixed(2)}`,
                });
            }

            // Create trial balance
            const trialBalance: TrialBalance = {
                id: crypto.randomUUID(),
                engagementId: options.engagementId,
                name: `Trial Balance - ${options.periodEnd.toISOString().split('T')[0]}`,
                periodStart: options.periodStart ?? new Date(options.periodEnd.getFullYear(), 0, 1),
                periodEnd: options.periodEnd,
                periodType: options.periodType ?? 'year',
                accounts,
                totalAccounts: accounts.length,
                totalDebits,
                totalCredits,
                isBalanced,
                balanceDifference,
                presentationCurrency: options.presentationCurrency ?? 'USD',
                foreignCurrencies: this.detectForeignCurrencies(accounts),
                exchangeRates: options.exchangeRates,
                sourceFile: 'csv_import',
                sourceFormat: 'csv',
                importedAt: new Date(),
                importedBy: 'system',
                mappingStatus: 'pending',
                mappedAccountsCount: 0,
                unmappedAccountsCount: accounts.length,
                priorPeriodId: options.priorPeriodId,
                hasPriorPeriod: !!options.priorPeriodId,
            };

            return {
                success: true,
                trialBalance,
                columnMappings,
                mappingConfidence,
                suggestedMappings: [],
                errors,
                warnings,
                totalRows: dataRows.length,
                importedRows: accounts.length,
                skippedRows,
                processingTimeMs: Date.now() - startTime,
            };

        } catch (error) {
            return this.errorResult(
                error instanceof Error ? error.message : 'Unknown import error',
                startTime
            );
        }
    }

    /**
     * Parse CSV content into rows
     */
    private parseCSV(content: string, delimiter: string): string[][] {
        const rows: string[][] = [];
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            if (line.trim() === '') continue;

            const row: string[] = [];
            let currentField = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        currentField += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === delimiter && !inQuotes) {
                    row.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            row.push(currentField.trim());
            rows.push(row);
        }

        return rows;
    }

    /**
     * Auto-map columns based on header names
     */
    private autoMapColumns(headers: string[]): ColumnMapping[] {
        const mappings: ColumnMapping[] = [];
        const usedFields = new Set<TrialBalanceField>();

        for (const header of headers) {
            if (!header) continue;

            for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
                if (usedFields.has(field as TrialBalanceField)) continue;

                for (const pattern of patterns) {
                    if (pattern.test(header)) {
                        mappings.push({
                            sourceColumn: header,
                            targetField: field as TrialBalanceField,
                        });
                        usedFields.add(field as TrialBalanceField);
                        break;
                    }
                }
            }
        }

        return mappings;
    }

    /**
     * Calculate confidence score for column mappings
     */
    private calculateMappingConfidence(mappings: ColumnMapping[], headers: string[]): number {
        const requiredFields: TrialBalanceField[] = ['accountNumber', 'accountName', 'balance'];
        const optionalFields: TrialBalanceField[] = ['debit', 'credit', 'accountType'];

        let score = 0;
        const totalWeight = requiredFields.length * 3 + optionalFields.length;

        for (const field of requiredFields) {
            if (mappings.some(m => m.targetField === field)) {
                score += 3;
            }
        }

        for (const field of optionalFields) {
            if (mappings.some(m => m.targetField === field)) {
                score += 1;
            }
        }

        // Check if we have debit/credit instead of balance
        if (!mappings.some(m => m.targetField === 'balance') &&
            mappings.some(m => m.targetField === 'debit') &&
            mappings.some(m => m.targetField === 'credit')) {
            score += 3; // Equivalent to having balance
        }

        return score / totalWeight;
    }

    /**
     * Suggest mappings for unmapped columns
     */
    private suggestMissingMappings(currentMappings: ColumnMapping[], headers: string[]): ColumnMapping[] {
        const suggestions: ColumnMapping[] = [];
        const mappedColumns = new Set(currentMappings.map(m => m.sourceColumn));

        for (const header of headers) {
            if (!header || mappedColumns.has(header)) continue;

            // Look for partial matches
            const lowerHeader = header.toLowerCase();

            if (lowerHeader.includes('account') && lowerHeader.includes('num')) {
                suggestions.push({ sourceColumn: header, targetField: 'accountNumber' });
            } else if (lowerHeader.includes('account') && lowerHeader.includes('name')) {
                suggestions.push({ sourceColumn: header, targetField: 'accountName' });
            } else if (lowerHeader.includes('debit') || lowerHeader === 'dr') {
                suggestions.push({ sourceColumn: header, targetField: 'debit' });
            } else if (lowerHeader.includes('credit') || lowerHeader === 'cr') {
                suggestions.push({ sourceColumn: header, targetField: 'credit' });
            } else if (lowerHeader.includes('balance') || lowerHeader.includes('amount')) {
                suggestions.push({ sourceColumn: header, targetField: 'balance' });
            }
        }

        return suggestions;
    }

    /**
     * Parse a single account row
     */
    private parseAccountRow(
        row: string[],
        headers: string[],
        mappings: ColumnMapping[],
        rowNumber: number,
        options: ImportOptions
    ): TrialBalanceAccount | null {
        const getValue = (field: TrialBalanceField): string | null => {
            const mapping = mappings.find(m => m.targetField === field);
            if (!mapping) return null;

            const colIndex = headers.indexOf(mapping.sourceColumn);
            if (colIndex < 0 || colIndex >= row.length) return null;

            let value = row[colIndex];

            // Apply transformation
            if (mapping.transformation) {
                switch (mapping.transformation) {
                    case 'trim':
                        value = value.trim();
                        break;
                    case 'uppercase':
                        value = value.toUpperCase();
                        break;
                }
            }

            return value || null;
        };

        const getNumericValue = (field: TrialBalanceField): number => {
            const value = getValue(field);
            if (!value) return 0;

            // Remove currency symbols, commas, parentheses (for negative)
            let cleaned = value.replace(/[$€£¥,]/g, '').trim();
            const isNegative = cleaned.includes('(') || cleaned.startsWith('-');
            cleaned = cleaned.replace(/[()]/g, '').replace('-', '');

            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : (isNegative ? -num : num);
        };

        const accountNumber = getValue('accountNumber');
        const accountName = getValue('accountName');

        // Skip rows without account number or name
        if (!accountNumber && !accountName) {
            return null;
        }

        // Get debit/credit or balance
        let debit = getNumericValue('debit');
        let credit = getNumericValue('credit');
        let balance = getNumericValue('balance');

        // If we have balance but not debit/credit, derive them
        if (balance !== 0 && debit === 0 && credit === 0) {
            if (balance > 0) {
                debit = balance;
            } else {
                credit = Math.abs(balance);
            }
        }

        // If we have debit/credit but not balance, calculate it
        if (balance === 0 && (debit !== 0 || credit !== 0)) {
            balance = debit - credit;
        }

        const account: TrialBalanceAccount = {
            id: crypto.randomUUID(),
            accountNumber: accountNumber ?? '',
            accountName: accountName ?? '',
            accountType: 'other',
            debit: Math.abs(debit),
            credit: Math.abs(credit),
            balance,
            openingBalance: getNumericValue('openingBalance'),
            closingBalance: getNumericValue('closingBalance'),
            currency: getValue('currency') ?? options.presentationCurrency ?? 'USD',
            department: getValue('department') ?? undefined,
            costCenter: getValue('costCenter') ?? undefined,
            notes: getValue('notes') ?? undefined,
            isManuallyMapped: false,
            level: this.detectAccountLevel(accountNumber ?? ''),
            isHeader: this.isHeaderAccount(accountNumber ?? '', accountName ?? ''),
            flags: [],
        };

        return account;
    }

    /**
     * Detect account type from account number/name patterns
     */
    private detectAccountType(account: TrialBalanceAccount): AccountType {
        const testString = `${account.accountNumber} ${account.accountName}`;

        for (const { type, patterns } of ACCOUNT_TYPE_PATTERNS) {
            for (const pattern of patterns) {
                if (pattern.test(testString)) {
                    return type;
                }
            }
        }

        return 'other';
    }

    /**
     * Detect account level in hierarchy (based on number pattern)
     */
    private detectAccountLevel(accountNumber: string): number {
        // Common patterns: 1000 = level 1, 1100 = level 2, 1110 = level 3
        const digits = accountNumber.replace(/\D/g, '');

        if (digits.length <= 1) return 1;
        if (digits.length === 2) return 1;
        if (digits.length === 3) return digits.endsWith('0') ? 1 : 2;
        if (digits.length === 4) {
            if (digits.endsWith('00')) return 1;
            if (digits.endsWith('0')) return 2;
            return 3;
        }

        return 3;
    }

    /**
     * Check if account is a header/group account
     */
    private isHeaderAccount(accountNumber: string, accountName: string): boolean {
        // Headers often end in zeros
        const digits = accountNumber.replace(/\D/g, '');
        if (digits.length >= 3 && digits.endsWith('00')) return true;

        // Headers often have keywords
        const headerKeywords = /^(total|sub-?total|group|category|section)/i;
        if (headerKeywords.test(accountName)) return true;

        return false;
    }

    /**
     * Generate audit flags for an account
     */
    private generateFlags(account: TrialBalanceAccount): AccountFlag[] {
        const flags: AccountFlag[] = [];

        // Large balance flag
        if (Math.abs(account.balance) > 1000000) {
            flags.push({
                type: 'material',
                severity: 'high',
                message: 'Large balance - potential materiality impact',
            });
        }

        // Variance flag (if prior year data available)
        if (account.priorYearBalance !== undefined) {
            const variance = account.balance - account.priorYearBalance;
            const variancePercent = account.priorYearBalance !== 0
                ? (variance / Math.abs(account.priorYearBalance)) * 100
                : 0;

            if (Math.abs(variancePercent) > 25) {
                flags.push({
                    type: 'variance',
                    severity: Math.abs(variancePercent) > 50 ? 'high' : 'medium',
                    message: `Significant variance from prior year: ${variancePercent.toFixed(1)}%`,
                });
            }
        }

        // Unusual balance direction
        if (account.accountType === 'asset' && account.balance < 0) {
            flags.push({
                type: 'unusual',
                severity: 'medium',
                message: 'Asset account has credit balance',
            });
        }

        if (account.accountType === 'liability' && account.balance > 0) {
            flags.push({
                type: 'unusual',
                severity: 'medium',
                message: 'Liability account has debit balance',
            });
        }

        return flags;
    }

    /**
     * Detect foreign currencies in accounts
     */
    private detectForeignCurrencies(accounts: TrialBalanceAccount[]): string[] {
        const currencies = new Set<string>();
        for (const account of accounts) {
            if (account.currency) {
                currencies.add(account.currency);
            }
        }
        return Array.from(currencies);
    }

    /**
     * Create error result
     */
    private errorResult(message: string, startTime: number): ImportResult {
        return {
            success: false,
            columnMappings: [],
            mappingConfidence: 0,
            suggestedMappings: [],
            errors: [{ code: 'IMPORT_FAILED', message, severity: 'fatal' }],
            warnings: [],
            totalRows: 0,
            importedRows: 0,
            skippedRows: 0,
            processingTimeMs: Date.now() - startTime,
        };
    }
}

// Export default instance
export const trialBalanceProcessor = new TrialBalanceProcessor();
