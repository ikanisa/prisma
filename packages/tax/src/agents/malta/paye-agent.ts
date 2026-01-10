/**
 * Malta PAYE & Social Security Agent
 * 
 * Real-time PAYE and social security reporting via BAM II
 * 
 * Legal Basis: Income Tax Management Act (Cap. 372), Social Security Act (Cap. 318)
 * 
 * Features:
 * - Real-time payroll reporting (BAM II)
 * - NI contribution calculations (10% employee, 10% employer)
 * - FS3 annual reconciliation
 * - Progressive tax bracket calculations
 * - Married/parent allowances (2026 updates)
 */

// BAM2 Client types (type-only imports to avoid rootDir issues)
type BAM2Client = any;
type PayrollSubmission = {
  entityId: string;
  vatNumber: string;
  payPeriod: { start: Date; end: Date };
  employees: Array<{
    employeeId: string;
    idCardNumber: string;
    grossPay: number;
    incomeTax: number;
    socialSecurity: number;
    netPay: number;
    paymentDate: Date;
  }>;
};
type SubmissionResult = {
  success: boolean;
  reference: string;
  submissionDate: Date;
  status: 'submitted' | 'accepted' | 'rejected' | 'processing';
  errors?: string[];
  warnings?: string[];
};

// ============================================================================
// TYPES
// ============================================================================

export enum PayPeriod {
  WEEKLY = 'weekly',
  FORTNIGHTLY = 'fortnightly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual'
}

export interface Employee {
  id: string;
  idCardNumber: string;
  fullName: string;
  maritalStatus: 'single' | 'married';
  numberOfChildren: number;
  hasDisability: boolean;
}

export interface PayeCalculation {
  employeeId: string;
  payPeriod: PayPeriod;
  grossSalary: number;
  taxableIncome: number;
  incomeTax: number;
  socialSecurity: number;
  netPay: number;
  employerNI: number;
  totalCost: number;  // Gross + Employer NI
  annualizedSalary: number;
}

export interface FS3Reconciliation {
  entityId: string;
  fiscalYear: number;
  totalGrossPay: number;
  totalIncomeTax: number;
  totalEmployeeNI: number;
  totalEmployerNI: number;
  totalNetPay: number;
  totalCost: number;
  employeeCount: number;
  reconciliationDate: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Malta Tax Brackets (2026)
const TAX_BRACKETS = [
  { min: 0, max: 9100, rate: 0 },           // 0%
  { min: 9101, max: 14500, rate: 0.15 },    // 15%
  { min: 14501, max: 19500, rate: 0.25 },   // 25%
  { min: 19501, max: Infinity, rate: 0.35 } // 35%
];

// Allowances (2026 - Enhanced)
const ALLOWANCES = {
  SINGLE: 9100,
  MARRIED: 12300,           // Enhanced 2026
  PARENT: 12300,            // Enhanced 2026 (per child)
  DISABILITY: 2100
};

// Social Security Rates
const SOCIAL_SECURITY_RATE_EMPLOYEE = 0.10;  // 10%
const SOCIAL_SECURITY_RATE_EMPLOYER = 0.10;  // 10%

// Pay Period Multipliers
const PAY_PERIOD_MULTIPLIERS: Record<PayPeriod, number> = {
  [PayPeriod.WEEKLY]: 52,
  [PayPeriod.FORTNIGHTLY]: 26,
  [PayPeriod.MONTHLY]: 12,
  [PayPeriod.QUARTERLY]: 4,
  [PayPeriod.ANNUAL]: 1
};

// ============================================================================
// PAYE CALCULATOR
// ============================================================================

export class PayeCalculator {
  /**
   * Calculate PAYE tax for an employee
   */
  calculatePAYE(
    employee: Employee,
    grossSalary: number,
    payPeriod: PayPeriod
  ): PayeCalculation {
    // Annualize salary for bracket calculation
    const annualSalary = grossSalary * PAY_PERIOD_MULTIPLIERS[payPeriod];

    // Apply allowances
    let taxableIncome = annualSalary;

    if (employee.maritalStatus === 'married') {
      taxableIncome -= ALLOWANCES.MARRIED;
    } else {
      taxableIncome -= ALLOWANCES.SINGLE;
    }

    if (employee.numberOfChildren > 0) {
      taxableIncome -= ALLOWANCES.PARENT * employee.numberOfChildren;
    }

    if (employee.hasDisability) {
      taxableIncome -= ALLOWANCES.DISABILITY;
    }

    // Ensure taxable income is not negative
    taxableIncome = Math.max(0, taxableIncome);

    // Calculate progressive tax
    let annualIncomeTax = 0;
    for (const bracket of TAX_BRACKETS) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
        annualIncomeTax += taxableInBracket * bracket.rate;
      }
    }

    // Convert back to pay period
    const payPeriodTax = annualIncomeTax / PAY_PERIOD_MULTIPLIERS[payPeriod];

    // Social Security (10% on all income, no cap)
    const socialSecurity = this.roundCurrency(grossSalary * SOCIAL_SECURITY_RATE_EMPLOYEE);
    const employerNI = this.roundCurrency(grossSalary * SOCIAL_SECURITY_RATE_EMPLOYER);

    // Net pay
    const netPay = this.roundCurrency(grossSalary - payPeriodTax - socialSecurity);
    const totalCost = this.roundCurrency(grossSalary + employerNI);

    // Pay period taxable income (for reporting)
    const payPeriodTaxableIncome = taxableIncome / PAY_PERIOD_MULTIPLIERS[payPeriod];

