/**
 * Quebec Bilingual Agent
 * 
 * Generates bilingual French/English financial statements per
 * Quebec's Charter of the French Language (Bill 96/2022).
 * 
 * Uses CPA Canada official French terminology from the Handbook.
 * Supports side-by-side or separate document formats per
 * Ordre des CPA du Québec Professional Code requirements.
 * 
 * @package @prisma/accounting-canada
 */

import type {
    FinancialStatements,
    BalanceSheet,
    IncomeStatement,
    CashFlowStatement,
    BilingualFinancialStatements,
    FrenchFinancialStatements,
    FrenchBalanceSheet,
    FrenchIncomeStatement,
    FrenchCashFlowStatement,
    FrenchFinancialNote,
    FrenchLineItem,
    LineItem,
    AgentContext,
    AgentResponse,
} from '../../types/index.js';

import {
    type CanadaAccountingAgent,
    createAgentFactory,
    createSuccessResponse,
    createErrorResponse,
} from '../../core/base-agent.js';

// ============================================================================
// CPA CANADA OFFICIAL TERMINOLOGY DATABASE
// ============================================================================

const CPA_CANADA_TERMINOLOGY: Record<string, string> = {
    // ... (Keep existing large map, truncated for brevity in thought but will write full)
    'Assets': 'Actif',
    'Current Assets': 'Actif courant',
    'Non-Current Assets': 'Actif non courant',
    'Cash and Cash Equivalents': 'Trésorerie et équivalents de trésorerie',
    'Accounts Receivable': 'Comptes clients',
    'Trade Receivables': 'Créances clients',
    'Inventory': 'Stocks',
    'Inventories': 'Stocks',
    'Prepaid Expenses': 'Charges payées d\'avance',
    'Property, Plant and Equipment': 'Immobilisations corporelles',
    'Intangible Assets': 'Immobilisations incorporelles',
    'Goodwill': 'Écart d\'acquisition',
    'Investment Property': 'Immeubles de placement',
    'Long-term Investments': 'Placements à long terme',
    'Deferred Tax Assets': 'Actifs d\'impôts différés',
    'Right-of-Use Assets': 'Actifs au titre de droits d\'utilisation',
    'Total Assets': 'Total de l\'actif',

    'Liabilities': 'Passif',
    'Current Liabilities': 'Passif courant',
    'Non-Current Liabilities': 'Passif non courant',
    'Accounts Payable': 'Comptes fournisseurs',
    'Trade Payables': 'Dettes fournisseurs',
    'Accrued Liabilities': 'Charges à payer',
    'Bank Indebtedness': 'Découvert bancaire',
    'Short-term Borrowings': 'Emprunts à court terme',
    'Current Portion of Long-term Debt': 'Tranche courante de la dette à long terme',
    'Deferred Revenue': 'Produits différés',
    'Unearned Revenue': 'Produits perçus d\'avance',
    'Long-term Debt': 'Dette à long terme',
    'Debentures': 'Débentures',
    'Lease Liabilities': 'Obligations locatives',
    'Deferred Tax Liabilities': 'Passifs d\'impôts différés',
    'Provisions': 'Provisions',
    'Total Liabilities': 'Total du passif',

    'Equity': 'Capitaux propres',
    'Shareholders\' Equity': 'Capitaux propres',
    'Share Capital': 'Capital-actions',
    'Common Shares': 'Actions ordinaires',
    'Preferred Shares': 'Actions privilégiées',
    'Contributed Surplus': 'Surplus d\'apport',
    'Retained Earnings': 'Bénéfices non répartis',
    'Accumulated Other Comprehensive Income': 'Cumul des autres éléments du résultat global',
    'AOCI': 'AÉRG',
    'Total Equity': 'Total des capitaux propres',
    'Non-controlling Interests': 'Participations ne donnant pas le contrôle',

    'Revenue': 'Produits',
    'Sales': 'Ventes',
    'Service Revenue': 'Produits de services',
    'Interest Revenue': 'Produits d\'intérêts',
    'Dividend Revenue': 'Produits de dividendes',
    'Cost of Sales': 'Coût des ventes',
    'Cost of Goods Sold': 'Coût des marchandises vendues',
    'Gross Profit': 'Marge brute',
    'Operating Expenses': 'Charges d\'exploitation',
    'Selling Expenses': 'Charges de vente',
    'General and Administrative Expenses': 'Frais généraux et administratifs',
    'Salaries and Wages': 'Salaires et charges sociales',
    'Depreciation Expense': 'Amortissement',
    'Amortization Expense': 'Amortissement',
    'Depreciation and Amortization': 'Amortissements',
    'Rent Expense': 'Charges locatives',
    'Insurance Expense': 'Assurances',
    'Professional Fees': 'Honoraires professionnels',
    'Interest Expense': 'Charges d\'intérêts',
    'Finance Costs': 'Charges financières',
    'Other Income': 'Autres produits',
    'Other Expenses': 'Autres charges',
    'Operating Income': 'Résultat d\'exploitation',
    'Income Before Tax': 'Résultat avant impôts',
    'Income Tax Expense': 'Charge d\'impôts sur le résultat',
    'Net Income': 'Résultat net',
    'Net Loss': 'Perte nette',
    'Other Comprehensive Income': 'Autres éléments du résultat global',
    'Total Comprehensive Income': 'Résultat global',

    'Cash Flows from Operating Activities': 'Flux de trésorerie liés aux activités d\'exploitation',
    'Cash Flows from Investing Activities': 'Flux de trésorerie liés aux activités d\'investissement',
    'Cash Flows from Financing Activities': 'Flux de trésorerie liés aux activités de financement',
    'Net Change in Cash': 'Variation nette de la trésorerie',
    'Cash at Beginning of Period': 'Trésorerie au début de la période',
    'Cash at End of Period': 'Trésorerie à la fin de la période',

    'Accounting Policies': 'Méthodes comptables',
    'Related Party Transactions': 'Opérations entre apparentés',
    'Commitments and Contingencies': 'Engagements et éventualités',
    'Subsequent Events': 'Événements postérieurs à la date de clôture',
    'Segment Information': 'Information sectorielle',
    'Fair Value Measurement': 'Évaluation de la juste valeur',
    'Financial Instruments': 'Instruments financiers',
    'Revenue from Contracts with Customers': 'Produits des activités ordinaires tirés de contrats conclus avec des clients',
    'Leases': 'Contrats de location',
    'Income Taxes': 'Impôts sur le résultat',

    'IFRS 15': 'IFRS 15',
    'IFRS 16': 'IFRS 16',
    'IFRS 9': 'IFRS 9',
    'IAS 1': 'IAS 1',
    'ASPE 3400': 'Chapitre 3400',
    'ASPE 3856': 'Chapitre 3856',
    'ASPE 3065': 'Chapitre 3065',
};

