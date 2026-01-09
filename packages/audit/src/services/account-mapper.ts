/**
 * Account Mapper
 * 
 * Maps trial balance accounts to financial statement line items using
 * pattern matching and ML-based classification.
 * 
 * @example
 * ```typescript
 * const mapper = new AccountMapper();
 * const predictions = mapper.predictMappings(trialBalance.accounts);
 * 
 * // Apply high-confidence mappings
 * const mapped = mapper.applyMappings(predictions, 0.85);
 * ```
 */

import type {
    TrialBalanceAccount,
    FSLineItem,
    AccountType,
    MappingPrediction,
    MappingRule,
    MappingCondition,
} from '../types/trial-balance.js';

// ============================================================================
// MAPPING PATTERNS
// ============================================================================

/**
 * Pre-defined patterns for common account classifications
 */
const FS_MAPPING_PATTERNS: {
    lineItem: FSLineItem;
    patterns: { field: 'accountNumber' | 'accountName'; regex: RegExp }[];
    accountTypes: AccountType[];
}[] = [
        // Assets - Current
        {
            lineItem: 'cash_and_equivalents',
            patterns: [
                { field: 'accountName', regex: /\b(cash|bank|petty|checking|savings|money\s*market)\b/i },
                { field: 'accountNumber', regex: /^1[0-1]\d{2}/ },
            ],
            accountTypes: ['asset'],
        },
        {
            lineItem: 'accounts_receivable',
            patterns: [
                { field: 'accountName', regex: /\b(accounts?\s*receivable|a\/?r|trade\s*receivable|customer\s*receivable)\b/i },
                { field: 'accountNumber', regex: /^12\d{2}/ },
            ],
            accountTypes: ['asset'],
        },
        {
            lineItem: 'inventory',
            patterns: [
                { field: 'accountName', regex: /\b(inventory|stock|merchandise|raw\s*material|work\s*in\s*progress|wip|finished\s*goods)\b/i },
                { field: 'accountNumber', regex: /^13\d{2}/ },
            ],
            accountTypes: ['asset'],
        },
        {
            lineItem: 'prepaid_expenses',
            patterns: [
                { field: 'accountName', regex: /\b(prepaid|advance|deposit)\b/i },
                { field: 'accountNumber', regex: /^14\d{2}/ },
            ],
            accountTypes: ['asset'],
        },

        // Assets - Non-Current
        {
            lineItem: 'property_plant_equipment',
            patterns: [
                { field: 'accountName', regex: /\b(property|plant|equipment|machinery|vehicle|furniture|fixture|building|land|ppe)\b/i },
                { field: 'accountNumber', regex: /^15\d{2}/ },
            ],
            accountTypes: ['asset'],
        },
        {
            lineItem: 'intangible_assets',
            patterns: [
                { field: 'accountName', regex: /\b(intangible|goodwill|patent|trademark|license|software|copyright)\b/i },
                { field: 'accountNumber', regex: /^16\d{2}/ },
            ],
            accountTypes: ['asset'],
        },
        {
            lineItem: 'investments',
            patterns: [
                { field: 'accountName', regex: /\b(investment|equity\s*method|subsidiary|associate|available\s*for\s*sale)\b/i },
                { field: 'accountNumber', regex: /^17\d{2}/ },
            ],
            accountTypes: ['asset'],
        },

        // Liabilities - Current
        {
            lineItem: 'accounts_payable',
            patterns: [
                { field: 'accountName', regex: /\b(accounts?\s*payable|a\/?p|trade\s*payable|vendor|supplier|creditor)\b/i },
                { field: 'accountNumber', regex: /^21\d{2}/ },
            ],
            accountTypes: ['liability'],
        },
        {
            lineItem: 'accrued_liabilities',
            patterns: [
                { field: 'accountName', regex: /\b(accrued|accrual|wages?\s*payable|salaries?\s*payable|taxes?\s*payable|interest\s*payable)\b/i },
                { field: 'accountNumber', regex: /^22\d{2}/ },
            ],
            accountTypes: ['liability'],
        },
        {
            lineItem: 'deferred_revenue',
            patterns: [
                { field: 'accountName', regex: /\b(deferred\s*(revenue|income)|unearned|advance\s*(from|payment)|contract\s*liability)\b/i },
                { field: 'accountNumber', regex: /^23\d{2}/ },
            ],
            accountTypes: ['liability'],
        },
        {
            lineItem: 'short_term_debt',
            patterns: [
                { field: 'accountName', regex: /\b(short\s*term\s*(debt|loan|note)|current\s*(portion|maturity)|line\s*of\s*credit)\b/i },
                { field: 'accountNumber', regex: /^24\d{2}/ },
            ],
            accountTypes: ['liability'],
        },

        // Liabilities - Non-Current
        {
            lineItem: 'long_term_debt',
            patterns: [
                { field: 'accountName', regex: /\b(long\s*term\s*(debt|loan|note)|bond|mortgage|term\s*loan)\b/i },
                { field: 'accountNumber', regex: /^26\d{2}/ },
            ],
            accountTypes: ['liability'],
        },
        {
            lineItem: 'deferred_tax_liability',
            patterns: [
                { field: 'accountName', regex: /\b(deferred\s*tax\s*liability|dtl)\b/i },
                { field: 'accountNumber', regex: /^27\d{2}/ },
            ],
            accountTypes: ['liability'],
        },

        // Equity
        {
            lineItem: 'common_stock',
            patterns: [
                { field: 'accountName', regex: /\b(common\s*stock|share\s*capital|paid\s*in\s*capital|contributed\s*capital|capital\s*stock)\b/i },
                { field: 'accountNumber', regex: /^31\d{2}/ },
            ],
            accountTypes: ['equity'],
        },
        {
            lineItem: 'retained_earnings',
            patterns: [
                { field: 'accountName', regex: /\b(retained\s*earnings|accumulated\s*(deficit|profits?)|undistributed)\b/i },
                { field: 'accountNumber', regex: /^32\d{2}/ },
            ],
            accountTypes: ['equity'],
        },

        // Revenue
        {
            lineItem: 'operating_revenue',
            patterns: [
                { field: 'accountName', regex: /\b(revenue|sales|service\s*(income|revenue)|fee\s*income|operating\s*income)\b/i },
                { field: 'accountNumber', regex: /^4[0-4]\d{2}/ },
            ],
            accountTypes: ['revenue'],
        },
        {
            lineItem: 'other_income',
            patterns: [
                { field: 'accountName', regex: /\b(other\s*income|interest\s*income|dividend\s*income|gain|non\s*operating)\b/i },
                { field: 'accountNumber', regex: /^4[5-9]\d{2}/ },
            ],
            accountTypes: ['revenue'],
        },

        // Expenses
        {
            lineItem: 'cost_of_goods_sold',
            patterns: [
                { field: 'accountName', regex: /\b(cost\s*of\s*(goods\s*sold|sales|revenue)|cogs|cos|direct\s*cost|material\s*cost)\b/i },
                { field: 'accountNumber', regex: /^5[0-2]\d{2}/ },
            ],
            accountTypes: ['expense'],
        },
        {
            lineItem: 'selling_general_admin',
            patterns: [
                { field: 'accountName', regex: /\b(selling|general|admin|sga|sg&a|operating\s*expense|salary|wages?|rent|utilities?|office|marketing|advertising)\b/i },
                { field: 'accountNumber', regex: /^6\d{3}/ },
            ],
            accountTypes: ['expense'],
        },
        {
            lineItem: 'depreciation_amortization',
            patterns: [
                { field: 'accountName', regex: /\b(depreciation|amortization|d&a)\b/i },
                { field: 'accountNumber', regex: /^7[0-2]\d{2}/ },
            ],
            accountTypes: ['expense'],
        },
        {
            lineItem: 'interest_expense',
            patterns: [
                { field: 'accountName', regex: /\b(interest\s*expense|finance\s*cost|borrowing\s*cost)\b/i },
                { field: 'accountNumber', regex: /^73\d{2}/ },
            ],
            accountTypes: ['expense'],
        },
        {
            lineItem: 'tax_expense',
            patterns: [
                { field: 'accountName', regex: /\b(income\s*tax|tax\s*expense|provision\s*for\s*tax)\b/i },
                { field: 'accountNumber', regex: /^8\d{3}/ },
            ],
            accountTypes: ['expense'],
        },
    ];

