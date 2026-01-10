/**
 * Rwanda Chart of Accounts Generator
 * 
 * Generates IFRS-compliant chart of accounts for Rwanda entities.
 * Includes tax treatment mappings for VAT and RSSB.
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    ChartOfAccountsEntry,
    VATCategory,
    RwandaAccountingFramework,
} from '../types/index.js';

// ============================================================================
// STANDARD RWANDA CHART OF ACCOUNTS (IFRS-COMPLIANT)
// ============================================================================

/**
 * Standard IFRS-compliant chart of accounts for Rwanda.
 */
export const RWANDA_CHART_OF_ACCOUNTS: ChartOfAccountsEntry[] = [
    // =========================================================================
    // 1000 - ASSETS
    // =========================================================================

    // Current Assets
    { code: '1000', name: 'Assets', type: 'ASSET', ifrsCategory: 'Assets', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1100', name: 'Current Assets', type: 'ASSET', parentCode: '1000', ifrsCategory: 'Current Assets', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET', parentCode: '1100', ifrsCategory: 'IAS 7', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1111', name: 'Cash on Hand (RWF)', type: 'ASSET', parentCode: '1110', ifrsCategory: 'IAS 7', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1112', name: 'Bank Accounts (RWF)', type: 'ASSET', parentCode: '1110', ifrsCategory: 'IAS 7', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1113', name: 'Bank Accounts (USD)', type: 'ASSET', parentCode: '1110', ifrsCategory: 'IAS 7 / IAS 21', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1114', name: 'Mobile Money (MTN/Airtel)', type: 'ASSET', parentCode: '1110', ifrsCategory: 'IAS 7', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    { code: '1120', name: 'Trade Receivables', type: 'ASSET', parentCode: '1100', ifrsCategory: 'IFRS 9', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1121', name: 'Accounts Receivable - Local', type: 'ASSET', parentCode: '1120', ifrsCategory: 'IFRS 9', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1122', name: 'Accounts Receivable - EAC', type: 'ASSET', parentCode: '1120', ifrsCategory: 'IFRS 9', taxTreatment: 'ZERO_RATED', currency: 'RWF', isActive: true },
    { code: '1123', name: 'Accounts Receivable - AfCFTA', type: 'ASSET', parentCode: '1120', ifrsCategory: 'IFRS 9', taxTreatment: 'ZERO_RATED', currency: 'RWF', isActive: true },
    { code: '1125', name: 'Allowance for ECL', type: 'ASSET', parentCode: '1120', ifrsCategory: 'IFRS 9', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    { code: '1130', name: 'Inventories', type: 'ASSET', parentCode: '1100', ifrsCategory: 'IAS 2', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1131', name: 'Raw Materials', type: 'ASSET', parentCode: '1130', ifrsCategory: 'IAS 2', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1132', name: 'Work in Progress', type: 'ASSET', parentCode: '1130', ifrsCategory: 'IAS 2', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1133', name: 'Finished Goods', type: 'ASSET', parentCode: '1130', ifrsCategory: 'IAS 2', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    { code: '1140', name: 'Prepayments', type: 'ASSET', parentCode: '1100', ifrsCategory: 'IAS 1', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1141', name: 'Prepaid Insurance', type: 'ASSET', parentCode: '1140', ifrsCategory: 'IAS 1', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '1142', name: 'Prepaid Rent', type: 'ASSET', parentCode: '1140', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    { code: '1150', name: 'VAT Receivable', type: 'ASSET', parentCode: '1100', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1151', name: 'Input VAT', type: 'ASSET', parentCode: '1150', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1152', name: 'VAT Refund Receivable', type: 'ASSET', parentCode: '1150', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // Non-Current Assets
    { code: '1200', name: 'Non-Current Assets', type: 'ASSET', parentCode: '1000', ifrsCategory: 'Non-current Assets', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1210', name: 'Property, Plant and Equipment', type: 'ASSET', parentCode: '1200', ifrsCategory: 'IAS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1211', name: 'Land', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '1212', name: 'Buildings', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1213', name: 'Machinery and Equipment', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1214', name: 'Motor Vehicles', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1215', name: 'Furniture and Fixtures', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1216', name: 'Computer Equipment', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1219', name: 'Accumulated Depreciation', type: 'ASSET', parentCode: '1210', ifrsCategory: 'IAS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    { code: '1220', name: 'Intangible Assets', type: 'ASSET', parentCode: '1200', ifrsCategory: 'IAS 38', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '1221', name: 'Software', type: 'ASSET', parentCode: '1220', ifrsCategory: 'IAS 38', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '1222', name: 'Licenses and Patents', type: 'ASSET', parentCode: '1220', ifrsCategory: 'IAS 38', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    { code: '1230', name: 'Right-of-Use Assets', type: 'ASSET', parentCode: '1200', ifrsCategory: 'IFRS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // =========================================================================
    // 2000 - LIABILITIES
    // =========================================================================

    { code: '2000', name: 'Liabilities', type: 'LIABILITY', ifrsCategory: 'Liabilities', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // Current Liabilities
    { code: '2100', name: 'Current Liabilities', type: 'LIABILITY', parentCode: '2000', ifrsCategory: 'Current Liabilities', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2110', name: 'Trade Payables', type: 'LIABILITY', parentCode: '2100', ifrsCategory: 'IAS 1', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2111', name: 'Accounts Payable - Local', type: 'LIABILITY', parentCode: '2110', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '2112', name: 'Accounts Payable - EAC', type: 'LIABILITY', parentCode: '2110', ifrsCategory: 'IAS 1', taxTreatment: 'ZERO_RATED', currency: 'RWF', isActive: true },

    { code: '2120', name: 'Accrued Expenses', type: 'LIABILITY', parentCode: '2100', ifrsCategory: 'IAS 1', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2121', name: 'Accrued Salaries', type: 'LIABILITY', parentCode: '2120', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2122', name: 'Accrued Utilities', type: 'LIABILITY', parentCode: '2120', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    // Tax Payables
    { code: '2130', name: 'Tax Payables', type: 'LIABILITY', parentCode: '2100', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2131', name: 'VAT Payable (Output VAT)', type: 'LIABILITY', parentCode: '2130', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2132', name: 'PAYE Payable', type: 'LIABILITY', parentCode: '2130', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2133', name: 'Withholding Tax Payable', type: 'LIABILITY', parentCode: '2130', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2134', name: 'CIT Payable', type: 'LIABILITY', parentCode: '2130', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2135', name: 'Digital Services Tax Payable', type: 'LIABILITY', parentCode: '2130', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // RSSB Payables
    { code: '2140', name: 'RSSB Payables', type: 'LIABILITY', parentCode: '2100', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2141', name: 'RSSB Pension - Employer', type: 'LIABILITY', parentCode: '2140', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2142', name: 'RSSB Pension - Employee', type: 'LIABILITY', parentCode: '2140', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2143', name: 'RSSB Occupational Hazards', type: 'LIABILITY', parentCode: '2140', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2144', name: 'RSSB Maternity Benefit', type: 'LIABILITY', parentCode: '2140', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    { code: '2150', name: 'Short-term Borrowings', type: 'LIABILITY', parentCode: '2100', ifrsCategory: 'IFRS 9', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2160', name: 'Lease Liabilities - Current', type: 'LIABILITY', parentCode: '2100', ifrsCategory: 'IFRS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // Non-Current Liabilities
    { code: '2200', name: 'Non-Current Liabilities', type: 'LIABILITY', parentCode: '2000', ifrsCategory: 'Non-current Liabilities', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2210', name: 'Long-term Borrowings', type: 'LIABILITY', parentCode: '2200', ifrsCategory: 'IFRS 9', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2220', name: 'Deferred Tax Liabilities', type: 'LIABILITY', parentCode: '2200', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2230', name: 'Lease Liabilities - Non-Current', type: 'LIABILITY', parentCode: '2200', ifrsCategory: 'IFRS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '2240', name: 'Provisions', type: 'LIABILITY', parentCode: '2200', ifrsCategory: 'IAS 37', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // =========================================================================
    // 3000 - EQUITY
    // =========================================================================

    { code: '3000', name: 'Equity', type: 'EQUITY', ifrsCategory: 'Equity', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '3100', name: 'Share Capital', type: 'EQUITY', parentCode: '3000', ifrsCategory: 'IAS 32', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '3200', name: 'Share Premium', type: 'EQUITY', parentCode: '3000', ifrsCategory: 'IAS 32', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '3300', name: 'Retained Earnings', type: 'EQUITY', parentCode: '3000', ifrsCategory: 'IAS 1', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '3400', name: 'Other Reserves', type: 'EQUITY', parentCode: '3000', ifrsCategory: 'IAS 1', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '3410', name: 'Foreign Currency Translation Reserve', type: 'EQUITY', parentCode: '3400', ifrsCategory: 'IAS 21', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '3420', name: 'Revaluation Reserve', type: 'EQUITY', parentCode: '3400', ifrsCategory: 'IAS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // =========================================================================
    // 4000 - INCOME
    // =========================================================================

    { code: '4000', name: 'Income', type: 'INCOME', ifrsCategory: 'Income', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '4100', name: 'Revenue from Contracts', type: 'INCOME', parentCode: '4000', ifrsCategory: 'IFRS 15', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '4110', name: 'Sales - Local', type: 'INCOME', parentCode: '4100', ifrsCategory: 'IFRS 15', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '4120', name: 'Sales - EAC Exports', type: 'INCOME', parentCode: '4100', ifrsCategory: 'IFRS 15', taxTreatment: 'ZERO_RATED', currency: 'RWF', isActive: true },
    { code: '4130', name: 'Sales - AfCFTA Exports', type: 'INCOME', parentCode: '4100', ifrsCategory: 'IFRS 15', taxTreatment: 'ZERO_RATED', currency: 'RWF', isActive: true },
    { code: '4140', name: 'Sales - Other Exports', type: 'INCOME', parentCode: '4100', ifrsCategory: 'IFRS 15', taxTreatment: 'ZERO_RATED', currency: 'RWF', isActive: true },
    { code: '4150', name: 'Service Revenue', type: 'INCOME', parentCode: '4100', ifrsCategory: 'IFRS 15', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    { code: '4200', name: 'Other Operating Income', type: 'INCOME', parentCode: '4000', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '4300', name: 'Finance Income', type: 'INCOME', parentCode: '4000', ifrsCategory: 'IFRS 9', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '4310', name: 'Interest Income', type: 'INCOME', parentCode: '4300', ifrsCategory: 'IFRS 9', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '4320', name: 'Foreign Exchange Gains', type: 'INCOME', parentCode: '4300', ifrsCategory: 'IAS 21', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // =========================================================================
    // 5000 - EXPENSES
    // =========================================================================

    { code: '5000', name: 'Expenses', type: 'EXPENSE', ifrsCategory: 'Expenses', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // Cost of Sales
    { code: '5100', name: 'Cost of Sales', type: 'EXPENSE', parentCode: '5000', ifrsCategory: 'IAS 2', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5110', name: 'Direct Materials', type: 'EXPENSE', parentCode: '5100', ifrsCategory: 'IAS 2', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5120', name: 'Direct Labor', type: 'EXPENSE', parentCode: '5100', ifrsCategory: 'IAS 2', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5130', name: 'Manufacturing Overhead', type: 'EXPENSE', parentCode: '5100', ifrsCategory: 'IAS 2', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    // Employee Costs
    { code: '5200', name: 'Employee Costs', type: 'EXPENSE', parentCode: '5000', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5210', name: 'Salaries and Wages', type: 'EXPENSE', parentCode: '5200', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5220', name: 'RSSB Pension - Employer Contribution', type: 'EXPENSE', parentCode: '5200', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5221', name: 'RSSB Occupational Hazards', type: 'EXPENSE', parentCode: '5200', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5222', name: 'RSSB Maternity Benefit', type: 'EXPENSE', parentCode: '5200', ifrsCategory: 'IAS 19', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5230', name: 'Staff Training', type: 'EXPENSE', parentCode: '5200', ifrsCategory: 'IAS 19', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5240', name: 'Staff Welfare', type: 'EXPENSE', parentCode: '5200', ifrsCategory: 'IAS 19', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    // Operating Expenses
    { code: '5300', name: 'Operating Expenses', type: 'EXPENSE', parentCode: '5000', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5310', name: 'Rent Expense', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IFRS 16', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5320', name: 'Utilities', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5330', name: 'Insurance', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '5340', name: 'Professional Fees', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5350', name: 'Communication', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5360', name: 'Travel and Transport', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5370', name: 'Office Supplies', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },
    { code: '5380', name: 'Marketing and Advertising', type: 'EXPENSE', parentCode: '5300', ifrsCategory: 'IAS 1', taxTreatment: 'STANDARD', currency: 'RWF', isActive: true },

    // Depreciation and Amortization
    { code: '5400', name: 'Depreciation and Amortization', type: 'EXPENSE', parentCode: '5000', ifrsCategory: 'IAS 16 / IAS 38', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5410', name: 'Depreciation - Buildings', type: 'EXPENSE', parentCode: '5400', ifrsCategory: 'IAS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5420', name: 'Depreciation - Equipment', type: 'EXPENSE', parentCode: '5400', ifrsCategory: 'IAS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5430', name: 'Depreciation - Vehicles', type: 'EXPENSE', parentCode: '5400', ifrsCategory: 'IAS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5440', name: 'Amortization - Intangibles', type: 'EXPENSE', parentCode: '5400', ifrsCategory: 'IAS 38', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5450', name: 'Depreciation - Right-of-Use', type: 'EXPENSE', parentCode: '5400', ifrsCategory: 'IFRS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // Finance Costs
    { code: '5500', name: 'Finance Costs', type: 'EXPENSE', parentCode: '5000', ifrsCategory: 'IFRS 9', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5510', name: 'Interest Expense', type: 'EXPENSE', parentCode: '5500', ifrsCategory: 'IFRS 9', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '5520', name: 'Bank Charges', type: 'EXPENSE', parentCode: '5500', ifrsCategory: 'IFRS 9', taxTreatment: 'EXEMPT', currency: 'RWF', isActive: true },
    { code: '5530', name: 'Foreign Exchange Losses', type: 'EXPENSE', parentCode: '5500', ifrsCategory: 'IAS 21', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5540', name: 'Interest on Lease Liabilities', type: 'EXPENSE', parentCode: '5500', ifrsCategory: 'IFRS 16', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },

    // Tax Expense
    { code: '5600', name: 'Tax Expense', type: 'EXPENSE', parentCode: '5000', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5610', name: 'Current Tax Expense', type: 'EXPENSE', parentCode: '5600', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
    { code: '5620', name: 'Deferred Tax Expense', type: 'EXPENSE', parentCode: '5600', ifrsCategory: 'IAS 12', taxTreatment: 'NOT_APPLICABLE', currency: 'RWF', isActive: true },
];

// ============================================================================
// CHART OF ACCOUNTS GENERATOR
// ============================================================================

/**
 * Chart of Accounts Generator for Rwanda entities.
 */
export class ChartOfAccountsGenerator {
    private static instance_: ChartOfAccountsGenerator | null = null;

    readonly agentId = 'rwanda-coa-generator';
    readonly name = 'Rwanda Chart of Accounts Generator';
    readonly version = '1.0.0';

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): ChartOfAccountsGenerator {
        if (!ChartOfAccountsGenerator.instance_) {
            ChartOfAccountsGenerator.instance_ = new ChartOfAccountsGenerator();
        }
        return ChartOfAccountsGenerator.instance_;
    }

    /**
     * Get full chart of accounts.
     */
    getFullChartOfAccounts(): ChartOfAccountsEntry[] {
        return [...RWANDA_CHART_OF_ACCOUNTS];
    }

    /**
     * Get chart of accounts for specific framework.
     */
    getForFramework(framework: RwandaAccountingFramework): ChartOfAccountsEntry[] {
        // Full IFRS and IFRS for SMEs use same chart
        // IPSAS would need different mapping (not implemented yet)
        if (framework === 'IPSAS') {
            // TODO: Implement IPSAS-specific chart
            return this.getFullChartOfAccounts();
        }
        return this.getFullChartOfAccounts();
    }

    /**
     * Get accounts by type.
     */
    getAccountsByType(type: ChartOfAccountsEntry['type']): ChartOfAccountsEntry[] {
        return RWANDA_CHART_OF_ACCOUNTS.filter(a => a.type === type);
    }

    /**
     * Get accounts by VAT treatment.
     */
    getAccountsByVATTreatment(treatment: VATCategory): ChartOfAccountsEntry[] {
        return RWANDA_CHART_OF_ACCOUNTS.filter(a => a.taxTreatment === treatment);
    }

    /**
     * Get account by code.
     */
    getAccountByCode(code: string): ChartOfAccountsEntry | undefined {
        return RWANDA_CHART_OF_ACCOUNTS.find(a => a.code === code);
    }

    /**
     * Get child accounts of a parent.
     */
    getChildAccounts(parentCode: string): ChartOfAccountsEntry[] {
        return RWANDA_CHART_OF_ACCOUNTS.filter(a => a.parentCode === parentCode);
    }

    /**
     * Get RSSB-related accounts.
     */
    getRSSBAccounts(): ChartOfAccountsEntry[] {
        return RWANDA_CHART_OF_ACCOUNTS.filter(a =>
            a.code.startsWith('214') || // Liability accounts
            a.code.startsWith('522')    // Expense accounts
        );
    }

    /**
     * Get VAT-related accounts.
     */
    getVATAccounts(): ChartOfAccountsEntry[] {
        return RWANDA_CHART_OF_ACCOUNTS.filter(a =>
            a.code.startsWith('115') || // Input VAT assets
            a.code === '2131'           // Output VAT liability
        );
    }
}

/**
 * Factory function.
 */
export function createChartOfAccountsGenerator(): ChartOfAccountsGenerator {
    return ChartOfAccountsGenerator.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const chartOfAccountsGenerator = {
    instance: () => ChartOfAccountsGenerator.instance(),
};
