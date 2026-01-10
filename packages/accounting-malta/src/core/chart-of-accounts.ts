/**
 * Malta Chart of Accounts Generator
 * 
 * Generates a Chart of Accounts structure compatible with both GAPSME and IFRS.
 * Malta has no mandatory COA format, but this follows EU best practices.
 */

import {
    type Account,
    type AccountType,
    type AccountCategory,
    type ChartOfAccountsTemplate,
    GAPSME_MAPPINGS,
    IFRS_MAPPINGS,
    MALTA_COA_RANGES,
} from '../types/index.js';

// ============================================================================
// CHART OF ACCOUNTS GENERATOR
// ============================================================================

/**
 * Chart of Accounts generator for Malta companies.
 */
export class ChartOfAccountsGenerator {
    /**
     * Generate a standard Malta Chart of Accounts for a company.
     */
    generateStandardCOA(
        companyId: string,
        options: {
            framework?: 'GAPSME' | 'IFRS' | 'BOTH';
            industry?: string;
            includeSubaccounts?: boolean;
        } = {}
    ): Account[] {
        const { framework = 'BOTH', includeSubaccounts = true } = options;
        const accounts: Account[] = [];

        // Non-Current Assets
        accounts.push(...this.generateAssetAccounts(companyId, 'NON_CURRENT', includeSubaccounts));

        // Current Assets
        accounts.push(...this.generateAssetAccounts(companyId, 'CURRENT', includeSubaccounts));

        // Equity
        accounts.push(...this.generateEquityAccounts(companyId, includeSubaccounts));

        // Non-Current Liabilities
        accounts.push(...this.generateLiabilityAccounts(companyId, 'NON_CURRENT', includeSubaccounts));

        // Current Liabilities
        accounts.push(...this.generateLiabilityAccounts(companyId, 'CURRENT', includeSubaccounts));

        // Revenue
        accounts.push(...this.generateRevenueAccounts(companyId, includeSubaccounts));

        // Expenses
        accounts.push(...this.generateExpenseAccounts(companyId, includeSubaccounts));

        return accounts;
    }