    return {
      employeeId: employee.id,
      payPeriod,
      grossSalary: this.roundCurrency(grossSalary),
      taxableIncome: this.roundCurrency(payPeriodTaxableIncome),
      incomeTax: this.roundCurrency(payPeriodTax),
      socialSecurity: this.roundCurrency(socialSecurity),
      netPay: this.roundCurrency(netPay),
      employerNI: this.roundCurrency(employerNI),
      totalCost: this.roundCurrency(totalCost),
      annualizedSalary: this.roundCurrency(annualSalary)
    };
  }

  /**
   * Calculate annual FS3 reconciliation totals
   */
  calculateFS3Reconciliation(
    entityId: string,
    fiscalYear: number,
    payrollRecords: PayeCalculation[]
  ): FS3Reconciliation {
    const totals = payrollRecords.reduce(
      (acc, record) => ({
        totalGrossPay: acc.totalGrossPay + record.grossSalary,
        totalIncomeTax: acc.totalIncomeTax + record.incomeTax,
        totalEmployeeNI: acc.totalEmployeeNI + record.socialSecurity,
        totalEmployerNI: acc.totalEmployerNI + record.employerNI,
        totalNetPay: acc.totalNetPay + record.netPay,
        totalCost: acc.totalCost + record.totalCost
      }),
      {
        totalGrossPay: 0,
        totalIncomeTax: 0,
        totalEmployeeNI: 0,
        totalEmployerNI: 0,
        totalNetPay: 0,
        totalCost: 0
      }
    );

    // Count unique employees
    const uniqueEmployees = new Set(payrollRecords.map(r => r.employeeId));

    return {
      entityId,
      fiscalYear,
      totalGrossPay: this.roundCurrency(totals.totalGrossPay),
      totalIncomeTax: this.roundCurrency(totals.totalIncomeTax),
      totalEmployeeNI: this.roundCurrency(totals.totalEmployeeNI),
      totalEmployerNI: this.roundCurrency(totals.totalEmployerNI),
      totalNetPay: this.roundCurrency(totals.totalNetPay),
      totalCost: this.roundCurrency(totals.totalCost),
      employeeCount: uniqueEmployees.size,
      reconciliationDate: new Date()
    };
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// PAYE AGENT
// ============================================================================

export class PAYEAgent {
  private bam2Client: BAM2Client | null = null;
  private calculator: PayeCalculator;

  constructor(bam2Client?: BAM2Client) {
    // Optional BAM2 client - can be injected or created externally
    this.bam2Client = bam2Client || null;
    this.calculator = new PayeCalculator();
  }

  /**
   * Set BAM2 client (for dependency injection)
   */
  setBAM2Client(client: BAM2Client): void {
    this.bam2Client = client;
  }

  /**
   * Process payroll and submit to BAM II in real-time
   */
  async processPayroll(
    employees: Array<Employee & { grossSalary: number; payPeriod: PayPeriod }>,
    entityId: string,
    vatNumber: string,
    payPeriodStart: Date,
    payPeriodEnd: Date
  ): Promise<{
    calculations: PayeCalculation[];
    submissionResult?: SubmissionResult;
  }> {
    // Calculate PAYE for each employee
    const calculations = employees.map(emp =>
      this.calculator.calculatePAYE(emp, emp.grossSalary, emp.payPeriod)
    );

    // Prepare BAM II submission
    const payrollSubmission: PayrollSubmission = {
      entityId,
      vatNumber,
      payPeriod: {
        start: payPeriodStart,
        end: payPeriodEnd
      },
      employees: calculations.map(calc => {
        const employee = employees.find(e => e.id === calc.employeeId)!;
        return {
          employeeId: calc.employeeId,
          idCardNumber: employee.idCardNumber,
          grossPay: calc.grossSalary,
          incomeTax: calc.incomeTax,
          socialSecurity: calc.socialSecurity,
          netPay: calc.netPay,
          paymentDate: payPeriodEnd
        };
      })
    };

    // Submit to BAM II (optional - requires BAM2 client)
    let submissionResult: SubmissionResult | undefined;
    if (this.bam2Client) {
      try {
        submissionResult = await this.bam2Client.submitPayroll(payrollSubmission);
      } catch (error) {
        // Log error but don't fail - submission can be retried
        console.error('BAM II payroll submission failed:', error);
      }
    }

    return {
      calculations,
      submissionResult
    };
  }

  /**
   * Generate FS3 annual reconciliation
   */
  generateFS3Reconciliation(
    entityId: string,
    fiscalYear: number,
    payrollRecords: PayeCalculation[]
  ): FS3Reconciliation {
    return this.calculator.calculateFS3Reconciliation(entityId, fiscalYear, payrollRecords);
  }

  /**
   * Get FS3 filing deadline
   */
  getFS3Deadline(fiscalYear: number): {
    paperDeadline: Date;  // 30 June
    electronicDeadline: Date;  // 31 July
  } {
    const paperDeadline = new Date(fiscalYear, 5, 30);  // June 30
    const electronicDeadline = new Date(fiscalYear, 6, 31);  // July 31

    return {
      paperDeadline,
      electronicDeadline
    };
  }

  /**
   * Check if FS3 filing is overdue
   */
  checkFS3Deadline(fiscalYear: number, isElectronic: boolean = true): {
    isOverdue: boolean;
    daysRemaining: number;
    deadline: Date;
  } {
    const deadlines = this.getFS3Deadline(fiscalYear);
    const deadline = isElectronic ? deadlines.electronicDeadline : deadlines.paperDeadline;

    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isOverdue: daysRemaining < 0,
      daysRemaining,
      deadline
    };
  }
}

export default PAYEAgent;
