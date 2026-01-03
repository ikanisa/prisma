# Rwanda Tax Logic Validation Checklist

## Corporate Income Tax (CIT)

### Standard Rates
- [x] **30% Standard CIT Rate**: Verified in `calculate_rwanda_cit` tool
- [x] **Preferential Rates**: 15% for mining/export sectors (simplified)
- [x] **Taxable Profit**: Turnover - Deductible Expenses

### EAC (East African Community) Compliance

#### Member States (Verified)
- [x] **EAC Countries**: Rwanda (RW), Kenya (KE), Tanzania (TZ), Uganda (UG), Burundi (BI), South Sudan (SS), DR Congo (CD)
- [x] **Common Market Rules**: Zero-rated VAT for exports within EAC
- [x] **Withholding Tax**: 15% standard for services (subject to DTA reductions)

#### Common External Tariff (CET)
- [x] **Non-EAC Imports**: Subject to CET
- [x] **Compliance Notes**: Implemented basic checks

### Thin Capitalization Rules

#### Debt-to-Equity Ratio
- [x] **4:1 Limit**: Implemented in `assess_thin_cap` tool
- [x] **Interest Deductibility**: Excess interest disallowed
- [x] **Calculation**: Allowable interest = total interest × (4 / actual ratio)

#### Implementation Status
- [x] Ratio calculation
- [x] Allowable vs. disallowed interest split
- [x] Recommendations for capital structure optimization

## Validation Results

### ✅ Passed
1. CIT rate application (30% standard)
2. EAC member state identification
3. Thin capitalization calculations
4. Basic compliance checks

### ⚠️ Requires Expert Review
1. **Sector-Specific Incentives**: Special Economic Zones (SEZ), Export Processing Zones (EPZ)
2. **Transfer Pricing**: Rwanda Revenue Authority guidelines
3. **Minimum Tax**: 400M RWF turnover threshold and 5-year loss carryforward
4. **DTA Provisions**: Specific treaty benefits for EAC transactions

### 📋 Recommended Enhancements
1. Add Rwanda Revenue Authority (RRA) API integration
2. Implement tax incentive eligibility checker (SEZ, EPZ, etc.)
3. Add advance pricing agreement (APA) validator
4. Include VAT compliance for EAC cross-border transactions

## Expert Reviewer Notes

**Date**: _____________  
**Reviewer**: _____________  
**Firm**: _____________  

**Comments**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Approval**: [ ] Approved  [ ] Approved with modifications  [ ] Rejected
