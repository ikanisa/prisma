/**
 * Journal Entry Testing Agent
 * 
 * Implements 100% journal entry population analysis per CAS 240.32(a).
 * CPAB focus area requiring enhanced documentation.
 * 
 * Features:
 * - Full population analysis (not sampling)
 * - Risk-based filtering criteria
 * - Benford's Law analysis for anomaly detection
 * - ML-ready anomaly detection framework
 * - CAS 230 compliant workpaper generation
 * 
 * @package @prisma/audit-canada
 */

import type {
    JournalEntryTest,
    JETestCriteria,
    AuditFinding,
    AuditWorkpaper,
    AuditContext,
    AuditAgentResponse,
    AuditAgentType,
} from '../types/index.js';

// ============================================================================
// JOURNAL ENTRY TYPES
// ============================================================================

export interface JournalEntry {
    entryId: string;
    entryDate: Date;
    postingDate: Date;
    description: string;
    preparedBy: string;
    approvedBy?: string;
    source: 'manual' | 'system' | 'import' | 'interface';
    lines: JournalEntryLine[];
    totalDebit: number;
    totalCredit: number;
    isReversing: boolean;
    isRecurring: boolean;
    attachments: string[];
}

export interface JournalEntryLine {
    lineNumber: number;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    costCenter?: string;
    project?: string;
}

export interface HighRiskJournalEntry extends JournalEntry {
    riskIndicators: string[];
    riskScore: number;
}

export interface JEAnomalyResult {
    entryId: string;
    anomalyTypes: string[];
    severity: 'low' | 'medium' | 'high';
    description: string;
    requiresFollowUp: boolean;
}

export interface BenfordResult {
    digit: number;
    expected: number;
    actual: number;
    variance: number;
    isOutlier: boolean;
    zScore: number;
}

// ============================================================================
// HIGH-RISK CRITERIA (per CAS 240.A48)
// ============================================================================

const HIGH_RISK_CRITERIA: JETestCriteria[] = [
    {
        criteriaId: 'HRC-001',
        description: 'Entries made by unusual users (non-accounting personnel)',
        entriesMatched: 0,
        riskIndicator: 'Unauthorized posting access',
    },
    {
        criteriaId: 'HRC-002',
        description: 'Entries posted on weekends or holidays',
        entriesMatched: 0,
        riskIndicator: 'Unusual timing - weekend/holiday',
    },
    {
        criteriaId: 'HRC-003',
        description: 'Entries posted after normal business hours (7pm-6am)',
        entriesMatched: 0,
        riskIndicator: 'Unusual timing - after hours',
    },
    {
        criteriaId: 'HRC-004',
        description: 'Large round number entries (multiples of $10,000)',
        entriesMatched: 0,
        riskIndicator: 'Estimated entry pattern',
    },
    {
        criteriaId: 'HRC-005',
        description: 'Entries with unusual account combinations',
        entriesMatched: 0,
        riskIndicator: 'Non-standard account pairing',
    },
    {
        criteriaId: 'HRC-006',
        description: 'Manual entries in normally automated processes',
        entriesMatched: 0,
        riskIndicator: 'Override of automated controls',
    },
    {
        criteriaId: 'HRC-007',
        description: 'Entries at or near period end (last 3 days)',
        entriesMatched: 0,
        riskIndicator: 'Period-end manipulation risk',
    },
    {
        criteriaId: 'HRC-008',
        description: 'Entries with blank or vague descriptions',
        entriesMatched: 0,
        riskIndicator: 'Lack of documentation',
    },
    {
        criteriaId: 'HRC-009',
        description: 'Entries to seldom-used accounts',
        entriesMatched: 0,
        riskIndicator: 'Unusual account activity',
    },
    {
        criteriaId: 'HRC-010',
        description: 'Entries impacting revenue immediately before period end',
        entriesMatched: 0,
        riskIndicator: 'Revenue manipulation risk',
    },
    {
        criteriaId: 'HRC-011',
        description: 'Entries without proper approval',
        entriesMatched: 0,
        riskIndicator: 'Control bypass',
    },
    {
        criteriaId: 'HRC-012',
        description: 'Reversing entries in subsequent period',
        entriesMatched: 0,
        riskIndicator: 'Temporary adjustments',
    },
];