// ============================================================================
// ACCOUNT MAPPER
// ============================================================================

export class AccountMapper {
    private customRules: MappingRule[] = [];
    private learnedMappings: Map<string, FSLineItem> = new Map();
    private confidenceThreshold = 0.7;

    /**
     * Predict FS line item mappings for accounts
     */
    predictMappings(accounts: TrialBalanceAccount[]): MappingPrediction[] {
        return accounts.map(account => this.predictAccountMapping(account));
    }

    /**
     * Predict mapping for a single account
     */
    predictAccountMapping(account: TrialBalanceAccount): MappingPrediction {
        const predictions: MappingPrediction['predictions'] = [];

        // Check learned mappings first
        const learnedKey = this.getLearnedKey(account);
        const learnedMapping = this.learnedMappings.get(learnedKey);
        if (learnedMapping) {
            predictions.push({
                fsLineItem: learnedMapping,
                confidence: 0.95,
                reasoning: 'Previously mapped by user',
            });
        }

        // Check custom rules
        for (const rule of this.customRules) {
            if (this.matchesRule(account, rule)) {
                predictions.push({
                    fsLineItem: rule.targetLineItem,
                    confidence: 0.9,
                    reasoning: `Matched rule: ${rule.name}`,
                });
            }
        }

        // Check pattern-based mappings
        for (const pattern of FS_MAPPING_PATTERNS) {
            const score = this.calculatePatternScore(account, pattern);
            if (score > 0) {
                predictions.push({
                    fsLineItem: pattern.lineItem,
                    confidence: score,
                    reasoning: this.buildReasoning(account, pattern),
                });
            }
        }

        // Sort by confidence
        predictions.sort((a, b) => b.confidence - a.confidence);

        // Determine if review is needed
        const topPrediction = predictions[0];
        const requiresReview = !topPrediction ||
            topPrediction.confidence < this.confidenceThreshold ||
            (predictions.length > 1 && predictions[1].confidence > topPrediction.confidence * 0.8);

        return {
            accountId: account.id,
            predictions,
            suggestedLineItem: topPrediction?.fsLineItem ?? 'unmapped',
            requiresReview,
        };
    }

