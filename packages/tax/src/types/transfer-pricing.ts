/**
 * Transfer Pricing Types
 * 
 * Type definitions for transfer pricing analysis, BEPS documentation,
 * and arm's length calculations.
 */

// ============================================================================
// TRANSFER PRICING METHODS
// ============================================================================

/**
 * OECD transfer pricing methods
 */
export type TransferPricingMethod =
    | 'CUP'    // Comparable Uncontrolled Price
    | 'RPM'    // Resale Price Method  
    | 'CPM'    // Cost Plus Method
    | 'TNMM'   // Transactional Net Margin Method
    | 'PSM'    // Profit Split Method
    | 'OTHER';

/**
 * Transaction types for transfer pricing
 */
export type TransactionType =
    | 'tangible_goods'
    | 'services'
    | 'intangibles'
    | 'financial_transactions'
    | 'cost_sharing'
    | 'business_restructuring';

/**
 * Profit level indicator types
 */
export type ProfitLevelIndicator =
    | 'operating_margin'
    | 'gross_margin'
    | 'berry_ratio'
    | 'return_on_assets'
    | 'return_on_capital'
    | 'net_cost_plus'
    | 'other';

// ============================================================================
// ENTITY AND TRANSACTION TYPES
// ============================================================================

/**
 * Related party entity
 */
export interface RelatedPartyEntity {
    id: string;
    name: string;
    country: string;
    taxId?: string;

    // Functional profile
    functions: EntityFunction[];
    risks: EntityRisk[];
    assets: EntityAsset[];

    // Characterization
    characterization:
    | 'entrepreneur'           // Full risk, full functions
    | 'limited_risk_distributor'
    | 'commissionaire'
    | 'toll_manufacturer'
    | 'full_fledged_manufacturer'
    | 'contract_service_provider'
    | 'ip_owner'
    | 'financing_entity'
    | 'holding_company'
    | 'other';

    // Financials
    financials?: {
        revenue: number;
        operatingCosts: number;
        operatingProfit: number;
        assets: number;
        headcount: number;
    };
}

export type EntityFunction =
    | 'r_and_d'
    | 'manufacturing'
    | 'procurement'
    | 'marketing_sales'
    | 'distribution'
    | 'after_sales_service'
    | 'management'
    | 'financing'
    | 'quality_control'
    | 'logistics'
    | 'it_services'
    | 'administrative';

export type EntityRisk =
    | 'market_risk'
    | 'inventory_risk'
    | 'credit_risk'
    | 'currency_risk'
    | 'product_liability'
    | 'r_and_d_risk'
    | 'warranty_risk'
    | 'financial_risk'
    | 'operational_risk';

export type EntityAsset =
    | 'tangible_assets'
    | 'intangible_technology'
    | 'intangible_marketing'
    | 'intangible_other'
    | 'working_capital'
    | 'financial_assets';

/**
 * Intercompany transaction
 */
export interface IntercompanyTransaction {
    id: string;

    // Parties
    payerEntityId: string;
    payerEntityName: string;
    payerCountry: string;
    recipientEntityId: string;
    recipientEntityName: string;
    recipientCountry: string;

    // Transaction details
    transactionType: TransactionType;
    description: string;

    // Amounts
    amount: number;
    currency: string;

    // Period
    fiscalYear: number;
    periodStart: Date;
    periodEnd: Date;

    // Pricing basis
    pricingMethod?: TransferPricingMethod;
    pricingBasis?: string;  // e.g., "Cost plus 5%"

    // Tested party
    testedParty?: 'payer' | 'recipient';

    // Documentation
    hasWrittenAgreement: boolean;
    agreementDate?: Date;

    // Arm's length analysis
    armLengthAnalysis?: ArmLengthResult;
}

// ============================================================================
// ARM'S LENGTH ANALYSIS
// ============================================================================

/**
 * Comparable company data
 */
export interface ComparableCompany {
    id: string;
    name: string;
    country: string;
    industry: string;
    sic_code?: string;

    // Selection criteria
    acceptanceStatus: 'accepted' | 'rejected';
    rejectionReason?: string;

    // Financial data
    financials: {
        fiscalYear: number;
        revenue: number;
        grossProfit: number;
        operatingProfit: number;
        totalAssets: number;
        operatingCosts: number;
    }[];

    // Calculated PLIs
    profitLevelIndicators: {
        indicator: ProfitLevelIndicator;
        values: { year: number; value: number }[];
        weightedAverage: number;
    }[];
}

/**
 * Benchmark study results
 */
export interface BenchmarkStudy {
    id: string;
    transactionId: string;

    // Search parameters
    searchCriteria: {
        industry: string[];
        geography: string[];
        independenceTest: string;
        activityTest: string;
        sizeRange?: { min: number; max: number };
        yearsAnalyzed: number[];
    };

    // Results
    comparablesSearched: number;
    comparablesSelected: number;
    comparables: ComparableCompany[];

    // Method applied
    method: TransferPricingMethod;
    profitLevelIndicator: ProfitLevelIndicator;

    // Range
    armLengthRange: {
        minimum: number;
        firstQuartile: number;
        median: number;
        thirdQuartile: number;
        maximum: number;
        interquartileRange: { low: number; high: number };
    };

    // Conclusion
    testedPartyResult: number;
    isWithinRange: boolean;
    adjustmentRequired?: number;

    // Metadata
    databaseSource: string;  // e.g., "Bureau van Dijk Orbis"
    searchDate: Date;
    preparedBy: string;
}

/**
 * Arm's length analysis result
 */
export interface ArmLengthResult {
    transactionId: string;