// ============================================================================
// BENFORD'S LAW EXPECTED FREQUENCIES
// ============================================================================

const BENFORD_EXPECTED: Record<number, number> = {
    1: 0.301,
    2: 0.176,
    3: 0.125,
    4: 0.097,
    5: 0.079,
    6: 0.067,
    7: 0.058,
    8: 0.051,
    9: 0.046,
};

// ============================================================================
// JOURNAL ENTRY TESTING AGENT
// ============================================================================

export interface JournalEntryTestingAgentConfig {
    roundNumberThreshold: number;
    weekendRisk: boolean;
    afterHoursStart: number;  // 24-hour format
    afterHoursEnd: number;
    periodEndDays: number;
    benfordZScoreThreshold: number;
    organizationId?: string;
    userId?: string;
}

const DEFAULT_CONFIG: JournalEntryTestingAgentConfig = {
    roundNumberThreshold: 10000,
    weekendRisk: true,
    afterHoursStart: 19, // 7pm
    afterHoursEnd: 6,    // 6am
    periodEndDays: 3,
    benfordZScoreThreshold: 2.58, // 99% confidence
};

export class JournalEntryTestingAgent {
    public readonly slug = 'canada-journal-entry-testing';
    public readonly name = 'Journal Entry Testing Agent';
    public readonly version = '1.0.0';
    public readonly agentType: AuditAgentType = 'journal_entry_testing';

    private config: JournalEntryTestingAgentConfig;