    /**
     * Generate asset accounts.
     */
    private generateAssetAccounts(
        companyId: string,
        type: 'NON_CURRENT' | 'CURRENT',
        includeSubaccounts: boolean
    ): Account[] {
        const accounts: Account[] = [];

        if (type === 'NON_CURRENT') {
            // Property, Plant & Equipment
            accounts.push(this.createAccount(companyId, '1000', 'Property, Plant and Equipment', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1010', 'Land and Buildings', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
                accounts.push(this.createAccount(companyId, '1020', 'Plant and Machinery', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
                accounts.push(this.createAccount(companyId, '1030', 'Furniture and Fixtures', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
                accounts.push(this.createAccount(companyId, '1040', 'Motor Vehicles', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
                accounts.push(this.createAccount(companyId, '1050', 'Computer Equipment', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
                accounts.push(this.createAccount(companyId, '1099', 'Accumulated Depreciation - PPE', 'ASSET', 'PROPERTY_PLANT_EQUIPMENT'));
            }

            // Intangible Assets
            accounts.push(this.createAccount(companyId, '1100', 'Intangible Assets', 'ASSET', 'INTANGIBLE_ASSETS'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1110', 'Goodwill', 'ASSET', 'INTANGIBLE_ASSETS'));
                accounts.push(this.createAccount(companyId, '1120', 'Software and Licenses', 'ASSET', 'INTANGIBLE_ASSETS'));
                accounts.push(this.createAccount(companyId, '1130', 'Patents and Trademarks', 'ASSET', 'INTANGIBLE_ASSETS'));
                accounts.push(this.createAccount(companyId, '1149', 'Accumulated Amortization', 'ASSET', 'INTANGIBLE_ASSETS'));
            }

            // Investment Property
            accounts.push(this.createAccount(companyId, '1150', 'Investment Property', 'ASSET', 'INVESTMENT_PROPERTY'));

            // Financial Investments
            accounts.push(this.createAccount(companyId, '1180', 'Financial Investments', 'ASSET', 'FINANCIAL_INVESTMENTS'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1181', 'Investments in Subsidiaries', 'ASSET', 'FINANCIAL_INVESTMENTS'));
                accounts.push(this.createAccount(companyId, '1182', 'Investments in Associates', 'ASSET', 'FINANCIAL_INVESTMENTS'));
                accounts.push(this.createAccount(companyId, '1183', 'Other Investments', 'ASSET', 'FINANCIAL_INVESTMENTS'));
            }

            // Deferred Tax Assets
            accounts.push(this.createAccount(companyId, '1250', 'Deferred Tax Assets', 'ASSET', 'DEFERRED_TAX_ASSETS'));
        } else {
            // Inventory
            accounts.push(this.createAccount(companyId, '1500', 'Inventories', 'ASSET', 'INVENTORY'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1510', 'Raw Materials', 'ASSET', 'INVENTORY'));
                accounts.push(this.createAccount(companyId, '1520', 'Work in Progress', 'ASSET', 'INVENTORY'));
                accounts.push(this.createAccount(companyId, '1530', 'Finished Goods', 'ASSET', 'INVENTORY'));
                accounts.push(this.createAccount(companyId, '1549', 'Inventory Provisions', 'ASSET', 'INVENTORY'));
            }

            // Trade Receivables
            accounts.push(this.createAccount(companyId, '1550', 'Trade Receivables', 'ASSET', 'TRADE_RECEIVABLES'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1551', 'Trade Debtors', 'ASSET', 'TRADE_RECEIVABLES'));
                accounts.push(this.createAccount(companyId, '1559', 'Provision for Bad Debts', 'ASSET', 'TRADE_RECEIVABLES'));
            }

            // Other Receivables
            accounts.push(this.createAccount(companyId, '1600', 'Other Receivables', 'ASSET', 'OTHER_RECEIVABLES'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1610', 'VAT Receivable', 'ASSET', 'OTHER_RECEIVABLES'));
                accounts.push(this.createAccount(companyId, '1620', 'Staff Loans', 'ASSET', 'OTHER_RECEIVABLES'));
            }

            // Cash and Bank
            accounts.push(this.createAccount(companyId, '1650', 'Cash and Cash Equivalents', 'ASSET', 'CASH_AND_BANK'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1651', 'Petty Cash', 'ASSET', 'CASH_AND_BANK'));
                accounts.push(this.createAccount(companyId, '1660', 'Bank - Current Account', 'ASSET', 'CASH_AND_BANK'));
                accounts.push(this.createAccount(companyId, '1670', 'Bank - Savings Account', 'ASSET', 'CASH_AND_BANK'));
                accounts.push(this.createAccount(companyId, '1680', 'Bank - EUR Account', 'ASSET', 'CASH_AND_BANK'));
            }

            // Prepayments
            accounts.push(this.createAccount(companyId, '1700', 'Prepayments', 'ASSET', 'PREPAYMENTS'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '1710', 'Prepaid Insurance', 'ASSET', 'PREPAYMENTS'));
                accounts.push(this.createAccount(companyId, '1720', 'Prepaid Rent', 'ASSET', 'PREPAYMENTS'));
            }
        }

        return accounts;
    }

    /**
     * Generate equity accounts.
     */
    private generateEquityAccounts(companyId: string, includeSubaccounts: boolean): Account[] {
        const accounts: Account[] = [];

        // Share Capital
        accounts.push(this.createAccount(companyId, '2000', 'Share Capital', 'EQUITY', 'SHARE_CAPITAL', 'CREDIT'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '2010', 'Ordinary Shares', 'EQUITY', 'SHARE_CAPITAL', 'CREDIT'));
            accounts.push(this.createAccount(companyId, '2020', 'Preference Shares', 'EQUITY', 'SHARE_CAPITAL', 'CREDIT'));
        }

        // Share Premium
        accounts.push(this.createAccount(companyId, '2050', 'Share Premium', 'EQUITY', 'SHARE_PREMIUM', 'CREDIT'));

        // Revaluation Reserve
        accounts.push(this.createAccount(companyId, '2070', 'Revaluation Reserve', 'EQUITY', 'REVALUATION_RESERVE', 'CREDIT'));

        // Retained Earnings
        accounts.push(this.createAccount(companyId, '2090', 'Retained Earnings', 'EQUITY', 'RETAINED_EARNINGS', 'CREDIT'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '2091', 'Profit and Loss Account', 'EQUITY', 'RETAINED_EARNINGS', 'CREDIT'));
            accounts.push(this.createAccount(companyId, '2092', 'Dividends Declared', 'EQUITY', 'RETAINED_EARNINGS', 'DEBIT'));
        }

        // Other Reserves
        accounts.push(this.createAccount(companyId, '2150', 'Other Reserves', 'EQUITY', 'OTHER_RESERVES', 'CREDIT'));

        return accounts;
    }

    /**
     * Generate liability accounts.
     */
    private generateLiabilityAccounts(
        companyId: string,
        type: 'NON_CURRENT' | 'CURRENT',
        includeSubaccounts: boolean
    ): Account[] {
        const accounts: Account[] = [];

        if (type === 'NON_CURRENT') {
            // Long-Term Borrowings
            accounts.push(this.createAccount(companyId, '2300', 'Long-Term Borrowings', 'LIABILITY', 'LONG_TERM_BORROWINGS', 'CREDIT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '2310', 'Bank Loans (Long-Term)', 'LIABILITY', 'LONG_TERM_BORROWINGS', 'CREDIT'));
                accounts.push(this.createAccount(companyId, '2320', 'Shareholder Loans', 'LIABILITY', 'LONG_TERM_BORROWINGS', 'CREDIT'));
            }

            // Deferred Tax Liabilities
            accounts.push(this.createAccount(companyId, '2350', 'Deferred Tax Liabilities', 'LIABILITY', 'DEFERRED_TAX_LIABILITIES', 'CREDIT'));

            // Provisions
            accounts.push(this.createAccount(companyId, '2370', 'Provisions', 'LIABILITY', 'PROVISIONS', 'CREDIT'));

            // Lease Liabilities
            accounts.push(this.createAccount(companyId, '2400', 'Lease Liabilities (Long-Term)', 'LIABILITY', 'LEASE_LIABILITIES', 'CREDIT'));
        } else {
            // Trade Payables
            accounts.push(this.createAccount(companyId, '2600', 'Trade Payables', 'LIABILITY', 'TRADE_PAYABLES', 'CREDIT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '2610', 'Trade Creditors', 'LIABILITY', 'TRADE_PAYABLES', 'CREDIT'));
            }

            // Other Payables
            accounts.push(this.createAccount(companyId, '2650', 'Other Payables', 'LIABILITY', 'OTHER_PAYABLES', 'CREDIT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '2660', 'Salaries Payable', 'LIABILITY', 'OTHER_PAYABLES', 'CREDIT'));
                accounts.push(this.createAccount(companyId, '2670', 'Director Loans Payable', 'LIABILITY', 'OTHER_PAYABLES', 'CREDIT'));
            }

            // Tax Liabilities
            accounts.push(this.createAccount(companyId, '2700', 'Tax Liabilities', 'LIABILITY', 'TAX_LIABILITIES', 'CREDIT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '2710', 'VAT Payable', 'LIABILITY', 'TAX_LIABILITIES', 'CREDIT'));
                accounts.push(this.createAccount(companyId, '2720', 'Income Tax Payable', 'LIABILITY', 'TAX_LIABILITIES', 'CREDIT'));
                accounts.push(this.createAccount(companyId, '2730', 'PAYE/FSS Payable', 'LIABILITY', 'TAX_LIABILITIES', 'CREDIT'));
            }

            // Short-Term Borrowings
            accounts.push(this.createAccount(companyId, '2750', 'Short-Term Borrowings', 'LIABILITY', 'SHORT_TERM_BORROWINGS', 'CREDIT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '2760', 'Bank Overdraft', 'LIABILITY', 'SHORT_TERM_BORROWINGS', 'CREDIT'));
                accounts.push(this.createAccount(companyId, '2770', 'Current Portion of Long-Term Debt', 'LIABILITY', 'SHORT_TERM_BORROWINGS', 'CREDIT'));
            }

            // Accruals
            accounts.push(this.createAccount(companyId, '2800', 'Accruals', 'LIABILITY', 'ACCRUALS', 'CREDIT'));
            if (includeSubaccounts) {
                accounts.push(this.createAccount(companyId, '2810', 'Accrued Expenses', 'LIABILITY', 'ACCRUALS', 'CREDIT'));
                accounts.push(this.createAccount(companyId, '2820', 'Accrued Interest', 'LIABILITY', 'ACCRUALS', 'CREDIT'));
            }
        }

        return accounts;
    }

    /**
     * Generate revenue accounts.
     */
    private generateRevenueAccounts(companyId: string, includeSubaccounts: boolean): Account[] {
        const accounts: Account[] = [];

        // Sales Revenue
        accounts.push(this.createAccount(companyId, '3000', 'Sales Revenue', 'REVENUE', 'SALES_REVENUE', 'CREDIT'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '3010', 'Sales - Products', 'REVENUE', 'SALES_REVENUE', 'CREDIT'));
            accounts.push(this.createAccount(companyId, '3020', 'Sales - Export', 'REVENUE', 'SALES_REVENUE', 'CREDIT'));
            accounts.push(this.createAccount(companyId, '3090', 'Sales Returns and Allowances', 'REVENUE', 'SALES_REVENUE', 'DEBIT'));
        }

        // Service Revenue
        accounts.push(this.createAccount(companyId, '3200', 'Service Revenue', 'REVENUE', 'SERVICE_REVENUE', 'CREDIT'));

        // Other Income
        accounts.push(this.createAccount(companyId, '3400', 'Other Income', 'REVENUE', 'OTHER_INCOME', 'CREDIT'));

        // Finance Income
        accounts.push(this.createAccount(companyId, '3600', 'Finance Income', 'REVENUE', 'FINANCE_INCOME', 'CREDIT'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '3610', 'Interest Income', 'REVENUE', 'FINANCE_INCOME', 'CREDIT'));
            accounts.push(this.createAccount(companyId, '3620', 'Dividend Income', 'REVENUE', 'FINANCE_INCOME', 'CREDIT'));
        }

        return accounts;
    }

    /**
     * Generate expense accounts.
     */
    private generateExpenseAccounts(companyId: string, includeSubaccounts: boolean): Account[] {
        const accounts: Account[] = [];

        // Cost of Sales
        accounts.push(this.createAccount(companyId, '4000', 'Cost of Sales', 'EXPENSE', 'COST_OF_SALES'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '4100', 'Purchases', 'EXPENSE', 'DIRECT_MATERIALS'));
            accounts.push(this.createAccount(companyId, '4200', 'Direct Labour', 'EXPENSE', 'DIRECT_LABOR'));
            accounts.push(this.createAccount(companyId, '4300', 'Production Overheads', 'EXPENSE', 'PRODUCTION_OVERHEADS'));
        }

        // Administrative Expenses
        accounts.push(this.createAccount(companyId, '5000', 'Administrative Expenses', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '5100', 'Salaries and Wages', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5110', 'Directors Fees', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5120', 'Social Security Contributions', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5200', 'Rent', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5250', 'Utilities', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5300', 'Office Expenses', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5400', 'Professional Fees', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5410', 'Audit and Accounting Fees', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5420', 'Legal Fees', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5500', 'Insurance', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5550', 'Depreciation', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5560', 'Amortization', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5600', 'Bad Debts', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5700', 'Travel and Entertainment', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
            accounts.push(this.createAccount(companyId, '5800', 'IT and Telecommunications', 'EXPENSE', 'ADMINISTRATIVE_EXPENSES'));
        }

        // Distribution Expenses
        accounts.push(this.createAccount(companyId, '6000', 'Distribution Costs', 'EXPENSE', 'DISTRIBUTION_EXPENSES'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '6100', 'Marketing and Advertising', 'EXPENSE', 'DISTRIBUTION_EXPENSES'));
            accounts.push(this.createAccount(companyId, '6200', 'Shipping and Delivery', 'EXPENSE', 'DISTRIBUTION_EXPENSES'));
            accounts.push(this.createAccount(companyId, '6300', 'Sales Commissions', 'EXPENSE', 'DISTRIBUTION_EXPENSES'));
        }

        // Finance Costs
        accounts.push(this.createAccount(companyId, '7000', 'Finance Costs', 'EXPENSE', 'FINANCE_COSTS'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '7010', 'Interest Expense', 'EXPENSE', 'FINANCE_COSTS'));
            accounts.push(this.createAccount(companyId, '7020', 'Bank Charges', 'EXPENSE', 'FINANCE_COSTS'));
            accounts.push(this.createAccount(companyId, '7030', 'Foreign Exchange Loss', 'EXPENSE', 'FINANCE_COSTS'));
        }

        // Tax Expense
        accounts.push(this.createAccount(companyId, '7500', 'Tax Expense', 'EXPENSE', 'TAX_EXPENSE'));
        if (includeSubaccounts) {
            accounts.push(this.createAccount(companyId, '7510', 'Current Tax', 'EXPENSE', 'TAX_EXPENSE'));
            accounts.push(this.createAccount(companyId, '7520', 'Deferred Tax', 'EXPENSE', 'TAX_EXPENSE'));
        }

        return accounts;
    }

    /**
     * Create a single account with mappings.
     */
    private createAccount(
        companyId: string,
        accountNumber: string,
        accountName: string,
        accountType: AccountType,
        category: AccountCategory,
        normalBalance: 'DEBIT' | 'CREDIT' = 'DEBIT'
    ): Account {
        // Determine normal balance based on account type if not specified
        if (normalBalance === 'DEBIT' && (accountType === 'LIABILITY' || accountType === 'EQUITY' || accountType === 'REVENUE')) {
            normalBalance = 'CREDIT';
        }
        if (normalBalance === 'CREDIT' && (accountType === 'ASSET' || accountType === 'EXPENSE')) {
            normalBalance = 'DEBIT';
        }

        return {
            id: `${companyId}-${accountNumber}`,
            companyId,
            accountNumber,
            accountName,
            accountType,
            category,
            gapsmeMapping: GAPSME_MAPPINGS[category],
            ifrsMapping: IFRS_MAPPINGS[category],
            debitBalance: 0,
            creditBalance: 0,
            isActive: true,
            normalBalance,
        };
    }

    /**
     * Get account by number.
     */
    findAccount(accounts: Account[], accountNumber: string): Account | undefined {
        return accounts.find(a => a.accountNumber === accountNumber);
    }

    /**
     * Get accounts by type.
     */
    getAccountsByType(accounts: Account[], accountType: AccountType): Account[] {
        return accounts.filter(a => a.accountType === accountType);
    }

    /**
     * Get accounts by category.
     */
    getAccountsByCategory(accounts: Account[], category: AccountCategory): Account[] {
        return accounts.filter(a => a.category === category);
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Chart of Accounts Generator instance.
 */
export function createChartOfAccountsGenerator(): ChartOfAccountsGenerator {
    return new ChartOfAccountsGenerator();
}

/**
 * Default singleton instance.
 */
let _coaGenerator: ChartOfAccountsGenerator | null = null;

export const chartOfAccountsGenerator = {
    instance(): ChartOfAccountsGenerator {
        if (!_coaGenerator) {
            _coaGenerator = new ChartOfAccountsGenerator();
        }
        return _coaGenerator;
    },
};
