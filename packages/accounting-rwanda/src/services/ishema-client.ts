/**
 * RRA ISHEMA API Client
 * 
 * Integration with Rwanda Revenue Authority's ISHEMA platform for:
 * - VAT return submission
 * - CIT return submission
 * - PAYE filing
 * - Tax clearance certificates
 * - EBM invoice validation
 * 
 * Reference: RRA ISHEMA API Documentation
 * Endpoint: https://ishema.rra.gov.rw/api (production)
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    VATReturn,
    CITReturn,
    ISHEMAResponse,
} from '../types/index.js';

// ============================================================================
// ISHEMA CONFIGURATION
// ============================================================================

/**
 * ISHEMA API configuration.
 */
export interface ISHEMAConfig {
    /** API base URL (production or sandbox) */
    baseUrl: string;
    /** Client ID from RRA registration */
    clientId: string;
    /** Client secret from RRA */
    clientSecret: string;
    /** Organization TIN */
    tin: string;
    /** Request timeout in ms */
    timeout?: number;
    /** Enable sandbox mode */
    sandbox?: boolean;
}

/**
 * ISHEMA authentication token.
 */
interface ISHEMAAccessToken {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    expiresAt: Date;
    refreshToken?: string;
}

/**
 * ISHEMA API endpoints.
 */
const ISHEMA_ENDPOINTS = {
    AUTH: '/oauth/token',
    VAT_RETURN: '/vat/returns',
    CIT_RETURN: '/cit/returns',
    PAYE_RETURN: '/paye/returns',
    TAX_STATUS: '/taxpayer/status',
    TAX_CLEARANCE: '/certificates/clearance',
    EBM_VALIDATE: '/ebm/validate',
    EBM_SYNC: '/ebm/sync',
} as const;

/**
 * ISHEMA error codes.
 */
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

/**
 * RRA ISHEMA API Client.
 * 
 * Handles all interactions with RRA's electronic tax filing system.
 */
export class ISHEMAClient {
    private config: ISHEMAConfig;
    private accessToken: ISHEMAAccessToken | null = null;
    private retryCount: number = 3;
    private retryDelayMs: number = 1000;

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

    /**
     * Authenticate with ISHEMA using OAuth 2.0.
     */
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

    /**
     * Ensure we have a valid access token.
     */
    private async ensureAuthenticated(): Promise<void> {
        if (!this.accessToken || new Date() >= this.accessToken.expiresAt) {
            await this.authenticate();
        }
    }

    // =========================================================================
    // VAT OPERATIONS
    // =========================================================================

    /**
     * Submit VAT return to RRA.
     */
    async submitVATReturn(vatReturn: VATReturn): Promise<ISHEMAResponse> {
        await this.ensureAuthenticated();

        try {
            // Validate before submission
            const validation = this.validateVATReturn(vatReturn);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 'ERROR',
                    errorMessage: `Validation failed: ${validation.errors.join(', ')}`,
                    requiresManualIntervention: true,
                };
            }

            // Format for ISHEMA
            const payload = this.formatVATReturnPayload(vatReturn);