    constructor(config: Partial<JournalEntryTestingAgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // =========================================================================
    // MAIN ANALYSIS
    // =========================================================================

    /**
     * Analyze full journal entry population per CAS 240.32(a)
     */
    analyzeJournalEntries(
        population: JournalEntry[],
        fiscalYearEnd: Date,
        accountingUsers: string[],
        context: AuditContext
    ): AuditAgentResponse<JournalEntryTest> {
        const startTime = Date.now();

        try {
            // Clone criteria to track matches
            const criteria: JETestCriteria[] = HIGH_RISK_CRITERIA.map(c => ({ ...c, entriesMatched: 0 }));

            // Step 1: Apply risk-based filters
            const highRiskEntries = this.filterHighRiskEntries(
                population,
                fiscalYearEnd,
                accountingUsers,
                criteria
            );

            // Step 2: Detect anomalies
            const anomalies = this.detectAnomalies(population);

            // Step 3: Benford's Law analysis
            const benfordResults = this.benfordAnalysis(population);

            // Step 4: Generate findings
            const findings = this.generateFindings(highRiskEntries, anomalies, benfordResults);

            const testResult: JournalEntryTest = {
                testId: `JET-${context.engagementId}-${Date.now()}`,
                fiscalYear: fiscalYearEnd.getFullYear().toString(),
                totalPopulation: population.length,
                highRiskEntries: highRiskEntries.length,
                anomaliesDetected: anomalies.length,
                benfordOutliers: benfordResults.filter(b => b.isOutlier).length,
                testCriteria: criteria,
                findings,
                workpaperRef: `WP-JET-${context.engagementId}`,
            };

            return {
                success: true,
                data: testResult,
                workpaperRef: testResult.workpaperRef,
                casReferences: ['CAS_240', 'CAS_330', 'CAS_230'],
                processingTimeMs: Date.now() - startTime,
                warnings: findings.length > 0
                    ? [`${findings.length} finding(s) require follow-up`]
                    : undefined,
            };
        } catch (error) {
            return {
                success: false,
                errors: [`JE testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                casReferences: ['CAS_240'],
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // =========================================================================
    // HIGH-RISK FILTERING
    // =========================================================================

    /**
     * Filter entries meeting high-risk criteria
     */
    filterHighRiskEntries(
        population: JournalEntry[],
        fiscalYearEnd: Date,
        accountingUsers: string[],
        criteria: JETestCriteria[]
    ): HighRiskJournalEntry[] {
        const highRiskEntries: HighRiskJournalEntry[] = [];

        // Calculate period end threshold
        const periodEndThreshold = new Date(fiscalYearEnd);
        periodEndThreshold.setDate(periodEndThreshold.getDate() - this.config.periodEndDays);

        // Get list of seldom-used accounts (for simplified analysis, use accounts with < 5 entries)
        const accountFrequency = new Map<string, number>();
        for (const entry of population) {
            for (const line of entry.lines) {
                accountFrequency.set(
                    line.accountCode,
                    (accountFrequency.get(line.accountCode) || 0) + 1
                );
            }
        }
        const seldomUsedAccounts = new Set(
            Array.from(accountFrequency.entries())
                .filter(([, count]) => count < 5)
                .map(([code]) => code)
        );

        for (const entry of population) {
            const riskIndicators: string[] = [];
            let riskScore = 0;

            // HRC-001: Unusual users
            if (!accountingUsers.includes(entry.preparedBy)) {
                riskIndicators.push('Unusual user');
                riskScore += 3;
                this.incrementCriteria(criteria, 'HRC-001');
            }

            // HRC-002: Weekend posting
            const dayOfWeek = entry.postingDate.getDay();
            if (this.config.weekendRisk && (dayOfWeek === 0 || dayOfWeek === 6)) {
                riskIndicators.push('Weekend posting');
                riskScore += 2;
                this.incrementCriteria(criteria, 'HRC-002');
            }

            // HRC-003: After hours
            const hour = entry.postingDate.getHours();
            if (hour >= this.config.afterHoursStart || hour < this.config.afterHoursEnd) {
                riskIndicators.push('After hours posting');
                riskScore += 2;
                this.incrementCriteria(criteria, 'HRC-003');
            }

            // HRC-004: Round numbers
            if (this.isRoundNumber(entry.totalDebit) || this.isRoundNumber(entry.totalCredit)) {
                riskIndicators.push('Round number');
                riskScore += 1;
                this.incrementCriteria(criteria, 'HRC-004');
            }

            // HRC-005: Unusual account combinations
            if (this.hasUnusualAccountCombination(entry)) {
                riskIndicators.push('Unusual account combination');
                riskScore += 2;
                this.incrementCriteria(criteria, 'HRC-005');
            }

            // HRC-006: Manual in automated process
            if (entry.source === 'manual' && this.isTypicallyAutomated(entry)) {
                riskIndicators.push('Manual in automated process');
                riskScore += 3;
                this.incrementCriteria(criteria, 'HRC-006');
            }

            // HRC-007: Period end
            if (entry.entryDate >= periodEndThreshold && entry.entryDate <= fiscalYearEnd) {
                riskIndicators.push('Period end entry');
                riskScore += 2;
                this.incrementCriteria(criteria, 'HRC-007');
            }

            // HRC-008: Vague description
            if (this.hasVagueDescription(entry.description)) {
                riskIndicators.push('Vague description');
                riskScore += 1;
                this.incrementCriteria(criteria, 'HRC-008');
            }

            // HRC-009: Seldom-used accounts
            if (entry.lines.some(line => seldomUsedAccounts.has(line.accountCode))) {
                riskIndicators.push('Seldom-used account');
                riskScore += 2;
                this.incrementCriteria(criteria, 'HRC-009');
            }

            // HRC-010: Revenue entries near period end
            if (
                entry.entryDate >= periodEndThreshold &&
                entry.lines.some(line => line.accountCode.startsWith('4'))
            ) {
                riskIndicators.push('Revenue near period end');
                riskScore += 3;
                this.incrementCriteria(criteria, 'HRC-010');
            }

            // HRC-011: No approval
            if (!entry.approvedBy) {
                riskIndicators.push('No approval');
                riskScore += 2;
                this.incrementCriteria(criteria, 'HRC-011');
            }

            // HRC-012: Reversing entry
            if (entry.isReversing) {
                riskIndicators.push('Reversing entry');
                riskScore += 1;
                this.incrementCriteria(criteria, 'HRC-012');
            }

            // Add to high-risk if score exceeds threshold
            if (riskScore >= 3) {
                highRiskEntries.push({
                    ...entry,
                    riskIndicators,
                    riskScore,
                });
            }
        }

        // Sort by risk score descending
        return highRiskEntries.sort((a, b) => b.riskScore - a.riskScore);
    }

    private incrementCriteria(criteria: JETestCriteria[], criteriaId: string): void {
        const criterion = criteria.find(c => c.criteriaId === criteriaId);
        if (criterion) {
            criterion.entriesMatched++;
        }
    }

    private isRoundNumber(amount: number): boolean {
        if (amount === 0) return false;
        return amount % this.config.roundNumberThreshold === 0;
    }

    private hasUnusualAccountCombination(entry: JournalEntry): boolean {
        // Simple heuristic: Revenue credited with non-standard debit
        const hasRevenue = entry.lines.some(l => l.accountCode.startsWith('4') && l.credit > 0);
        const hasNonStandardDebit = entry.lines.some(l =>
            l.debit > 0 && !l.accountCode.startsWith('1') && !l.accountCode.startsWith('5')
        );
        return hasRevenue && hasNonStandardDebit;
    }

    private isTypicallyAutomated(entry: JournalEntry): boolean {
        // Entries to payroll, depreciation, interest accounts typically automated
        const automatedPatterns = ['5200', '5300', '6100']; // Example account codes
        return entry.lines.some(l =>
            automatedPatterns.some(pattern => l.accountCode.startsWith(pattern))
        );
    }

    private hasVagueDescription(description: string): boolean {
        const vagueTerms = [
            'adjustment',
            'correction',
            'fix',
            'misc',
            'miscellaneous',
            'other',
            'various',
            '',
        ];
        const normalized = description.toLowerCase().trim();
        return vagueTerms.some(term => normalized === term || normalized.length < 5);
    }

    // =========================================================================
    // ANOMALY DETECTION
    // =========================================================================

    /**
     * Detect anomalies using statistical methods
     */
    detectAnomalies(population: JournalEntry[]): JEAnomalyResult[] {
        const anomalies: JEAnomalyResult[] = [];

        // Calculate statistics
        const amounts = population.map(e => e.totalDebit).filter(a => a > 0);
        const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const stdDev = Math.sqrt(
            amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length
        );

        // Detect statistical outliers (Z-score > 3)
        for (const entry of population) {
            const zScore = (entry.totalDebit - mean) / stdDev;

            if (Math.abs(zScore) > 3) {
                anomalies.push({
                    entryId: entry.entryId,
                    anomalyTypes: ['statistical_outlier'],
                    severity: Math.abs(zScore) > 4 ? 'high' : 'medium',
                    description: `Amount ${entry.totalDebit.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })} is ${zScore.toFixed(2)} standard deviations from mean`,
                    requiresFollowUp: true,
                });
            }
        }

        // Detect duplicate entries
        const entrySignatures = new Map<string, JournalEntry[]>();
        for (const entry of population) {
            const signature = `${entry.entryDate.toISOString().slice(0, 10)}-${entry.totalDebit.toFixed(2)}-${entry.description.slice(0, 20)}`;
            if (!entrySignatures.has(signature)) {
                entrySignatures.set(signature, []);
            }
            entrySignatures.get(signature)!.push(entry);
        }

        for (const [signature, entries] of entrySignatures) {
            if (entries.length > 1) {
                for (const entry of entries) {
                    anomalies.push({
                        entryId: entry.entryId,
                        anomalyTypes: ['potential_duplicate'],
                        severity: 'medium',
                        description: `Potential duplicate: ${entries.length} entries with similar characteristics (${signature})`,
                        requiresFollowUp: true,
                    });
                }
            }
        }

        return anomalies;
    }

    // =========================================================================
    // BENFORD'S LAW ANALYSIS
    // =========================================================================

    /**
     * Perform Benford's Law analysis on transaction amounts
     */
    benfordAnalysis(population: JournalEntry[]): BenfordResult[] {
        // Extract first digits from all amounts
        const amounts = population
            .flatMap(e => e.lines.map(l => Math.max(l.debit, l.credit)))
            .filter(a => a >= 10); // Need at least 2 digits

        if (amounts.length < 100) {
            // Benford's Law requires sufficient sample size
            return [];
        }

        // Count first digit frequencies
        const digitCounts: Record<number, number> = {};
        for (let d = 1; d <= 9; d++) {
            digitCounts[d] = 0;
        }

        for (const amount of amounts) {
            const firstDigit = parseInt(amount.toString()[0]);
            if (firstDigit >= 1 && firstDigit <= 9) {
                digitCounts[firstDigit]++;
            }
        }

        // Calculate results
        const results: BenfordResult[] = [];
        const totalCount = amounts.length;

        for (let digit = 1; digit <= 9; digit++) {
            const actual = digitCounts[digit] / totalCount;
            const expected = BENFORD_EXPECTED[digit];
            const variance = actual - expected;

            // Z-score for proportion test
            const se = Math.sqrt((expected * (1 - expected)) / totalCount);
            const zScore = variance / se;
            const isOutlier = Math.abs(zScore) > this.config.benfordZScoreThreshold;

            results.push({
                digit,
                expected,
                actual,
                variance,
                isOutlier,
                zScore,
            });
        }

        return results;
    }

    // =========================================================================
    // FINDINGS GENERATION
    // =========================================================================

    private generateFindings(
        highRiskEntries: HighRiskJournalEntry[],
        anomalies: JEAnomalyResult[],
        benfordResults: BenfordResult[]
    ): AuditFinding[] {
        const findings: AuditFinding[] = [];

        // High-risk entry findings
        for (const entry of highRiskEntries.slice(0, 20)) { // Top 20 by risk
            findings.push({
                findingId: `JET-HR-${entry.entryId}`,
                type: 'fraud_indicator',
                severity: entry.riskScore >= 5 ? 'significant' : 'minor',
                description: `High-risk journal entry: ${entry.riskIndicators.join(', ')}`,
                accountAffected: entry.lines[0]?.accountName || 'Multiple',
                amount: entry.totalDebit,
                casReference: 'CAS_240',
                status: 'open',
            });
        }

        // Anomaly findings
        for (const anomaly of anomalies.filter(a => a.severity === 'high')) {
            findings.push({
                findingId: `JET-AN-${anomaly.entryId}`,
                type: 'fraud_indicator',
                severity: 'significant',
                description: anomaly.description,
                accountAffected: 'Various',
                casReference: 'CAS_240',
                status: 'open',
            });
        }

        // Benford outlier findings
        const benfordOutliers = benfordResults.filter(r => r.isOutlier);
        if (benfordOutliers.length > 0) {
            findings.push({
                findingId: 'JET-BEN-001',
                type: 'fraud_indicator',
                severity: benfordOutliers.length >= 3 ? 'significant' : 'minor',
                description: `Benford's Law analysis: ${benfordOutliers.length} digit(s) deviate significantly from expected distribution`,
                accountAffected: 'All accounts tested',
                casReference: 'CAS_240',
                status: 'open',
            });
        }

