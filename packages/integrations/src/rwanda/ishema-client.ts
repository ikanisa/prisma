/**
 * RRA ISHEMA API Client
 * 
 * Integration with Rwanda Revenue Authority's ISHEMA platform.
 * 
 * Features:
 * - VAT return submission
 * - CIT return submission
 * - PAYE filing
 * - Tax clearance certificates
 * - EBM invoice validation
 * 
 * Reference: RRA ISHEMA API Documentation
 * Endpoint: https://ishema.rra.gov.rw/api
 * 
 * @package @prisma/integrations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ISHEMAConfig {
    baseUrl?: string;
    clientId: string;
    clientSecret: string;
    tin: string;
    timeout?: number;
    sandbox?: boolean;
}

interface ISHEMAAccessToken {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    expiresAt: Date;
    refreshToken?: string;
}

export interface ISHEMAResponse<T = unknown> {
    success: boolean;
    data?: T;
    referenceNumber?: string;
    submissionDate?: Date;
    dueDate?: Date;
    amount?: number;
    status?: string;
    errorMessage?: string;
    requiresManualIntervention?: boolean;
}

export interface VATReturnSubmission {
    periodStart: Date;
    periodEnd: Date;
    periodType: 'MONTHLY' | 'QUARTERLY';
    standardRatedSupplies: number;
    outputVAT: number;
    zeroRatedSupplies: number;
    exemptSupplies: number;
    totalSupplies: number;
    inputVAT: number;
    netVAT: number;
    amountDue: number;
    paymentType: 'PAYABLE' | 'REFUNDABLE';
    ebmInvoiceCount: number;
}

export interface CITReturnSubmission {
    financialYearEnd: Date;
    accountingProfit: number;
    addBacks: number;
    deductions: number;
    taxableIncome: number;
    citRate: number;
    citPayable: number;
    provisionalPayments: number;
    balancePayable: number;
}

export interface PAYESubmission {
    month: number;
    year: number;
    totalGrossSalaries: number;
    totalRSSBEmployee: number;
    totalRSSBEmployer: number;
    totalPAYE: number;
    employeeCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ISHEMA_ENDPOINTS = {
    AUTH: '/oauth/token',
    VAT_RETURN: '/vat/returns',
    CIT_RETURN: '/cit/returns',
    PAYE_RETURN: '/paye/returns',
    RSSB_RETURN: '/rssb/contributions',
    TAX_STATUS: '/taxpayer/status',
    TAX_CLEARANCE: '/certificates/clearance',
    EBM_VALIDATE: '/ebm/validate',
    EBM_SYNC: '/ebm/sync',
} as const;

export const ISHEMA_ERROR_CODES = {
    INVALID_TIN: 'E001',
    DUPLICATE_SUBMISSION: 'E002',
    INVALID_PERIOD: 'E003',
    MISSING_REQUIRED_FIELD: 'E004',
    CALCULATION_ERROR: 'E005',
    AUTHENTICATION_FAILED: 'E006',
    RATE_LIMITED: 'E007',
    SYSTEM_ERROR: 'E500',
} as const;

// ============================================================================
// ISHEMA CLIENT
// ============================================================================

export class ISHEMAClient {
    private config: ISHEMAConfig;
    private accessToken: ISHEMAAccessToken | null = null;
    private retryCount = 3;
    private retryDelayMs = 1000;

    constructor(config: ISHEMAConfig) {
        this.config = {
            timeout: 30000,
            sandbox: false,
            ...config,
            baseUrl: config.sandbox
                ? 'https://sandbox.ishema.rra.gov.rw/api'
                : config.baseUrl || 'https://ishema.rra.gov.rw/api',
        };
    }

    // =========================================================================
    // AUTHENTICATION
    // =========================================================================

    async authenticate(): Promise<ISHEMAAccessToken> {
        const response = await this.makeRequest<{
            access_token: string;
            token_type: string;
            expires_in: number;
            refresh_token?: string;
        }>('POST', ISHEMA_ENDPOINTS.AUTH, {
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
        });

        this.accessToken = {
            accessToken: response.access_token,
            tokenType: 'Bearer',
            expiresIn: response.expires_in,
            expiresAt: new Date(Date.now() + response.expires_in * 1000),
            refreshToken: response.refresh_token,
        };

        return this.accessToken;
    }

    private async ensureAuthenticated(): Promise<void> {
        if (!this.accessToken || new Date() >= this.accessToken.expiresAt) {
            await this.authenticate();
        }
    }

    // =========================================================================
    // VAT OPERATIONS
    // =========================================================================

    async submitVATReturn(vatReturn: VATReturnSubmission): Promise<ISHEMAResponse> {
        await this.ensureAuthenticated();

        try {
            const payload = {
                tin: this.config.tin,
                period_start: vatReturn.periodStart.toISOString().split('T')[0],
                period_end: vatReturn.periodEnd.toISOString().split('T')[0],
                period_type: vatReturn.periodType,
                standard_rated_supplies: vatReturn.standardRatedSupplies,
                output_vat: vatReturn.outputVAT,
                zero_rated_supplies: vatReturn.zeroRatedSupplies,
                exempt_supplies: vatReturn.exemptSupplies,
                total_supplies: vatReturn.totalSupplies,
                input_vat: vatReturn.inputVAT,
                net_vat: vatReturn.netVAT,
                amount_due: vatReturn.amountDue,
                payment_type: vatReturn.paymentType.toLowerCase(),
                ebm_invoice_count: vatReturn.ebmInvoiceCount,
            };

            const response = await this.makeAuthenticatedRequest<{
                reference_number: string;
                submission_date: string;
                payment_due_date: string;
                amount_payable: number;
            }>('POST', ISHEMA_ENDPOINTS.VAT_RETURN, payload);

            return {
                success: true,
                referenceNumber: response.reference_number,
                submissionDate: new Date(response.submission_date),
                dueDate: new Date(response.payment_due_date),
                amount: response.amount_payable,
                status: 'SUBMITTED',
            };
        } catch (error) {
            return this.handleError(error, 'VAT return submission');
        }
    }

    // =========================================================================
    // CIT OPERATIONS
    // =========================================================================

    async submitCITReturn(citReturn: CITReturnSubmission): Promise<ISHEMAResponse> {
        await this.ensureAuthenticated();

        try {
            const payload = {
                tin: this.config.tin,
                financial_year_end: citReturn.financialYearEnd.toISOString().split('T')[0],
                accounting_profit: citReturn.accountingProfit,
                add_backs: citReturn.addBacks,
                deductions: citReturn.deductions,
                taxable_income: citReturn.taxableIncome,
                cit_rate: citReturn.citRate,
                cit_payable: citReturn.citPayable,
                provisional_payments: citReturn.provisionalPayments,
                balance_payable: citReturn.balancePayable,
            };

            const response = await this.makeAuthenticatedRequest<{
                reference_number: string;
                submission_date: string;
                payment_due_date: string;
                amount_payable: number;
            }>('POST', ISHEMA_ENDPOINTS.CIT_RETURN, payload);

            return {
                success: true,
                referenceNumber: response.reference_number,
                submissionDate: new Date(response.submission_date),
                dueDate: new Date(response.payment_due_date),
                amount: response.amount_payable,
                status: 'SUBMITTED',
            };
        } catch (error) {
            return this.handleError(error, 'CIT return submission');
        }
    }

    // =========================================================================
    // PAYE OPERATIONS
    // =========================================================================

    async submitPAYEReturn(paye: PAYESubmission): Promise<ISHEMAResponse> {
        await this.ensureAuthenticated();

        try {
            const payload = {
                tin: this.config.tin,
                month: paye.month,
                year: paye.year,
                total_gross_salaries: paye.totalGrossSalaries,
                total_rssb_employee: paye.totalRSSBEmployee,
                total_rssb_employer: paye.totalRSSBEmployer,
                total_paye: paye.totalPAYE,
                employee_count: paye.employeeCount,
            };

            const response = await this.makeAuthenticatedRequest<{
                reference_number: string;
                submission_date: string;
                payment_due_date: string;
            }>('POST', ISHEMA_ENDPOINTS.PAYE_RETURN, payload);

            return {
                success: true,
                referenceNumber: response.reference_number,
                submissionDate: new Date(response.submission_date),
                dueDate: new Date(response.payment_due_date),
                status: 'SUBMITTED',
            };
        } catch (error) {
            return this.handleError(error, 'PAYE submission');
        }
    }

    // =========================================================================
    // TAX STATUS & CERTIFICATES
    // =========================================================================

    async checkTaxStatus(tin?: string): Promise<{
        tin: string;
        registeredName: string;
        vatRegistered: boolean;
        status: 'ACTIVE' | 'SUSPENDED' | 'DEREGISTERED';
        outstandingAmount: number;
        lastFilingDate?: Date;
    }> {
        await this.ensureAuthenticated();

        const targetTin = tin || this.config.tin;
        const response = await this.makeAuthenticatedRequest<{
            tin: string;
            registered_name: string;
            vat_registered: boolean;
            status: string;
            outstanding_amount: number;
            last_filing_date?: string;
        }>('GET', `${ISHEMA_ENDPOINTS.TAX_STATUS}/${targetTin}`);

        return {
            tin: response.tin,
            registeredName: response.registered_name,
            vatRegistered: response.vat_registered,
            status: response.status as 'ACTIVE' | 'SUSPENDED' | 'DEREGISTERED',
            outstandingAmount: response.outstanding_amount,
            lastFilingDate: response.last_filing_date
                ? new Date(response.last_filing_date)
                : undefined,
        };
    }

    async downloadTaxClearance(): Promise<{
        certificateNumber: string;
        issueDate: Date;
        expiryDate: Date;
        pdfUrl: string;
    }> {
        await this.ensureAuthenticated();

        const response = await this.makeAuthenticatedRequest<{
            certificate_number: string;
            issue_date: string;
            expiry_date: string;
            pdf_url: string;
        }>('POST', ISHEMA_ENDPOINTS.TAX_CLEARANCE, {
            tin: this.config.tin,
        });

        return {
            certificateNumber: response.certificate_number,
            issueDate: new Date(response.issue_date),
            expiryDate: new Date(response.expiry_date),
            pdfUrl: response.pdf_url,
        };
    }

    // =========================================================================
    // EBM OPERATIONS
    // =========================================================================

    async validateEBMInvoice(invoiceNumber: string): Promise<{
        valid: boolean;
        invoiceNumber: string;
        issueDate?: Date;
        amount?: number;
        tin?: string;
        error?: string;
    }> {
        await this.ensureAuthenticated();

        try {
            const response = await this.makeAuthenticatedRequest<{
                valid: boolean;
                invoice_number: string;
                issue_date: string;
                amount: number;
                tin: string;
            }>('GET', `${ISHEMA_ENDPOINTS.EBM_VALIDATE}/${invoiceNumber}`);

            return {
                valid: response.valid,
                invoiceNumber: response.invoice_number,
                issueDate: new Date(response.issue_date),
                amount: response.amount,
                tin: response.tin,
            };
        } catch (error) {
            return {
                valid: false,
                invoiceNumber,
                error: error instanceof Error ? error.message : 'Validation failed',
            };
        }
    }

    async syncEBMInvoices(periodStart: Date, periodEnd: Date): Promise<{
        synced: number;
        failed: number;
        invoices: Array<{
            invoiceNumber: string;
            amount: number;
            vatAmount: number;
            issueDate: Date;
        }>;
    }> {
        await this.ensureAuthenticated();

        const response = await this.makeAuthenticatedRequest<{
            synced: number;
            failed: number;
            invoices: Array<{
                invoice_number: string;
                amount: number;
                vat_amount: number;
                issue_date: string;
            }>;
        }>('POST', ISHEMA_ENDPOINTS.EBM_SYNC, {
            tin: this.config.tin,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
        });

        return {
            synced: response.synced,
            failed: response.failed,
            invoices: response.invoices.map(inv => ({
                invoiceNumber: inv.invoice_number,
                amount: inv.amount,
                vatAmount: inv.vat_amount,
                issueDate: new Date(inv.issue_date),
            })),
        };
    }

    // =========================================================================
    // HTTP HELPERS
    // =========================================================================

    private async makeAuthenticatedRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        return this.makeRequest<T>(method, endpoint, body, {
            Authorization: `Bearer ${this.accessToken.accessToken}`,
        });
    }

    private async makeRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        body?: Record<string, unknown>,
        additionalHeaders?: Record<string, string>
    ): Promise<T> {
        const url = `${this.config.baseUrl}${endpoint}`;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...additionalHeaders,
                    },
                    body: body ? JSON.stringify(body) : undefined,
                    signal: AbortSignal.timeout(this.config.timeout || 30000),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({})) as { message?: string; code?: string };
                    throw new ISHEMAAPIError(
                        errorData.message || `HTTP ${response.status}`,
                        errorData.code || 'UNKNOWN',
                        response.status
                    );
                }

                return await response.json() as T;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (error instanceof ISHEMAAPIError && error.statusCode < 500) {
                    throw error;
                }

                if (attempt < this.retryCount) {
                    await this.sleep(this.retryDelayMs * Math.pow(2, attempt - 1));
                }
            }
        }

        throw lastError || new Error('Request failed after retries');
    }

    private handleError(error: unknown, operation: string): ISHEMAResponse {
        if (error instanceof ISHEMAAPIError) {
            return {
                success: false,
                status: 'ERROR',
                errorMessage: `${operation} failed: ${error.message} (${error.code})`,
                requiresManualIntervention: error.statusCode >= 400 && error.statusCode < 500,
            };
        }

        return {
            success: false,
            status: 'ERROR',
            errorMessage: `${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            requiresManualIntervention: true,
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class ISHEMAAPIError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number
    ) {
        super(message);
        this.name = 'ISHEMAAPIError';
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createISHEMAClient(config: ISHEMAConfig): ISHEMAClient {
    return new ISHEMAClient(config);
}

export function createISHEMASandboxClient(config: Omit<ISHEMAConfig, 'sandbox'>): ISHEMAClient {
    return new ISHEMAClient({ ...config, sandbox: true });
}

let _ishemaClient: ISHEMAClient | null = null;

export const ishemaClient = {
    instance(config: ISHEMAConfig): ISHEMAClient {
        if (!_ishemaClient) {
            _ishemaClient = new ISHEMAClient(config);
        }
        return _ishemaClient;
    },
};
