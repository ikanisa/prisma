/**
 * Malta CFR e-Services Integration Client
 * 
 * Integration with Malta Commissioner for Revenue e-Services platform.
 * Handles VAT returns, corporate tax filings, and refund claims.
 * 
 * Note: This is a reference implementation. Actual CFR API endpoints
 * and authentication methods should be confirmed with CFR.
 */

// ============================================================================
// LOCAL TYPE DEFINITIONS
// (duplicated to avoid circular dependency with @prisma/tax)
// ============================================================================

// Malta tax account types
type MaltaTaxAccountType = 'MTA' | 'FIA' | 'IPA' | 'FTA' | 'UA';
type MaltaRefundRateType = 'six_sevenths' | 'five_sevenths' | 'two_thirds' | 'none';

// Tax account for allocation tracking
interface MaltaTaxAccount {
    type: MaltaTaxAccountType;
    description: string;
    income: number;
    taxPaid: number;
    refundRate: MaltaRefundRateType;
    refundAmount: number;
    netTaxCost: number;
    effectiveRate: number;
}

// Tax account allocation result
interface TaxAccountAllocation {
    accounts: Record<MaltaTaxAccountType, MaltaTaxAccount>;
    totalIncome: number;
    totalTaxPaid: number;
    totalRefundAvailable: number;
    netEffectiveTax: number;
    overallEffectiveRate: number;
}

// Intra-EU supply for recapitulative statement
interface IntraEUSupply {
    customerVATNumber: string;
    customerCountry: string;
    value: number;
}

// Intra-EU acquisition
interface IntraEUAcquisition {
    supplierVATNumber: string;
    supplierCountry: string;
    value: number;
}

// CFR VAT return submission
interface CFRVATReturnRequest {
    vatNumber: string;
    periodStart: string;
    periodEnd: string;
    box1OutputVAT: number;
    box2InputVAT: number;
    box3NetVAT: number;
    box4TotalSales: number;
    box5TotalPurchases: number;
    intraEUSupplies?: IntraEUSupply[];
    intraEUAcquisitions?: IntraEUAcquisition[];
}

// CFR corporate tax return
interface CFRCorporateTaxReturn {
    tin: string;
    fiscalYear: number;
    chargeableIncome: number;
    taxAt35Percent: number;
    taxAccountsAllocation: TaxAccountAllocation;
    regime: 'standard' | 'fitwi';
}

// Beneficial owner for refund claims
interface BeneficialOwner {
    name: string;
    jurisdiction: string;
    ownershipPercentage: number;
    taxResidency: string;
}

// CFR refund claim
interface CFRRefundClaim {
    companyTIN: string;
    shareholderId: string;
    dividendAmount: number;
    distributionDate: string;
    sourceAccount: MaltaTaxAccountType;
    refundClaimed: number;
    beneficialOwners: BeneficialOwner[];
}

// CFR API response
interface CFRResponse {
    referenceNumber: string;
    status: 'submitted' | 'accepted' | 'rejected' | 'processing';
    submissionDate: string;
    errors?: string[];
    amountPayable?: number;
    paymentDeadline?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CFReServicesConfig {
    /** API key for CFR e-Services (if applicable) */
    apiKey?: string;
    /** Path to client certificate for mTLS authentication */
    certificatePath?: string;
    /** Environment: 'production' or 'sandbox' */
    environment: 'production' | 'sandbox';
    /** Organization TIN */
    organizationTIN?: string;
}

// ============================================================================
// CFR E-SERVICES CLIENT
// ============================================================================

export class CFReServicesClient {
    private config: CFReServicesConfig;
    private baseUrl: string;

    constructor(config: CFReServicesConfig) {
        this.config = config;
        this.baseUrl = config.environment === 'production'
            ? 'https://cfr.gov.mt/eservices/api' // Placeholder - actual URL from CFR
            : 'https://sandbox.cfr.gov.mt/eservices/api'; // Placeholder
    }

    // ========================================================================
    // VAT SERVICES
    // ========================================================================

    /**
     * Submit VAT return to CFR
     */
    async submitVATReturn(returnData: CFRVATReturnRequest): Promise<CFRResponse> {
        const payload = {
            vat_number: returnData.vatNumber,
            period_start: returnData.periodStart,
            period_end: returnData.periodEnd,
            box_1_output_vat: returnData.box1OutputVAT.toString(),
            box_2_input_vat: returnData.box2InputVAT.toString(),
            box_3_net_vat: returnData.box3NetVAT.toString(),
            box_4_total_sales: returnData.box4TotalSales.toString(),
            box_5_total_purchases: returnData.box5TotalPurchases.toString(),
            intra_eu_supplies: returnData.intraEUSupplies || [],
            intra_eu_acquisitions: returnData.intraEUAcquisitions || [],
            submission_date: new Date().toISOString(),
        };

        return this.makeRequest('/vat/returns', 'POST', payload);
    }

