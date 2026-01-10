/**
 * Malta Business Registry Client (Stub)
 *
 * Integration with Malta Business Registry (MBR).
 * Handles company lookups and annual return filings.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * MBR company details.
 */
export interface MBRCompanyDetails {
    registrationNumber: string;
    companyName: string;
    registeredAddress: string;
    incorporationDate: Date;
    companyType: 'PRIVATE' | 'PUBLIC' | 'PARTNERSHIP' | 'BRANCH';
    status: 'ACTIVE' | 'DISSOLVED' | 'STRUCK_OFF' | 'IN_LIQUIDATION';
    authorizedCapital?: number;
    issuedCapital?: number;
    directors: Array<{
        name: string;
        appointmentDate: Date;
        role: 'DIRECTOR' | 'COMPANY_SECRETARY';
    }>;
    shareholders: Array<{
        name: string;
        shares: number;
        percentage: number;
    }>;
    lastAnnualReturnDate?: Date;
    nextFilingDeadline?: Date;
}

/**
 * MBR filing submission.
 */
export interface MBRFilingData {
    companyRegNo: string;
    filingType: 'ANNUAL_RETURN' | 'AUDITED_ACCOUNTS' | 'ABBREVIATED_ACCOUNTS' | 'DIRECTORS_REPORT';
    periodEnd: Date;
    documents: Array<{
        type: string;
        filename: string;
        content: string; // Base64 encoded
    }>;
}

/**
 * MBR submission receipt.
 */
export interface MBRSubmissionReceipt {
    referenceNumber: string;
    submissionDate: Date;
    status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PENDING_REVIEW';
    filingDeadline: Date;
    fees?: {
        amount: number;
        currency: string;
        paid: boolean;
    };
}

/**
 * MBR client configuration.
 */
export interface MBRClientConfig {
    apiKey?: string;
    certificatePath?: string;
    environment: 'production' | 'sandbox';
}

// ============================================================================
// MBR CLIENT
// ============================================================================

/**
 * Malta Business Registry API Client.
 *
 * Provides integration with MBR for:
 * - Company information lookup
 * - Annual return filing
 * - Filing status tracking
 */
export class MBRClient {
    private config: MBRClientConfig;
    private baseUrl: string;

    constructor(config: MBRClientConfig) {
        this.config = config;
        this.baseUrl =
            config.environment === 'production'
                ? 'https://registry.mbr.mt/api/v1'
                : 'https://test.registry.mbr.mt/api/v1';
    }

    /**
     * Get company details from MBR.
     */
    async getCompanyDetails(registrationNo: string): Promise<MBRCompanyDetails | null> {
        console.log(`[MBR] Fetching company details for ${registrationNo}`);

        await this.simulateDelay();

        // Stub implementation
        return {
            registrationNumber: registrationNo,
            companyName: `Company ${registrationNo} Ltd`,
            registeredAddress: '123 Business Street, Valletta VLT 1234, Malta',
            incorporationDate: new Date('2020-01-15'),
            companyType: 'PRIVATE',
            status: 'ACTIVE',
            authorizedCapital: 100000,
            issuedCapital: 50000,
            directors: [
                {
                    name: 'John Director',
                    appointmentDate: new Date('2020-01-15'),
                    role: 'DIRECTOR',
                },
            ],
            shareholders: [
                { name: 'Shareholder A', shares: 30000, percentage: 60 },
                { name: 'Shareholder B', shares: 20000, percentage: 40 },
            ],
            lastAnnualReturnDate: new Date('2024-06-15'),
            nextFilingDeadline: this.calculateFilingDeadline(new Date('2024-12-31')),
        };
    }

    /**
     * Submit annual return to MBR.
     */
    async submitAnnualReturn(data: MBRFilingData): Promise<MBRSubmissionReceipt> {
        console.log(`[MBR] Submitting ${data.filingType} for ${data.companyRegNo}`);

        await this.simulateDelay();

        // Calculate filing deadline (10 months + 42 days from period end)
        const deadline = this.calculateFilingDeadline(data.periodEnd);

        return {
            referenceNumber: `MBR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
            submissionDate: new Date(),
            status: 'SUBMITTED',
            filingDeadline: deadline,
            fees: {
                amount: data.filingType === 'AUDITED_ACCOUNTS' ? 125 : 75,
                currency: 'EUR',
                paid: false,
            },
        };
    }

    /**
     * Check filing status.
     */
    async checkFilingStatus(referenceNumber: string): Promise<{
        status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PENDING_REVIEW';
        lastUpdated: Date;
        remarks?: string;
    }> {
        console.log(`[MBR] Checking status for ${referenceNumber}`);

        await this.simulateDelay();

        return {
            status: 'ACCEPTED',
            lastUpdated: new Date(),
        };
    }

    /**
     * Get filing deadlines for a company.
     */
    async getFilingDeadlines(registrationNo: string): Promise<Array<{
        filingType: string;
        deadline: Date;
        status: 'UPCOMING' | 'OVERDUE' | 'COMPLETED';
    }>> {
        console.log(`[MBR] Fetching filing deadlines for ${registrationNo}`);

        await this.simulateDelay();

        const yearEnd = new Date('2024-12-31');
        const deadline = this.calculateFilingDeadline(yearEnd);

        return [
            {
                filingType: 'ANNUAL_RETURN',
                deadline,
                status: deadline > new Date() ? 'UPCOMING' : 'OVERDUE',
            },
        ];
    }

    /**
     * Calculate filing deadline per Malta Companies Act.
     * Deadline is 10 months + 42 days from year end.
     */
    private calculateFilingDeadline(yearEnd: Date): Date {
        const deadline = new Date(yearEnd);
        deadline.setMonth(deadline.getMonth() + 10);
        deadline.setDate(deadline.getDate() + 42);
        return deadline;
    }

    private async simulateDelay(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create MBR Client.
 */
export function createMBRClient(
    config: MBRClientConfig = { environment: 'sandbox' }
): MBRClient {
    return new MBRClient(config);
}

/**
 * Lazy singleton instance.
 */
let _mbrClient: MBRClient | null = null;

export const mbrClient = {
    instance(config?: MBRClientConfig): MBRClient {
        if (!_mbrClient) {
            _mbrClient = new MBRClient(config ?? { environment: 'sandbox' });
        }
        return _mbrClient;
    },
};
