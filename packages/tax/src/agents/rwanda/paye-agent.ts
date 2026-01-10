/**
 * Rwanda PAYE Agent
 * 
 * Pay As You Earn calculation and monthly payroll tax filing.
 * 
 * Legal Basis:
 * - Income Tax Law (Employment Income)
 * - Tax Procedure Law 016/2018
 * - RRA PAYE regulations
 * 
 * Features:
 * - Progressive PAYE rates (0%, 20%, 30%)
 * - Monthly calculation
 * - RSSB integration
 * - Monthly ISHEMA declaration
 * 
 * @package @prisma/tax
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PAYECalculation {
    grossSalary: number;
    otherBenefits: number;
    totalTaxableIncome: number;
    rssbEmployeeContribution: number;
    taxableIncomeAfterRSSB: number;
    payeBrackets: PAYEBracket[];
    totalPAYE: number;
    effectiveRate: number;
    netSalary: number;
    currency: 'RWF';
}

export interface PAYEBracket {
    from: number;
    to: number;
    rate: number;
    taxableAmount: number;
    tax: number;
}

export interface EmployeePayroll {
    employeeId: string;
    employeeName: string;
    tin: string;
    grossSalary: number;
    allowances: number;
    benefits: number;
    deductions: number;
    rssbEmployee: number;
    rssbEmployer: number;
    payeTax: number;
    netPay: number;
}

export interface PayrollDeclaration {
    period: {
        month: number;
        year: number;
    };
    employerName: string;
    employerTin: string;
    employees: EmployeePayroll[];
    totalGrossSalaries: number;
    totalRSSBEmployee: number;
    totalRSSBEmployer: number;
    totalPAYE: number;
    totalNetPay: number;
    status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED';
    submissionDate?: Date;
    referenceNumber?: string;
}

export interface RwandaPAYEAgentConfig {
    openaiApiKey?: string;
    rraEndpoint?: string;
    rssbYear?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * PAYE brackets for 2024+ (annual thresholds converted to monthly).
 */
const PAYE_MONTHLY_BRACKETS = [
    { from: 0, to: 60_000, rate: 0 },           // 0% for first RWF 60,000
    { from: 60_000, to: 100_000, rate: 20 },    // 20% for RWF 60,001 - 100,000
    { from: 100_000, to: Infinity, rate: 30 },  // 30% above RWF 100,000
];

/**
 * RSSB contribution rates (2026).
 * Transitioning to 20% pension by 2030.
 */
const RSSB_RATES_2026 = {
    pension: {
        employee: 6,    // 6% employee contribution
        employer: 6,    // 6% employer contribution
        total: 12,
    },
    occupationalHazard: 2,  // 2% employer only
    maternity: 0.3,         // 0.3% employer only
};

// ============================================================================
// RWANDA PAYE AGENT
// ============================================================================

export class RwandaPAYEAgent {
    public readonly name = 'Rwanda PAYE Agent';
    public readonly version = '1.0.0';
    public readonly category = 'tax';
    public readonly jurisdiction = 'RW';

    private config: RwandaPAYEAgentConfig;
    private rssbRates: typeof RSSB_RATES_2026;

    constructor(config: RwandaPAYEAgentConfig = {}) {
        this.config = config;
        this.rssbRates = RSSB_RATES_2026;
    }

    getCapabilities(): string[] {
        return [
            'Progressive PAYE calculation (0%, 20%, 30%)',
            'Monthly payroll tax computation',
            'RSSB contribution calculation',
            'Payroll declaration preparation',
            'ISHEMA submission format',
            'Net salary calculation',
            'Year-end reconciliation',
        ];
    }

    /**
     * Calculate PAYE for an employee.
     */
    calculatePAYE(input: {
        grossSalary: number;
        otherBenefits?: number;
    }): PAYECalculation {
        const grossSalary = input.grossSalary;
        const otherBenefits = input.otherBenefits || 0;
        const totalTaxableIncome = grossSalary + otherBenefits;

        // Calculate RSSB employee contribution (before PAYE)
        const rssbEmployeeContribution = Math.round(
            totalTaxableIncome * (this.rssbRates.pension.employee / 100)
        );

        // Taxable income for PAYE is after RSSB
        const taxableIncomeAfterRSSB = totalTaxableIncome - rssbEmployeeContribution;

        // Calculate PAYE using progressive brackets
        const { brackets, totalPAYE } = this.applyPAYEBrackets(taxableIncomeAfterRSSB);

        // Effective rate
        const effectiveRate = totalTaxableIncome > 0
            ? (totalPAYE / totalTaxableIncome) * 100
            : 0;

        // Net salary
        const netSalary = totalTaxableIncome - rssbEmployeeContribution - totalPAYE;

        return {
            grossSalary,
            otherBenefits,
            totalTaxableIncome,
            rssbEmployeeContribution,
            taxableIncomeAfterRSSB,
            payeBrackets: brackets,
            totalPAYE,
            effectiveRate: Math.round(effectiveRate * 100) / 100,
            netSalary,
            currency: 'RWF',
        };
    }

