/**
 * Rwanda RSSB (Social Security) Agent
 * 
 * Calculates and manages RSSB contributions for employees.
 * Based on RSSB Law 2026 rates transitioning to 20% by 2030.
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentType,
    AutonomyLevel,
    AgentContext,
    AgentResponse,
} from '../../core/base-agent.js';
import { determineReviewRequirement } from '../../core/base-agent.js';
import type {
    RwandaAccountingFramework,
    RSSBContribution,
    RSSBPeriodSummary,
    RSSBRates,
    RwandaPAYECalculation,
} from '../../types/index.js';
import { RSSB_RATES_2026, PAYE_BRACKETS_2026 } from '../../types/index.js';

// ============================================================================
// EMPLOYEE INPUT
// ============================================================================

/**
 * Employee payroll input.
 */
export interface EmployeePayrollInput {
    employeeId: string;
    employeeName: string;
    grossSalary: number;       // Monthly gross salary in RWF
    allowances?: number;        // Taxable allowances
    deductions?: number;        // Pre-tax deductions
    isResident?: boolean;       // Tax residency
}

/**
 * Payroll period input.
 */
export interface PayrollPeriodInput {
    period: Date;              // Month of payroll
    employees: EmployeePayrollInput[];
}

// ============================================================================
// RSSB AGENT
// ============================================================================

/**
 * Rwanda RSSB Contribution Agent.
 * 
 * Calculates pension, occupational hazard, and maternity contributions.
 */
export class RSSBAgent implements RwandaAccountingAgent {
    private static instance_: RSSBAgent | null = null;

