/**
 * Eligibility Check Tool
 * 
 * CRITICAL: Blocks financial institutions from using Prisma Core.
 * This is a hard stop - no engagement can be created for ineligible clients.
 */

export interface EligibilityResult {
    clientId: string;
    eligible: boolean;
    reason: string | null;
    checkedAt: string;
}

/**
 * Check if a client is eligible for Prisma Core services.
 * 
 * Ineligible clients:
 * - Financial institutions (banks, MFIs, SACCOs, insurers)
 * - Clients marked as ineligible in database
 * - Clients pending review
 */
export async function eligibilityCheck(clientId: string): Promise<EligibilityResult> {
    // In real implementation, this queries the database:
    // SELECT is_financial_institution, eligibility_status FROM clients WHERE id = clientId

    // For now, simulate the check
    // TODO: Replace with actual Supabase query

    const checkedAt = new Date().toISOString();

    // Simulate database lookup
    // In production:
    // const { data: client } = await supabase
    //   .from('clients')
    //   .select('is_financial_institution, eligibility_status')
    //   .eq('id', clientId)
    //   .single();

    // Placeholder: always eligible unless ID contains 'bank' or 'fi'
    const lowerClientId = clientId.toLowerCase();

    if (lowerClientId.includes('bank') || lowerClientId.includes('fi-')) {
        return {
            clientId,
            eligible: false,
            reason: 'Financial institutions are not eligible for Prisma Core services. This includes banks, MFIs, SACCOs, credit unions, and insurers.',
            checkedAt,
        };
    }

    if (lowerClientId.includes('pending')) {
        return {
            clientId,
            eligible: false,
            reason: 'Client eligibility is pending review. Please contact support.',
            checkedAt,
        };
    }

    return {
        clientId,
        eligible: true,
        reason: null,
        checkedAt,
    };
}

/**
 * Financial institution keywords for detection
 */
export const FI_KEYWORDS = [
    'bank',
    'banking',
    'mfi',
    'microfinance',
    'sacco',
    'credit union',
    'cooperative',
    'insurance',
    'insurer',
    'reinsurance',
    'pension fund',
    'asset management',
    'investment fund',
    'broker',
    'forex',
    'money transfer',
    'mobile money operator',
];

/**
 * Check if entity name suggests a financial institution
 */
export function detectFinancialInstitution(entityName: string): { isLikely: boolean; matchedKeywords: string[] } {
    const lowerName = entityName.toLowerCase();
    const matchedKeywords = FI_KEYWORDS.filter(keyword => lowerName.includes(keyword));

    return {
        isLikely: matchedKeywords.length > 0,
        matchedKeywords,
    };
}