    /**
     * Apply mappings to accounts based on confidence threshold
     */
    applyMappings(
        predictions: MappingPrediction[],
        accounts: TrialBalanceAccount[],
        confidenceThreshold: number = this.confidenceThreshold
    ): { mapped: number; unmapped: number; reviewNeeded: number } {
        let mapped = 0;
        let unmapped = 0;
        let reviewNeeded = 0;

        const predictionMap = new Map(predictions.map(p => [p.accountId, p]));

        for (const account of accounts) {
            const prediction = predictionMap.get(account.id);

            if (!prediction || prediction.predictions.length === 0) {
                unmapped++;
                continue;
            }

            const topPrediction = prediction.predictions[0];

            if (topPrediction.confidence >= confidenceThreshold) {
                account.fsLineItem = topPrediction.fsLineItem;
                account.fsLineItemConfidence = topPrediction.confidence;
                account.isManuallyMapped = false;
                mapped++;
            } else if (prediction.requiresReview) {
                reviewNeeded++;
            } else {
                unmapped++;
            }
        }

        return { mapped, unmapped, reviewNeeded };
    }

    /**
     * Learn from user correction
     */
    learnFromCorrection(
        account: TrialBalanceAccount,
        correctedLineItem: FSLineItem
    ): void {
        const key = this.getLearnedKey(account);
        this.learnedMappings.set(key, correctedLineItem);

        // Update account
        account.fsLineItem = correctedLineItem;
        account.fsLineItemConfidence = 1.0;
        account.isManuallyMapped = true;
    }