    /**
     * Apply progressive PAYE brackets.
     */
    private applyPAYEBrackets(taxableIncome: number): {
        brackets: PAYEBracket[];
        totalPAYE: number;
    } {
        const brackets: PAYEBracket[] = [];
        let remainingIncome = taxableIncome;
        let totalPAYE = 0;

        for (const bracket of PAYE_MONTHLY_BRACKETS) {
            if (remainingIncome <= 0) break;

            const bracketWidth = bracket.to === Infinity
                ? remainingIncome
                : bracket.to - bracket.from;
            const taxableAmount = Math.min(remainingIncome, bracketWidth);
            const tax = Math.round(taxableAmount * (bracket.rate / 100));

            brackets.push({
                from: bracket.from,
                to: bracket.to,
                rate: bracket.rate,
                taxableAmount,
                tax,
            });

            totalPAYE += tax;
            remainingIncome -= taxableAmount;
        }

        return { brackets, totalPAYE };
    }

    /**
     * Calculate full payroll for an employee.
     */
    calculateEmployeePayroll(input: {
        employeeId: string;
        employeeName: string;
        tin: string;
        grossSalary: number;
        allowances?: number;
        benefits?: number;
        otherDeductions?: number;
    }): EmployeePayroll {
        const totalGross = input.grossSalary + (input.allowances || 0) + (input.benefits || 0);

        // PAYE calculation
        const payeCalc = this.calculatePAYE({
            grossSalary: input.grossSalary,
            otherBenefits: (input.allowances || 0) + (input.benefits || 0),
        });

        // RSSB calculations
        const rssbEmployee = payeCalc.rssbEmployeeContribution;
        const rssbEmployer = Math.round(
            totalGross * (
                this.rssbRates.pension.employer / 100 +
                this.rssbRates.occupationalHazard / 100 +
                this.rssbRates.maternity / 100
            )
        );

        // Net pay
        const netPay = totalGross - rssbEmployee - payeCalc.totalPAYE - (input.otherDeductions || 0);

        return {
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            tin: input.tin,
            grossSalary: input.grossSalary,
            allowances: input.allowances || 0,
            benefits: input.benefits || 0,
            deductions: input.otherDeductions || 0,
            rssbEmployee,
            rssbEmployer,
            payeTax: payeCalc.totalPAYE,
            netPay,
        };
    }

    /**
     * Prepare monthly payroll declaration.
     */
    preparePayrollDeclaration(input: {
        employerName: string;
        employerTin: string;
        month: number;
        year: number;
        employees: {
            employeeId: string;
            employeeName: string;
            tin: string;
            grossSalary: number;
            allowances?: number;
            benefits?: number;
            otherDeductions?: number;
        }[];
    }): PayrollDeclaration {
        const employees = input.employees.map(emp => this.calculateEmployeePayroll(emp));

        const totalGrossSalaries = employees.reduce((sum, e) => sum + e.grossSalary + e.allowances + e.benefits, 0);
        const totalRSSBEmployee = employees.reduce((sum, e) => sum + e.rssbEmployee, 0);
        const totalRSSBEmployer = employees.reduce((sum, e) => sum + e.rssbEmployer, 0);
        const totalPAYE = employees.reduce((sum, e) => sum + e.payeTax, 0);
        const totalNetPay = employees.reduce((sum, e) => sum + e.netPay, 0);

        return {
            period: {
                month: input.month,
                year: input.year,
            },
            employerName: input.employerName,
            employerTin: input.employerTin,
            employees,
            totalGrossSalaries,
            totalRSSBEmployee,
            totalRSSBEmployer,
            totalPAYE,
            totalNetPay,
            status: 'DRAFT',
        };
    }

    /**
     * Get RSSB contribution summary.
     */
    calculateRSSB(input: {
        grossSalary: number;
    }): {
        employeeContribution: number;
        employerContribution: number;
        totalContribution: number;
        breakdown: {
            pension: { employee: number; employer: number };
            occupationalHazard: number;
            maternity: number;
        };
    } {
        const pension = {
            employee: Math.round(input.grossSalary * (this.rssbRates.pension.employee / 100)),
            employer: Math.round(input.grossSalary * (this.rssbRates.pension.employer / 100)),
        };
        const occupationalHazard = Math.round(input.grossSalary * (this.rssbRates.occupationalHazard / 100));
        const maternity = Math.round(input.grossSalary * (this.rssbRates.maternity / 100));

        return {
            employeeContribution: pension.employee,
            employerContribution: pension.employer + occupationalHazard + maternity,
            totalContribution: pension.employee + pension.employer + occupationalHazard + maternity,
            breakdown: {
                pension,
                occupationalHazard,
                maternity,
            },
        };
    }

    /**
     * Get PAYE filing deadline.
     */
    getFilingDeadline(month: number, year: number): Date {
        const deadline = new Date(year, month, 15); // 15th of following month
        return deadline;
    }

    /**
     * Get RSSB filing deadline (same as PAYE).
     */
    getRSSBFilingDeadline(month: number, year: number): Date {
        return this.getFilingDeadline(month, year);
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaPAYEAgent(config?: RwandaPAYEAgentConfig): RwandaPAYEAgent {
    return new RwandaPAYEAgent(config);
}

let _payeAgent: RwandaPAYEAgent | null = null;

export const rwandaPAYEAgent = {
    instance(config?: RwandaPAYEAgentConfig): RwandaPAYEAgent {
        if (!_payeAgent) {
            _payeAgent = new RwandaPAYEAgent(config);
        }
        return _payeAgent;
    },
};
