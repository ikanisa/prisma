/**
 * Nexus Types
 * 
 * Type definitions for multi-state/jurisdiction tax nexus analysis.
 * Supports US economic nexus (Wayfair), Canadian nexus, and physical presence rules.
 */

// ============================================================================
// JURISDICTION TYPES
// ============================================================================

/**
 * US State codes for nexus tracking
 */
export type USStateCode =
    | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
    | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
    | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
    | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
    | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
    | 'DC';

/**
 * Canadian Province codes
 */
export type CAProvinceCode =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE'
    | 'QC' | 'SK' | 'YT';

export type JurisdictionCode = USStateCode | CAProvinceCode;

export type Country = 'US' | 'CA';

// ============================================================================
// NEXUS FACTOR TYPES
// ============================================================================

/**
 * Types of activities that create nexus
 */
export type NexusFactorType =
    | 'physical_presence'    // Office, warehouse, assets
    | 'employee'             // Employees in jurisdiction
    | 'inventory'            // Stored inventory
    | 'sales'                // Gross sales into jurisdiction
    | 'transactions'         // Number of transactions
    | 'property'             // Owned/leased property
    | 'services'             // Services performed in jurisdiction
    | 'affiliate'            // Affiliate/agent activities
    | 'marketplace'          // Marketplace facilitator sales
    | 'digital_products'     // Digital goods/services
    | 'advertising'          // Targeted advertising
    | 'click_through'        // Click-through affiliate nexus
    | 'other';

/**
 * Nexus threshold type
 */
export type ThresholdType = 'sales' | 'transactions' | 'combined';

/**
 * Nexus status
 */
export type NexusStatus =
    | 'none'           // No nexus
    | 'approaching'    // Near threshold (warning)
    | 'established'    // Nexus exists
    | 'unknown';       // Insufficient data

// ============================================================================
// NEXUS RULES
// ============================================================================

/**
 * Economic nexus threshold for a jurisdiction
 */
export interface EconomicNexusThreshold {
    salesThreshold?: number;        // Gross sales threshold (e.g., $100,000)
    transactionThreshold?: number;  // Transaction count threshold (e.g., 200)
    thresholdType: ThresholdType;   // How thresholds are evaluated
    measurementPeriod: 'calendar_year' | 'rolling_12' | 'prior_year' | 'current_or_prior';
    includesMarketplaceSales: boolean;
    effectiveDate: Date;
}

/**
 * Physical presence nexus rules
 */
export interface PhysicalNexusRules {
    employeeThreshold?: number;     // Number of employees that creates nexus
    propertyThreshold?: number;     // Property value threshold
    daysPresenceThreshold?: number; // Days of presence that triggers nexus
    inventoryCreatesNexus: boolean;
    remoteEmployeeCreatesNexus: boolean;
    independentContractorCreatesNexus: boolean;
}

/**
 * Complete nexus rules for a jurisdiction
 */
export interface JurisdictionNexusRules {
    jurisdictionCode: JurisdictionCode;
    jurisdictionName: string;
    country: Country;

    // Sales tax nexus
    hasSalesTax: boolean;
    economicNexus?: EconomicNexusThreshold;
    physicalNexus?: PhysicalNexusRules;

    // Income tax nexus
    hasIncomeTax: boolean;
    incomeTaxNexusRules?: {
        factorApportionment: boolean;
        throwbackRule: boolean;
        marketBasedSourcing: boolean;
        PLimitationPercentage?: number;
    };

    // Registration requirements
    registrationRequired: boolean;
    registrationUrl?: string;

    // Filing requirements once nexus established
    filingFrequency?: 'monthly' | 'quarterly' | 'annual';
    estimatedFilingCost?: number;

    // Additional notes
    notes?: string;
    lastUpdated: Date;
}

// ============================================================================
// ENTITY NEXUS DATA
// ============================================================================

/**
 * Activity data for a single period
 */
export interface PeriodActivity {
    periodStart: Date;
    periodEnd: Date;

    // Sales metrics
    grossSales: number;
    taxableSales: number;
    exemptSales: number;
    transactionCount: number;

    // Physical presence
    employeeCount: number;
    employeeDays: number;  // Work days in jurisdiction

