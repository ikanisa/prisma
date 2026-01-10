/**
 * MFSA Registry Client (Stub)
 *
 * Integration with Malta Financial Services Authority Registry.
 * Verifies regulated entity status and approved auditors.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * MFSA regulated entity status.
 */
export interface MFSARegulatedStatus {
    regulated: boolean;
    category?: 'MIFID' | 'INSURANCE' | 'VFA' | 'UCITS' | 'FUND' | 'TRUST' | 'CSP';
    licenseNumber?: string;
    licenseStatus?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'PENDING';
    supervisingDivision?: string;
    lastInspection?: Date;
}

/**
 * MFSA approved auditor.
 */
export interface MFSAApprovedAuditor {
    name: string;
    warrantNumber: string;
    firm: string;
    approvalDate: Date;
    categories: string[];
    status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
}

/**
 * MFSA client configuration.
 */
export interface MFSAClientConfig {
    apiKey?: string;
    environment: 'production' | 'sandbox';
}

// ============================================================================
// MFSA REGISTRY CLIENT
// ============================================================================

/**
 * MFSA Registry API Client.
 *
 * Provides integration with MFSA for:
 * - Checking regulated entity status
 * - Verifying approved auditor warrants
 * - Retrieving license information
 */
export class MFSARegistryClient {
    private config: MFSAClientConfig;
    private baseUrl: string;

    constructor(config: MFSAClientConfig) {
        this.config = config;
        this.baseUrl =
            config.environment === 'production'
                ? 'https://api.mfsa.mt/v1'
                : 'https://sandbox.api.mfsa.mt/v1';
    }

    /**
     * Check if entity is MFSA regulated.
     */
    async checkRegulatedStatus(
        companyRegNo: string
    ): Promise<MFSARegulatedStatus> {
        // Stub implementation - in production would call MFSA API
        console.log(`[MFSA] Checking regulated status for ${companyRegNo}`);

        // Simulate API delay
        await this.simulateDelay();

        // Return stub response based on registration number patterns
        if (companyRegNo.startsWith('C-F')) {
            // Financial services pattern
            return {
                regulated: true,
                category: 'MIFID',
                licenseNumber: `IF-${companyRegNo}`,
                licenseStatus: 'ACTIVE',
                supervisingDivision: 'Securities and Markets Supervision',
            };
        } else if (companyRegNo.startsWith('C-V')) {
            // VFA pattern
            return {
                regulated: true,
                category: 'VFA',
                licenseNumber: `VFA-${companyRegNo}`,
                licenseStatus: 'ACTIVE',
                supervisingDivision: 'FinTech and Innovation',
            };
        }

        return { regulated: false };
    }

    /**
     * Get list of MFSA approved auditors.
     */
    async getApprovedAuditors(): Promise<MFSAApprovedAuditor[]> {
        // Stub implementation
        console.log('[MFSA] Fetching approved auditors list');

        await this.simulateDelay();

        return [
            {
                name: 'Sample Auditor Ltd',
                warrantNumber: 'WN-001',
                firm: 'Big 4 Malta',
                approvalDate: new Date('2020-01-01'),
                categories: ['MIFID', 'INSURANCE', 'UCITS'],
                status: 'ACTIVE',
            },
        ];
    }

    /**
     * Verify auditor warrant is valid.
     */
    async verifyAuditorWarrant(warrantNo: string): Promise<{
        valid: boolean;
        auditor?: MFSAApprovedAuditor;
    }> {
        console.log(`[MFSA] Verifying warrant ${warrantNo}`);

        await this.simulateDelay();

        // Stub - all warrants starting with WN are valid
        if (warrantNo.startsWith('WN-')) {
            return {
                valid: true,
                auditor: {
                    name: 'Verified Auditor',
                    warrantNumber: warrantNo,
                    firm: 'Audit Firm Ltd',
                    approvalDate: new Date('2018-01-01'),
                    categories: ['MIFID', 'INSURANCE'],
                    status: 'ACTIVE',
                },
            };
        }

        return { valid: false };
    }

    /**
     * Get entity license details.
     */
    async getLicenseDetails(
        licenseNumber: string
    ): Promise<{
        found: boolean;
        details?: {
            licenseNumber: string;
            entityName: string;
            category: string;
            issuedDate: Date;
            expiryDate?: Date;
            conditions: string[];
        };
    }> {
        console.log(`[MFSA] Fetching license details for ${licenseNumber}`);

        await this.simulateDelay();

        return {
            found: true,
            details: {
                licenseNumber,
                entityName: 'Licensed Entity Ltd',
                category: 'MIFID II Investment Firm',
                issuedDate: new Date('2019-01-01'),
                conditions: ['Capital adequacy requirements', 'Client money segregation'],
            },
        };
    }

    private async simulateDelay(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create MFSA Registry Client.
 */
export function createMFSAClient(
    config: MFSAClientConfig = { environment: 'sandbox' }
): MFSARegistryClient {
    return new MFSARegistryClient(config);
}

/**
 * Lazy singleton instance.
 */
let _mfsaClient: MFSARegistryClient | null = null;

export const mfsaClient = {
    instance(config?: MFSAClientConfig): MFSARegistryClient {
        if (!_mfsaClient) {
            _mfsaClient = new MFSARegistryClient(config ?? { environment: 'sandbox' });
        }
        return _mfsaClient;
    },
};