    readonly agentId = 'rwanda-rssb-agent';
    readonly name = 'Rwanda RSSB Contribution Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'COMPLIANCE_MONITORING';
    readonly capabilities = [
        'Calculate RSSB pension contributions (12% in 2026)',
        'Calculate occupational hazard contributions (2%)',
        'Calculate maternity benefit contributions (0.3%)',
        'Calculate PAYE tax withholding',
        'Generate RSSB submission reports',
        'Track due dates (15th of following month)',
        'Handle rate transitions (12% → 20% by 2030)',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 4;
    readonly supportedCurrencies = ['RWF'];

    private rates: RSSBRates;

    private constructor() {
        this.rates = RSSB_RATES_2026;
    }

    /**
     * Get singleton instance.
     */
    static instance(): RSSBAgent {
        if (!RSSBAgent.instance_) {
            RSSBAgent.instance_ = new RSSBAgent();
        }
        return RSSBAgent.instance_;
    }

    /**
     * Get current RSSB rates.
     */
    getRates(): RSSBRates {
        return { ...this.rates };
    }

    /**
     * Calculate RSSB contributions for a single employee.
     */
    calculateContribution(employee: EmployeePayrollInput): RSSBContribution {
        const grossSalary = employee.grossSalary + (employee.allowances || 0);

        // Calculate contributions
        const pensionEmployer = this.roundRWF(grossSalary * (this.rates.pensionEmployer / 100));
        const pensionEmployee = this.roundRWF(grossSalary * (this.rates.pensionEmployee / 100));
        const occupationalHazard = this.roundRWF(grossSalary * (this.rates.occupationalHazard / 100));
        const maternityBenefit = this.roundRWF(grossSalary * (this.rates.maternityBenefit / 100));

        const totalEmployer = pensionEmployer + occupationalHazard + maternityBenefit;
        const totalEmployee = pensionEmployee;

        // Calculate PAYE to determine net salary
        const paye = this.calculatePAYE(grossSalary);
        const netSalary = grossSalary - pensionEmployee - paye.payeTax - (employee.deductions || 0);

        return {
            employeeId: employee.employeeId,
            employeeName: employee.employeeName,
            grossSalary,
            pensionEmployer,
            pensionEmployee,
            occupationalHazard,
            maternityBenefit,
            totalEmployer,
            totalEmployee,
            netSalary: this.roundRWF(netSalary),
        };
    }

    /**
     * Calculate PAYE tax for an employee.
     */
    calculatePAYE(monthlyGross: number): RwandaPAYECalculation {
        const annualGross = monthlyGross * 12;
        let annualTax = 0;
        let bracket: typeof PAYE_BRACKETS_2026[number] = PAYE_BRACKETS_2026[0];

        for (const b of PAYE_BRACKETS_2026) {
            if (annualGross >= b.annualMin) {
                bracket = b;
            }
        }


        // Calculate tax based on bracket
        if (bracket.rate === 0) {
            annualTax = 0;
        } else if (bracket.rate === 20) {
            // 20% bracket: 360,001 - 1,200,000
            annualTax = (annualGross - 360000) * 0.20;
        } else if (bracket.rate === 30) {
            // 30% bracket: 1,200,001+
            // First 360,000: 0%
            // Next 840,000: 20% = 168,000
            // Above 1,200,000: 30%
            annualTax = 168000 + (annualGross - 1200000) * 0.30;
        }

        const monthlyTax = this.roundRWF(annualTax / 12);
        const effectiveRate = monthlyGross > 0 ? (monthlyTax / monthlyGross) * 100 : 0;

        return {
            grossSalary: monthlyGross,
            taxableIncome: monthlyGross,
            payeTax: monthlyTax,
            effectiveRate,
            bracket: {
                min: bracket.min,
                max: bracket.max,
                rate: bracket.rate,
            },
        };
    }

    /**
     * Calculate RSSB contributions for entire payroll period.
     */
    async calculatePeriodContributions(
        input: PayrollPeriodInput,
        context: AgentContext
    ): Promise<AgentResponse<RSSBPeriodSummary>> {
        const startTime = Date.now();

        try {
            const contributions = input.employees.map(emp =>
                this.calculateContribution(emp)
            );

            const summary: RSSBPeriodSummary = {
                period: input.period,
                employeeCount: contributions.length,
                totalGrossSalary: this.sum(contributions.map(c => c.grossSalary)),
                totalPensionEmployer: this.sum(contributions.map(c => c.pensionEmployer)),
                totalPensionEmployee: this.sum(contributions.map(c => c.pensionEmployee)),
                totalOccupationalHazard: this.sum(contributions.map(c => c.occupationalHazard)),
                totalMaternityBenefit: this.sum(contributions.map(c => c.maternityBenefit)),
                grandTotalPayable: this.sum(contributions.map(c => c.totalEmployer + c.totalEmployee)),
                dueDate: this.calculateDueDate(input.period),
                paymentStatus: 'PENDING',
            };

            // Determine review requirement
            const reviewGate = determineReviewRequirement(
                0.98,  // High confidence for deterministic calculation
                summary.grandTotalPayable,
                { confidenceMin: 0.90, amountMax: 50_000_000 }  // RWF 50M threshold
            );

            return {
                success: true,
                data: summary,
                confidenceScore: 0.98,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                rraCompliant: true,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'RSSB calculation failed',
                requiresReview: true,
                reviewReason: 'Calculation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Calculate RSSB due date (15th of following month).
     */
    calculateDueDate(period: Date): Date {
        const dueDate = new Date(period);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(15);
        return dueDate;
    }

    /**
     * Check if payment is overdue.
     */
    isOverdue(period: Date): boolean {
        const dueDate = this.calculateDueDate(period);
        return new Date() > dueDate;
    }

    /**
     * Get projected rates for future years (12% → 20% by 2030).
     */
    getProjectedRates(year: number): RSSBRates {
        // Pension rate increases gradually from 12% to 20%
        const baseYear = 2026;
        const targetYear = 2030;
        const baseRate = 12;
        const targetRate = 20;

        if (year <= baseYear) {
            return this.rates;
        }

        if (year >= targetYear) {
            const rate = targetRate / 2;
            return {
                pensionEmployer: rate,
                pensionEmployee: rate,
                occupationalHazard: 2,
                maternityBenefit: 0.3,
                totalEmployer: rate + 2 + 0.3,
                totalEmployee: rate,
            };
        }

        // Linear interpolation
        const progress = (year - baseYear) / (targetYear - baseYear);
        const currentRate = baseRate + (targetRate - baseRate) * progress;
        const rate = currentRate / 2;

        return {
            pensionEmployer: rate,
            pensionEmployee: rate,
            occupationalHazard: 2,
            maternityBenefit: 0.3,
            totalEmployer: rate + 2 + 0.3,
            totalEmployee: rate,
        };
    }

    /**
     * Generate journal entries for RSSB accrual.
     */
    generateJournalEntries(summary: RSSBPeriodSummary): {
        date: Date;
        entries: Array<{ account: string; debit?: number; credit?: number; description: string }>;
    } {
        const entries = [
            // Expense entries
            {
                account: '5210 - Salaries and Wages',
                debit: summary.totalGrossSalary,
                description: 'Gross payroll accrual',
            },
            {
                account: '5220 - RSSB Pension - Employer Contribution',
                debit: summary.totalPensionEmployer,
                description: 'Employer pension contribution 6%',
            },
            {
                account: '5221 - RSSB Occupational Hazards',
                debit: summary.totalOccupationalHazard,
                description: 'Occupational hazards 2%',
            },
            {
                account: '5222 - RSSB Maternity Benefit',
                debit: summary.totalMaternityBenefit,
                description: 'Maternity benefit 0.3%',
            },
            // Liability entries
            {
                account: '2141 - RSSB Pension - Employer',
                credit: summary.totalPensionEmployer,
                description: 'RSSB pension payable (employer)',
            },
            {
                account: '2142 - RSSB Pension - Employee',
                credit: summary.totalPensionEmployee,
                description: 'RSSB pension payable (employee)',
            },
            {
                account: '2143 - RSSB Occupational Hazards',
                credit: summary.totalOccupationalHazard,
                description: 'RSSB occupational hazards payable',
            },
            {
                account: '2144 - RSSB Maternity Benefit',
                credit: summary.totalMaternityBenefit,
                description: 'RSSB maternity benefit payable',
            },
            {
                account: '2121 - Accrued Salaries',
                credit: summary.totalGrossSalary - summary.totalPensionEmployee,
                description: 'Net salaries payable',
            },
        ];

        return {
            date: summary.period,
            entries,
        };
    }

    /**
     * Round to RWF (no decimals).
     */
    private roundRWF(amount: number): number {
        return Math.round(amount);
    }

    /**
     * Sum array of numbers.
     */
    private sum(values: number[]): number {
        return values.reduce((a, b) => a + b, 0);
    }
}

/**
 * Factory function.
 */
export function createRSSBAgent(): RSSBAgent {
    return RSSBAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const rssbAgent = {
    instance: () => RSSBAgent.instance(),
};