        return findings;
    }

    // =========================================================================
    // WORKPAPER GENERATION
    // =========================================================================

    /**
     * Generate CAS 230 compliant workpaper
     */
    generateWorkpaper(testResult: JournalEntryTest, context: AuditContext): AuditWorkpaper {
        const content = `
## JOURNAL ENTRY TESTING WORKPAPER

### Objective
Test journal entries for indicators of fraud per CAS 240.32(a), including:
- Entries made by unexpected personnel
- Entries reflecting unusual account combinations
- Entries at unusual times (weekends, holidays, after hours)
- Other characteristics indicative of fraud risk

### Population
- **Total Journal Entries Tested**: ${testResult.totalPopulation.toLocaleString()}
- **Fiscal Year**: ${testResult.fiscalYear}
- **Date of Analysis**: ${new Date().toISOString().slice(0, 10)}

### Testing Methodology
1. Obtained complete journal entry population from client's ERP system
2. Applied ${testResult.testCriteria.length} risk-based filtering criteria
3. Performed Benford's Law analysis on transaction amounts
4. Identified statistical anomalies using Z-score analysis
5. Investigated high-risk entries meeting multiple criteria

### Selection Criteria and Results

| Criteria | Description | Entries Matched |
|----------|-------------|-----------------|
${testResult.testCriteria.map(c => `| ${c.criteriaId} | ${c.description} | ${c.entriesMatched} |`).join('\n')}

### Summary of Results
- **High-Risk Entries Identified**: ${testResult.highRiskEntries}
- **Anomalies Detected**: ${testResult.anomaliesDetected}
- **Benford's Law Outliers**: ${testResult.benfordOutliers}
- **Audit Findings Generated**: ${testResult.findings.length}

### Findings Requiring Follow-Up

${testResult.findings.length > 0
                ? testResult.findings.map(f => `- **${f.findingId}**: ${f.description} (${f.severity})`).join('\n')
                : 'No significant findings requiring additional procedures.'
            }

### Conclusion
${testResult.findings.filter(f => f.severity === 'significant').length > 0
                ? 'Significant findings identified. Extended procedures required for items noted above.'
                : 'Testing did not identify indicators of fraud requiring additional procedures beyond those planned.'
            }

### CAS References
- CAS 240 - The Auditor's Responsibilities Relating to Fraud (.32(a))
- CAS 330 - Responses to Assessed Risks
- CAS 230 - Audit Documentation
        `.trim();

        return {
            workpaperId: testResult.workpaperRef,
            engagementId: context.engagementId,
            reference: testResult.workpaperRef,
            title: 'Journal Entry Testing - CAS 240.32(a)',
            preparedBy: context.userId,
            preparedDate: new Date(),
            casReference: 'CAS_240',
            content,
            conclusion: testResult.findings.filter(f => f.severity === 'significant').length > 0
                ? 'Exceptions noted - extended procedures required'
                : 'No exceptions noted',
            crossReferences: ['WP-RA', 'WP-FR'], // Risk assessment, fraud risk
            attachments: [],
        };
    }

    // =========================================================================
    // CAPABILITIES
    // =========================================================================

    getCapabilities(): string[] {
        return [
            '100% journal entry population analysis',
            '12 risk-based filtering criteria',
            'Statistical outlier detection (Z-score)',
            'Benford\'s Law first-digit analysis',
            'Duplicate entry detection',
            'CPAB-compliant workpaper generation',
            'Automated finding generation',
            'CAS 240.32(a) compliance',
        ];
    }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let instance: JournalEntryTestingAgent | null = null;

export const journalEntryTestingAgentFactory = {
    create: (config?: Partial<JournalEntryTestingAgentConfig>) =>
        new JournalEntryTestingAgent(config),
    instance: () => {
        if (!instance) {
            instance = new JournalEntryTestingAgent();
        }
        return instance;
    },
};

export const createJournalEntryTestingAgent = journalEntryTestingAgentFactory.create;
export const journalEntryTestingAgent = journalEntryTestingAgentFactory;