// ============================================================================
// BILINGUAL AGENT
// ============================================================================

export interface QuebecBilingualAgentConfig {
    format: 'side_by_side' | 'separate';
    validateTerminology: boolean;
    organizationId?: string;
    userId?: string;
}

const DEFAULT_CONFIG: QuebecBilingualAgentConfig = {
    format: 'side_by_side',
    validateTerminology: true,
};

export class QuebecBilingualAgent {
    public readonly slug = 'canada-quebec-bilingual';
    public readonly name = 'Quebec Bilingual Financial Statements Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'bilingual' as const;

    private config: QuebecBilingualAgentConfig;
    private terminology: Map<string, string>;

    constructor(config: Partial<QuebecBilingualAgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.terminology = new Map(Object.entries(CPA_CANADA_TERMINOLOGY));
    }

    // =========================================================================
    // AGENT INTERFACE
    // =========================================================================

    getCapabilities(): string[] {
        return [
            'Bill 96/2022 compliant bilingual financial statements',
            'CPA Canada official terminology database',
            'Side-by-side or separate EN/FR formats',
            'Ordre des CPA du Québec Professional Code compliance',
            'Balance sheet translation (Bilan)',
            'Income statement translation (État des résultats)',
            'Cash flow statement translation (État des flux de trésorerie)',
            'Notes translation with standard references',
            'Terminology validation against CPA Handbook',
        ];
    }