    /**
     * Add a custom mapping rule
     */
    addRule(rule: MappingRule): void {
        this.customRules.push(rule);
        this.customRules.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get suggested FS line items based on account type
     */
    getSuggestionsForType(accountType: AccountType): FSLineItem[] {
        const suggestions: FSLineItem[] = [];

        for (const pattern of FS_MAPPING_PATTERNS) {
            if (pattern.accountTypes.includes(accountType)) {
                suggestions.push(pattern.lineItem);
            }
        }

        return [...new Set(suggestions)];
    }

    /**
     * Get mapping statistics
     */
    getMappingStats(accounts: TrialBalanceAccount[]): {
        total: number;
        mapped: number;
        unmapped: number;
        byLineItem: Record<string, number>;
        byConfidence: { high: number; medium: number; low: number };
    } {
        const byLineItem: Record<string, number> = {};
        const byConfidence = { high: 0, medium: 0, low: 0 };
        let mapped = 0;
        let unmapped = 0;

        for (const account of accounts) {
            if (account.fsLineItem && account.fsLineItem !== 'unmapped') {
                mapped++;
                byLineItem[account.fsLineItem] = (byLineItem[account.fsLineItem] ?? 0) + 1;

                const conf = account.fsLineItemConfidence ?? 0;
                if (conf >= 0.85) byConfidence.high++;
                else if (conf >= 0.7) byConfidence.medium++;
                else byConfidence.low++;
            } else {
                unmapped++;
            }
        }

        return {
            total: accounts.length,
            mapped,
            unmapped,
            byLineItem,
            byConfidence,
        };
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private calculatePatternScore(
        account: TrialBalanceAccount,
        pattern: typeof FS_MAPPING_PATTERNS[0]
    ): number {
        // Check account type compatibility
        if (!pattern.accountTypes.includes(account.accountType)) {
            return 0;
        }

        let matchCount = 0;
        let totalPatterns = pattern.patterns.length;

        for (const p of pattern.patterns) {
            const testValue = p.field === 'accountNumber'
                ? account.accountNumber
                : account.accountName;

            if (p.regex.test(testValue)) {
                matchCount++;
            }
        }

        if (matchCount === 0) return 0;

        // Base score from pattern matches
        let score = 0.5 + (matchCount / totalPatterns) * 0.4;

        // Boost for exact account type match
        const expectedType = this.getExpectedTypeForLineItem(pattern.lineItem);
        if (expectedType === account.accountType) {
            score += 0.1;
        }

        return Math.min(0.95, score);
    }

    private getExpectedTypeForLineItem(lineItem: FSLineItem): AccountType {
        if (lineItem.includes('asset') || ['cash_and_equivalents', 'accounts_receivable', 'inventory', 'prepaid_expenses', 'property_plant_equipment', 'intangible_assets', 'investments'].includes(lineItem)) {
            return 'asset';
        }
        if (lineItem.includes('liabilit') || ['accounts_payable', 'accrued_liabilities', 'deferred_revenue', 'short_term_debt', 'long_term_debt', 'deferred_tax_liability'].includes(lineItem)) {
            return 'liability';
        }
        if (lineItem.includes('equity') || ['common_stock', 'retained_earnings'].includes(lineItem)) {
            return 'equity';
        }
        if (lineItem.includes('revenue') || ['operating_revenue', 'other_income'].includes(lineItem)) {
            return 'revenue';
        }
        return 'expense';
    }

    private matchesRule(account: TrialBalanceAccount, rule: MappingRule): boolean {
        const results = rule.conditions.map(cond => this.evaluateCondition(account, cond));

        if (rule.matchType === 'all') {
            return results.every(r => r);
        } else {
            return results.some(r => r);
        }
    }

    private evaluateCondition(account: TrialBalanceAccount, condition: MappingCondition): boolean {
        let fieldValue: string | number;

        switch (condition.field) {
            case 'accountNumber':
                fieldValue = account.accountNumber;
                break;
            case 'accountName':
                fieldValue = account.accountName;
                break;
            case 'accountType':
                fieldValue = account.accountType;
                break;
            case 'balance':
                fieldValue = account.balance;
                break;
        }

        const strValue = String(fieldValue);
        const condValue = String(condition.value);
        const compareStr = condition.caseSensitive
            ? strValue
            : strValue.toLowerCase();
        const compareCondValue = condition.caseSensitive
            ? condValue
            : condValue.toLowerCase();

        switch (condition.operator) {
            case 'equals':
                return compareStr === compareCondValue;
            case 'contains':
                return compareStr.includes(compareCondValue);
            case 'startsWith':
                return compareStr.startsWith(compareCondValue);
            case 'endsWith':
                return compareStr.endsWith(compareCondValue);
            case 'regex':
                return new RegExp(condValue, condition.caseSensitive ? '' : 'i').test(strValue);
            case 'greaterThan':
                return typeof fieldValue === 'number' && fieldValue > Number(condition.value);
            case 'lessThan':
                return typeof fieldValue === 'number' && fieldValue < Number(condition.value);
            default:
                return false;
        }
    }

    private buildReasoning(account: TrialBalanceAccount, pattern: typeof FS_MAPPING_PATTERNS[0]): string {
        const matches: string[] = [];

        for (const p of pattern.patterns) {
            const testValue = p.field === 'accountNumber'
                ? account.accountNumber
                : account.accountName;

            if (p.regex.test(testValue)) {
                matches.push(`${p.field} matches pattern`);
            }
        }

        return matches.length > 0
            ? `Matched: ${matches.join(', ')}`
            : 'Inferred from account type';
    }

    private getLearnedKey(account: TrialBalanceAccount): string {
        // Create a key that generalizes similar accounts
        const normalizedName = account.accountName
            .toLowerCase()
            .replace(/[0-9]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return `${account.accountType}:${normalizedName}`;
    }
}

// Export default instance
export const accountMapper = new AccountMapper();