    /**
     * Query VAT account balance and filing history
     */
    async queryVATAccount(vatNumber: string): Promise<{
        vatNumber: string;
        balance: number;
        lastFilingDate: string | null;
        filingHistory: Array<{
            period: string;
            status: string;
            amountPaid: number;
        }>;
    }> {
        return this.makeRequest(`/vat/account/${vatNumber}`, 'GET');
    }

    /**
     * Validate VAT number via VIES
     */
    async validateVATNumber(vatNumber: string): Promise<{
        valid: boolean;
        name?: string;
        address?: string;
        requestDate: string;
    }> {
        // Malta uses EU VIES for VAT validation
        return this.makeRequest(`/vat/validate/${vatNumber}`, 'GET');
    }

    /**
     * Get VAT filing deadlines
     */
    getVATFilingDeadlines(year: number): Array<{
        quarter: string;
        periodStart: string;
        periodEnd: string;
        filingDeadline: string;
        paymentDeadline: string;
    }> {
        return [
            {
                quarter: 'Q1',
                periodStart: `${year}-01-01`,
                periodEnd: `${year}-03-31`,
                filingDeadline: `${year}-05-15`,
                paymentDeadline: `${year}-05-15`,
            },
            {
                quarter: 'Q2',
                periodStart: `${year}-04-01`,
                periodEnd: `${year}-06-30`,
                filingDeadline: `${year}-08-15`,
                paymentDeadline: `${year}-08-15`,
            },
            {
                quarter: 'Q3',
                periodStart: `${year}-07-01`,
                periodEnd: `${year}-09-30`,
                filingDeadline: `${year}-11-15`,
                paymentDeadline: `${year}-11-15`,
            },
            {
                quarter: 'Q4',
                periodStart: `${year}-10-01`,
                periodEnd: `${year}-12-31`,
                filingDeadline: `${year + 1}-02-15`,
                paymentDeadline: `${year + 1}-02-15`,
            },
        ];
    }

    // ========================================================================
    // CORPORATE TAX SERVICES
    // ========================================================================

    /**
     * Submit corporate income tax return
     */
    async submitCorporateTaxReturn(returnData: CFRCorporateTaxReturn): Promise<CFRResponse> {
        const payload = {
            tin: returnData.tin,
            fiscal_year: returnData.fiscalYear,
            chargeable_income: returnData.chargeableIncome.toString(),
            tax_at_35_percent: returnData.taxAt35Percent.toString(),
            tax_accounts_allocation: this.formatTaxAccounts(returnData.taxAccountsAllocation),
            regime: returnData.regime,
            submission_date: new Date().toISOString(),
        };

        return this.makeRequest('/corporate-tax/returns', 'POST', payload);
    }

    /**
     * Query corporate tax account
     */
    async queryCorporateTaxAccount(tin: string): Promise<{
        tin: string;
        companyName: string;
        balance: number;
        assessmentYears: Array<{
            year: number;
            status: 'pending' | 'assessed' | 'paid';
            taxDue: number;
            taxPaid: number;
        }>;
    }> {
        return this.makeRequest(`/corporate-tax/account/${tin}`, 'GET');
    }

    /**
     * Get provisional tax installment schedule
     */
    getProvisionalTaxSchedule(fiscalYear: number): Array<{
        installment: number;
        dueDate: string;
        percentage: number;
    }> {
        return [
            {
                installment: 1,
                dueDate: `${fiscalYear}-04-30`,
                percentage: 33.33,
            },
            {
                installment: 2,
                dueDate: `${fiscalYear}-08-31`,
                percentage: 33.33,
            },
            {
                installment: 3,
                dueDate: `${fiscalYear}-12-31`,
                percentage: 33.34,
            },
        ];
    }

    // ========================================================================
    // SHAREHOLDER REFUND SERVICES
    // ========================================================================