    // Property
    propertyValue: number;
    inventoryValue: number;

    // Services
    servicesRevenue: number;
    servicesDays: number;

    // Payroll
    payrollAmount: number;
}

/**
 * Entity's nexus exposure in a jurisdiction
 */
export interface JurisdictionNexusExposure {
    jurisdictionCode: JurisdictionCode;
    jurisdictionName: string;

    // Current period metrics
    currentPeriod: PeriodActivity;

    // Trailing 12 months / calendar year metrics
    trailingMetrics: {
        grossSales: number;
        transactionCount: number;
        employeeDays: number;
        propertyValue: number;
    };

    // Nexus determination
    salesTaxNexus: {
        status: NexusStatus;
        factors: NexusFactorType[];
        salesThresholdPercent: number;    // % of threshold reached
        transactionThresholdPercent: number;
        establishedDate?: Date;
        expirationDate?: Date;  // If nexus expires after inactivity
    };

    incomeTaxNexus: {
        status: NexusStatus;
        factors: NexusFactorType[];
        apportionmentPercent?: number;
        establishedDate?: Date;
    };

    // Risk assessment
    riskScore: number;  // 0-100
    riskFactors: string[];

    // Compliance status
    isRegistered: boolean;
    registrationDate?: Date;
    registrationNumber?: string;
    isCompliant: boolean;
    lastFilingDate?: Date;
    nextFilingDue?: Date;

    // Estimated exposure
    estimatedTaxLiability?: number;
    estimatedPenalties?: number;
    estimatedInterest?: number;
}

/**
 * Complete nexus study for an entity
 */
export interface NexusStudy {
    id: string;
    entityId: string;
    entityName: string;

    // Study period
    studyPeriodStart: Date;
    studyPeriodEnd: Date;
    asOfDate: Date;

    // Jurisdiction exposures
    exposures: JurisdictionNexusExposure[];

    // Summary
    summary: {
        totalJurisdictions: number;
        nexusEstablished: number;
        nexusApproaching: number;
        registeredJurisdictions: number;
        unregisteredWithNexus: number;
        totalEstimatedExposure: number;
    };

    // Recommendations
    recommendations: NexusRecommendation[];

    // Metadata
    preparedBy: string;
    preparedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    status: 'draft' | 'review' | 'final';
}

/**
 * Nexus recommendation
 */
export interface NexusRecommendation {
    jurisdictionCode: JurisdictionCode;
    priority: 'high' | 'medium' | 'low';
    recommendationType:
    | 'register'
    | 'deregister'
    | 'file_vda'      // Voluntary disclosure agreement
    | 'monitor'
    | 'restructure'
    | 'cease_activity';
    description: string;
    estimatedCost?: number;
    estimatedBenefit?: number;
    deadline?: Date;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

/**
 * Nexus threshold alert
 */
export interface NexusAlert {
    id: string;
    entityId: string;
    jurisdictionCode: JurisdictionCode;

    alertType:
    | 'threshold_approaching'  // 75% of threshold
    | 'threshold_breached'     // Nexus established
    | 'registration_required'
    | 'filing_due'
    | 'registration_expiring'
    | 'new_nexus_rule';

    severity: 'info' | 'warning' | 'critical';

    title: string;
    message: string;

    metrics?: {
        currentValue: number;
        thresholdValue: number;
        percentOfThreshold: number;
    };

    recommendedAction: string;
    actionDeadline?: Date;

    createdAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
}

// ============================================================================
// TRACKING EVENT TYPES
// ============================================================================

/**
 * Nexus-relevant business activity event
 */
export interface NexusActivityEvent {
    id: string;
    entityId: string;
    eventDate: Date;

    eventType:
    | 'sale'
    | 'employee_hire'
    | 'employee_travel'
    | 'property_acquisition'
    | 'inventory_storage'
    | 'service_delivery'
    | 'contract_signing'
    | 'trade_show'
    | 'affiliate_activity';

    jurisdictionCode: JurisdictionCode;

    // Event details
    amount?: number;
    description?: string;
    transactionId?: string;

    // Source tracking
    sourceSystem?: string;
    sourceId?: string;

    createdAt: Date;
}