    // Selected method
    selectedMethod: TransferPricingMethod;
    methodJustification: string;
    methodsConsidered: { method: TransferPricingMethod; reason: string; selected: boolean }[];

    // Tested party
    testedParty: string;
    testedPartyJustification: string;

    // PLI selection
    profitLevelIndicator: ProfitLevelIndicator;
    pliJustification: string;

    // Benchmark study
    benchmarkStudy?: BenchmarkStudy;

    // Result
    testedPartyResult: number;
    armLengthRange: {
        low: number;
        median: number;
        high: number;
    };

    // Conclusion
    conclusion: 'arm_length' | 'adjustment_required' | 'inconclusive';
    adjustmentAmount?: number;
    adjustmentDirection?: 'increase_price' | 'decrease_price';

    // Risk assessment
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
}

// ============================================================================
// BEPS DOCUMENTATION
// ============================================================================

/**
 * Master File content (BEPS Action 13)
 */
export interface MasterFile {
    id: string;
    groupName: string;
    fiscalYear: number;

    // A. Organizational structure
    organizationalStructure: {
        legalStructureChart: string;  // File path or URL
        geographicLocations: { entity: string; country: string; functions: string[] }[];
    };

    // B. Description of MNE business
    businessDescription: {
        businessOverview: string;
        driversOfProfits: string[];
        supplyChainDescription: string;
        principalGeographicMarkets: string[];
        keyCompetitors: string[];
    };

    // C. MNE intangibles
    intangibles: {
        strategyForDevelopment: string;
        importantIntangibles: { name: string; ownerEntity: string; description: string }[];
        relatedPartyAgreements: string[];
        transferPricingPolicies: string;
    };

    // D. Intercompany financial activities
    financialActivities: {
        groupFinancingArrangements: string;
        centralFinancingEntity?: string;
        transferPricingPoliciesFinancing: string;
    };

    // E. Financial and tax positions
    financialTaxPositions: {
        consolidatedFinancialStatements: string;  // File path or URL
        existingAPAs: { entity: string; country: string; years: string }[];
        taxRulings: { country: string; description: string }[];
    };

    createdAt: Date;
    updatedAt: Date;
    preparedBy: string;
}

/**
 * Local File content (BEPS Action 13)
 */
export interface LocalFile {
    id: string;
    entityId: string;
    entityName: string;
    country: string;
    fiscalYear: number;

    // A. Local entity
    localEntity: {
        managementStructure: string;
        localOrganizationChart: string;  // File path
        keyIndividuals: { name: string; position: string }[];
        businessStrategy: string;
        businessRestructurings?: string;
    };

    // B. Controlled transactions
    controlledTransactions: {
        transactions: IntercompanyTransaction[];
        aggregationJustification?: string;
    };

    // C. Financial information
    financialInformation: {
        financialStatements: string;  // File path
        allocationSchedules: { item: string; basis: string; amount: number }[];
        reconciliationToAuditedStatements: string;
    };

    // D. Comparability analysis
    comparabilityAnalysis: {
        functionalAnalysis: {
            functionsPerformed: EntityFunction[];
            risksAssumed: EntityRisk[];
            assetsUsed: EntityAsset[];
        };
        economicAnalysis: ArmLengthResult[];
    };

    createdAt: Date;
    updatedAt: Date;
    preparedBy: string;
}

/**
 * Country-by-Country Report (BEPS Action 13)
 */
export interface CbCReport {
    id: string;
    groupName: string;
    fiscalYear: number;
    ultimateParentEntity: string;
    ultimateParentCountry: string;

    // Table 1: Overview of allocation
    table1: CbCTable1Entry[];

    // Table 2: List of constituent entities
    table2: CbCTable2Entry[];

    // Table 3: Additional information
    additionalInfo: string;

    createdAt: Date;
    preparedBy: string;
}

export interface CbCTable1Entry {
    jurisdiction: string;
    revenues: {
        unrelated: number;
        related: number;
        total: number;
    };
    profitBeforeTax: number;
    incomeTaxPaid: number;
    incomeTaxAccrued: number;
    statedCapital: number;
    accumulatedEarnings: number;
    numberOfEmployees: number;
    tangibleAssetsNonCash: number;
}

export interface CbCTable2Entry {
    jurisdiction: string;
    entityName: string;
    incorporationJurisdiction: string;
    mainBusinessActivities: string[];
}

// ============================================================================
// TRANSFER PRICING ANALYSIS REQUEST/RESULT
// ============================================================================

/**
 * Transfer pricing analysis request
 */
export interface TPAnalysisRequest {
    groupId: string;
    fiscalYear: number;
    entities: RelatedPartyEntity[];
    transactions: IntercompanyTransaction[];
    generateMasterFile?: boolean;
    generateLocalFiles?: boolean;
    jurisdictions?: string[];  // For local files
}

/**
 * Transfer pricing analysis result
 */
export interface TPAnalysisResult {
    id: string;
    requestId: string;

    // Analyses
    transactionAnalyses: ArmLengthResult[];

    // Documentation
    masterFile?: MasterFile;
    localFiles?: LocalFile[];

    // Summary
    summary: {
        totalTransactions: number;
        transactionsAnalyzed: number;
        transactionsArmLength: number;
        transactionsRequiringAdjustment: number;
        totalAdjustmentAmount: number;
        highRiskTransactions: number;
    };

    // Recommendations
    recommendations: TPRecommendation[];

    createdAt: Date;
    preparedBy: string;
}

export interface TPRecommendation {
    transactionId?: string;
    priority: 'high' | 'medium' | 'low';
    category: 'pricing' | 'documentation' | 'structure' | 'risk';
    recommendation: string;
    expectedImpact?: string;
    deadline?: Date;
}