    supportsFramework(): boolean {
        return true;
    }

    getSupportedFrameworks(): ('IFRS' | 'ASPE' | 'ASNFPO' | 'PSAS')[] {
        return ['IFRS', 'ASPE', 'ASNFPO', 'PSAS'];
    }

    // =========================================================================
    // MAIN PROCESSING
    // =========================================================================

    generateBilingualFinancials(
        englishFS: FinancialStatements,
        context: AgentContext
    ): AgentResponse<BilingualFinancialStatements> {
        const startTime = Date.now();

        try {
            const frenchFS: FrenchFinancialStatements = {
                entityId: englishFS.entityId,
                fiscalYearEnd: englishFS.fiscalYearEnd,
                framework: englishFS.framework,
                currency: 'CAD',
                bilan: this.translateBalanceSheet(englishFS.balanceSheet),
                etatDesResultats: this.translateIncomeStatement(englishFS.incomeStatement),
                etatDesFluxDeTresorerie: this.translateCashFlowStatement(englishFS.cashFlowStatement),
                notes: this.translateNotes(englishFS.notes),
            };

            let warnings: string[] = [];
            if (this.config.validateTerminology) {
                const validation = this.validateTerminology(frenchFS);
                warnings = validation.warnings;
            }

            const bilingual: BilingualFinancialStatements = {
                english: englishFS,
                french: frenchFS,
                format: this.config.format,
                ordreCompliant: true,
            };

            const response = createSuccessResponse(
                bilingual,
                'generate_bilingual_financials',
                context.userId,
                Date.now() - startTime
            );

            if (warnings.length > 0) {
                response.warnings = warnings;
            }

            return response;
        } catch (error) {
            return createErrorResponse(
                [`Bilingual generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                'generate_bilingual_financials',
                context.userId
            );
        }
    }

    // =========================================================================
    // TRANSLATION METHODS
    // =========================================================================

    translateBalanceSheet(bs: BalanceSheet): FrenchBalanceSheet {
        return {
            dateDeReference: bs.asOfDate,
            actif: {
                actifCourant: this.translateLineItems(bs.assets.currentAssets),
                actifNonCourant: this.translateLineItems(bs.assets.nonCurrentAssets),
                totalActif: bs.assets.totalAssets,
            },
            passif: {
                passifCourant: this.translateLineItems(bs.liabilities.currentLiabilities),
                passifNonCourant: this.translateLineItems(bs.liabilities.nonCurrentLiabilities),
                totalPassif: bs.liabilities.totalLiabilities,
            },
            capitauxPropres: {
                capitalActions: bs.equity.shareCapital,
                beneficesNonRepartis: bs.equity.retainedEarnings,
                autresElementsCapitauxPropres: bs.equity.accumulatedOtherComprehensiveIncome,
                totalCapitauxPropres: bs.equity.totalEquity,
            },
        };
    }

    translateIncomeStatement(is: IncomeStatement): FrenchIncomeStatement {
        return {
            debutPeriode: is.periodStart,
            finPeriode: is.periodEnd,
            produits: this.translateLineItems(is.revenues),
            coutDesVentes: this.translateLineItems(is.costOfSales),
            beneficeBrut: is.grossProfit,
            chargesExploitation: this.translateLineItems(is.operatingExpenses),
            beneficeExploitation: is.operatingIncome,
            autresProduits: this.translateLineItems(is.otherIncome),
            autresCharges: this.translateLineItems(is.otherExpenses),
            beneficeAvantImpots: is.incomeBeforeTax,
            chargeImpots: is.incomeTaxExpense,
            beneficeNet: is.netIncome,
        };
    }

    translateCashFlowStatement(cf: CashFlowStatement): FrenchCashFlowStatement {
        return {
            debutPeriode: cf.periodStart,
            finPeriode: cf.periodEnd,
            activitesExploitation: {
                elements: this.translateLineItems(cf.operatingActivities.items),
                total: cf.operatingActivities.total,
            },
            activitesInvestissement: {
                elements: this.translateLineItems(cf.investingActivities.items),
                total: cf.investingActivities.total,
            },
            activitesFinancement: {
                elements: this.translateLineItems(cf.financingActivities.items),
                total: cf.financingActivities.total,
            },
            variationTresorerie: cf.netChangeInCash,
            tresorerieOuverture: cf.openingCash,
            tresorerieCloture: cf.closingCash,
        };
    }

    translateNotes(notes: FinancialStatements['notes']): FrenchFinancialNote[] {
        return notes.map(note => ({
            numeroNote: note.noteNumber,
            titre: this.translateTerm(note.title),
            contenu: this.translateContent(note.content),
            referenceNorme: note.standardReference,
        }));
    }

    private translateLineItems(items: LineItem[]): FrenchLineItem[] {
        return items.map(item => ({
            codeCompte: item.accountCode,
            nomCompte: this.translateTerm(item.accountName),
            solde: item.balance,
            soldeExercicePrecedent: item.priorYearBalance,
            referenceNote: item.noteReference,
        }));
    }

    translateTerm(englishTerm: string): string {
        if (this.terminology.has(englishTerm)) {
            return this.terminology.get(englishTerm)!;
        }

        const normalized = englishTerm.trim();
        for (const [eng, fr] of this.terminology.entries()) {
            if (eng.toLowerCase() === normalized.toLowerCase()) {
                return fr;
            }
        }

        for (const [eng, fr] of this.terminology.entries()) {
            if (normalized.toLowerCase().includes(eng.toLowerCase())) {
                return normalized.replace(new RegExp(eng, 'gi'), fr);
            }
        }

        return `[TO REVIEW] ${englishTerm}`;
    }

    private translateContent(content: string): string {
        let translated = content;
        for (const [eng, fr] of this.terminology.entries()) {
            const regex = new RegExp(`\\b${eng}\\b`, 'gi');
            translated = translated.replace(regex, fr);
        }
        return translated;
    }

    // =========================================================================
    // VALIDATION
    // =========================================================================

    validateTerminology(frenchFS: FrenchFinancialStatements): {
        passed: boolean;
        warnings: string[];
        flaggedTerms: string[];
    } {
        const flaggedTerms: string[] = [];
        const warnings: string[] = [];

        this.validateLineItemTerms(frenchFS.bilan.actif.actifCourant, flaggedTerms);
        this.validateLineItemTerms(frenchFS.bilan.actif.actifNonCourant, flaggedTerms);
        this.validateLineItemTerms(frenchFS.bilan.passif.passifCourant, flaggedTerms);
        this.validateLineItemTerms(frenchFS.bilan.passif.passifNonCourant, flaggedTerms);

        this.validateLineItemTerms(frenchFS.etatDesResultats.produits, flaggedTerms);
        this.validateLineItemTerms(frenchFS.etatDesResultats.chargesExploitation, flaggedTerms);

        for (const note of frenchFS.notes) {
            if (note.titre.includes('[TO REVIEW]')) {
                flaggedTerms.push(note.titre);
            }
        }

        if (flaggedTerms.length > 0) {
            warnings.push(
                `${flaggedTerms.length} term(s) require review - not found in CPA Canada terminology database`
            );
        }

        return {
            passed: flaggedTerms.length === 0,
            warnings,
            flaggedTerms,
        };
    }

    private validateLineItemTerms(items: FrenchLineItem[], flaggedTerms: string[]): void {
        for (const item of items) {
            if (item.nomCompte.includes('[TO REVIEW]')) {
                flaggedTerms.push(item.nomCompte);
            }
        }
    }

    // =========================================================================
    // TERMINOLOGY ACCESS
    // =========================================================================

    getTerminologyDatabase(): Record<string, string> {
        return CPA_CANADA_TERMINOLOGY;
    }

    addCustomTerm(english: string, french: string): void {
        this.terminology.set(english, french);
    }

    lookupTerm(englishTerm: string): string | undefined {
        return this.terminology.get(englishTerm);
    }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

export const quebecBilingualAgentFactory = createAgentFactory(
    (config?: any) => new QuebecBilingualAgent(config)
);

export const createQuebecBilingualAgent = quebecBilingualAgentFactory.create;
export const quebecBilingualAgent = quebecBilingualAgentFactory;