            const response = await this.makeAuthenticatedRequest<{
                reference_number: string;
                submission_date: string;
                payment_due_date: string;
                amount_payable: number;
                status: string;
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
            return this.handleISHEMAError(error, 'VAT return submission');
        }
    }

    /**
     * Get VAT return status from ISHEMA.
     */
    async getVATReturnStatus(referenceNumber: string): Promise<{
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PAID';
        amount: number;
        paymentDate?: Date;
        rejectionReason?: string;
    }> {
        await this.ensureAuthenticated();

        const response = await this.makeAuthenticatedRequest<{
            status: string;
            amount: number;
            payment_date?: string;
            rejection_reason?: string;
        }>('GET', `${ISHEMA_ENDPOINTS.VAT_RETURN}/${referenceNumber}`);

        return {
            status: response.status as 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PAID',
            amount: response.amount,
            paymentDate: response.payment_date ? new Date(response.payment_date) : undefined,
            rejectionReason: response.rejection_reason,
        };
    }

    /**
     * Validate VAT return before submission.
     */
    private validateVATReturn(vatReturn: VATReturn): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields
        if (!vatReturn.period.start) errors.push('Period start date required');
        if (!vatReturn.period.end) errors.push('Period end date required');
        if (vatReturn.box1OutputVAT < 0) errors.push('Output VAT cannot be negative');
        if (vatReturn.box5InputVAT < 0) errors.push('Input VAT cannot be negative');

        // Business logic validations
        const expectedNetVAT = vatReturn.box1OutputVAT - vatReturn.box5InputVAT;
        if (Math.abs(vatReturn.box6NetVAT - expectedNetVAT) > 1) {
            errors.push('Net VAT calculation mismatch');
        }

        // Warnings
        if (vatReturn.ebmInvoiceCount === 0) {
            warnings.push('No EBM invoices recorded - verify all sales are captured');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Format VAT return for ISHEMA XML/JSON submission.
     */
    private formatVATReturnPayload(vatReturn: VATReturn): Record<string, unknown> {
        return {
            tin: this.config.tin,
            period_start: vatReturn.period.start.toISOString().split('T')[0],
            period_end: vatReturn.period.end.toISOString().split('T')[0],
            period_type: vatReturn.period.type,
            box1_standard_rated_supplies: vatReturn.box1StandardRatedSupplies,
            box1_output_vat: vatReturn.box1OutputVAT,
            box2_zero_rated_supplies: vatReturn.box2ZeroRatedSupplies,
            box3_exempt_supplies: vatReturn.box3ExemptSupplies,
            box4_total_supplies: vatReturn.box4TotalSupplies,
            box5_input_vat: vatReturn.box5InputVAT,
            box6_net_vat: vatReturn.box6NetVAT,
            box7_amount: vatReturn.box7Amount,
            box7_type: vatReturn.box7Type.toLowerCase(),
            ebm_invoice_count: vatReturn.ebmInvoiceCount,
        };
    }

    // =========================================================================
    // CIT OPERATIONS
    // =========================================================================

    /**
     * Submit CIT return to RRA.
     */
    async submitCITReturn(citReturn: CITReturn): Promise<ISHEMAResponse> {
        await this.ensureAuthenticated();

        try {
            const payload = this.formatCITReturnPayload(citReturn);

            const response = await this.makeAuthenticatedRequest<{
                reference_number: string;
                submission_date: string;
                payment_due_date: string;
                amount_payable: number;
                status: string;
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
            return this.handleISHEMAError(error, 'CIT return submission');
        }
    }

    /**
     * Format CIT return payload.
     */
    private formatCITReturnPayload(citReturn: CITReturn): Record<string, unknown> {
        return {
            tin: this.config.tin,
            financial_year_end: citReturn.financialYearEnd.toISOString().split('T')[0],
            accounting_profit: citReturn.accountingProfit,
            add_backs: citReturn.taxAdjustmentsAddBacks,
            deductions: citReturn.taxAdjustmentsDeductions,
            taxable_income: citReturn.taxableIncome,
            cit_rate: citReturn.citRate,
            cit_payable: citReturn.citPayable,
            provisional_payments: citReturn.provisionalPayments,
            balance_payable: citReturn.balancePayable,
        };
    }

    // =========================================================================
    // TAX STATUS & CERTIFICATES
    // =========================================================================

    /**
     * Check taxpayer status.
     */
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

    /**
     * Download tax clearance certificate.
     */
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

    /**
     * Validate EBM invoice with RRA.
     */
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

    /**
     * Sync EBM invoices for period.
     */
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

    /**
     * Make authenticated request to ISHEMA.
     */
    private async makeAuthenticatedRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        if (!this.accessToken) {
            throw new Error('Not authenticated - call authenticate() first');
        }

        return this.makeRequest<T>(method, endpoint, body, {
            Authorization: `Bearer ${this.accessToken.accessToken}`,
        });
    }

    /**
     * Make HTTP request with retry logic.
     */
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
                    const errorData = await response.json().catch(() => ({}));
                    throw new ISHEMAAPIError(
                        errorData.message || `HTTP ${response.status}`,
                        errorData.code || 'UNKNOWN',
                        response.status
                    );
                }

                return await response.json() as T;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Don't retry on auth errors or validation errors
                if (error instanceof ISHEMAAPIError && error.statusCode < 500) {
                    throw error;
                }

                // Wait before retry with exponential backoff
                if (attempt < this.retryCount) {
                    await this.sleep(this.retryDelayMs * Math.pow(2, attempt - 1));
                }
            }
        }

        throw lastError || new Error('Request failed after retries');
    }

    /**
     * Handle ISHEMA API errors.
     */
    private handleISHEMAError(error: unknown, operation: string): ISHEMAResponse {
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

    /**
     * Sleep helper.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * ISHEMA API Error.
 */
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

/**
 * Factory function.
 */
export function createISHEMAClient(config: ISHEMAConfig): ISHEMAClient {
    return new ISHEMAClient(config);
}

/**
 * Create sandbox client for testing.
 */
export function createISHEMASandboxClient(config: Omit<ISHEMAConfig, 'sandbox'>): ISHEMAClient {
    return new ISHEMAClient({ ...config, sandbox: true });
}