    /**
     * Submit shareholder refund claim
     * Must be within 14 days of dividend distribution
     */
    async claimShareholderRefund(claimData: CFRRefundClaim): Promise<CFRResponse> {
        // Validate 14-day deadline
        const distributionDate = new Date(claimData.distributionDate);
        const today = new Date();
        const daysSince = Math.floor((today.getTime() - distributionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince > 14) {
            return {
                referenceNumber: '',
                status: 'rejected',
                submissionDate: new Date().toISOString(),
                errors: [`Refund claim exceeds 14-day deadline. Dividend distributed on ${claimData.distributionDate}, ${daysSince} days ago.`],
            };
        }

        const payload = {
            company_tin: claimData.companyTIN,
            shareholder_id: claimData.shareholderId,
            dividend_amount: claimData.dividendAmount.toString(),
            distribution_date: claimData.distributionDate,
            source_account: claimData.sourceAccount,
            refund_claimed: claimData.refundClaimed.toString(),
            beneficial_owners: claimData.beneficialOwners.map(bo => ({
                name: bo.name,
                jurisdiction: bo.jurisdiction,
                ownership_percentage: bo.ownershipPercentage,
                tax_residency: bo.taxResidency,
            })),
            claim_date: new Date().toISOString(),
        };

        return this.makeRequest('/refunds/claim', 'POST', payload);
    }

    /**
     * Query refund claim status
     */
    async queryRefundStatus(claimReference: string): Promise<{
        reference: string;
        status: 'pending' | 'processing' | 'approved' | 'paid' | 'rejected';
        claimDate: string;
        claimAmount: number;
        paidAmount?: number;
        paidDate?: string;
        rejectionReason?: string;
    }> {
        return this.makeRequest(`/refunds/status/${claimReference}`, 'GET');
    }

    /**
     * Get estimated refund processing time
     */
    getRefundProcessingTime(): {
        standardDays: number;
        expeditedDays: number;
        currentBacklog: string;
    } {
        return {
            standardDays: 14, // CFR aims for 14-day turnaround
            expeditedDays: 7,
            currentBacklog: 'Normal processing times apply',
        };
    }

    // ========================================================================
    // FITWI REGIME SERVICES
    // ========================================================================

    /**
     * Submit FITWI election
     */
    async electFITWIRegime(tin: string, electionDetails: {
        effectiveFromYear: number;
        boardResolutionDate: string;
        bindingPeriodAcknowledged: boolean;
    }): Promise<CFRResponse> {
        if (!electionDetails.bindingPeriodAcknowledged) {
            return {
                referenceNumber: '',
                status: 'rejected',
                submissionDate: new Date().toISOString(),
                errors: ['Must acknowledge 5-year binding period'],
            };
        }

        const payload = {
            tin,
            effective_from_year: electionDetails.effectiveFromYear,
            board_resolution_date: electionDetails.boardResolutionDate,
            binding_period_acknowledged: electionDetails.bindingPeriodAcknowledged,
            election_date: new Date().toISOString(),
        };

        return this.makeRequest('/fitwi/elect', 'POST', payload);
    }

    /**
     * Query FITWI election status
     */
    async queryFITWIStatus(tin: string): Promise<{
        elected: boolean;
        effectiveFrom?: number;
        bindingPeriodEnds?: number;
        canRevert?: boolean;
    }> {
        return this.makeRequest(`/fitwi/status/${tin}`, 'GET');
    }

    // ========================================================================
    // INTRASTAT SERVICES
    // ========================================================================

    /**
     * Submit Intrastat declaration
     */
    async submitIntrastat(declaration: {
        vatNumber: string;
        period: string; // YYYY-MM
        flow: 'arrivals' | 'dispatches';
        items: Array<{
            commodityCode: string;
            partnerCountry: string;
            value: number;
            weight: number;
            supplementaryUnits?: number;
        }>;
    }): Promise<CFRResponse> {
        return this.makeRequest('/intrastat/submit', 'POST', declaration);
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Format tax accounts for CFR submission
     */
    private formatTaxAccounts(allocation: TaxAccountAllocation): Record<string, unknown> {
        const formatted: Record<string, unknown> = {};

        for (const [accountType, account] of Object.entries(allocation.accounts)) {
            formatted[accountType] = {
                income: account.income,
                tax_paid: account.taxPaid,
                refund_rate: account.refundRate,
                refund_amount: account.refundAmount,
            };
        }

        return formatted;
    }

    /**
     * Make HTTP request to CFR API
     * Note: Actual implementation would use fetch/axios with proper auth
     */
    private async makeRequest<T = CFRResponse>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        body?: unknown
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // In production, this would use actual HTTP client
        // with certificate-based authentication
        console.log(`[CFR API] ${method} ${url}`, body ? JSON.stringify(body).slice(0, 200) : '');

        // Simulated response for development
        if (this.config.environment === 'sandbox') {
            return {
                referenceNumber: `CFR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                status: 'submitted',
                submissionDate: new Date().toISOString(),
            } as unknown as T;
        }

        // Production implementation would be:
        // const response = await fetch(url, {
        //     method,
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${this.config.apiKey}`,
        //     },
        //     body: body ? JSON.stringify(body) : undefined,
        //     // Certificate would be configured at agent level
        // });
        // return response.json();

        throw new Error('Production CFR API not configured. Use sandbox environment for testing.');
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create CFR e-Services client
 */
export function createCFReServicesClient(config: CFReServicesConfig): CFReServicesClient {
    return new CFReServicesClient(config);
}

/**
 * Create sandbox client for testing
 */
export function createSandboxCFRClient(): CFReServicesClient {
    return new CFReServicesClient({
        environment: 'sandbox',
    });
}
