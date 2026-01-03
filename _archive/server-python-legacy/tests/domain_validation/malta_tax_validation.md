# Malta Tax Logic Validation Checklist

## Corporate Income Tax (CIT)

### Standard Rate
- [x] **35% CIT Rate**: Verified in `calculate_corporate_tax` tool
- [x] **Taxable Income Calculation**: Profit before tax + adjustments
- [x] **Deductions**: Capital allowances, exempt income properly deducted

### Malta Tax Refund System

#### Full Imputation System
- [x] **6/7 Refund (Trading Income)**: Implemented for standard trading income
- [x] **5/7 Refund (Passive Interest/Royalties)**: Implemented for passive income
- [x] **2/3 Refund (Foreign Tax Relief)**: Applied when foreign tax paid > 0

#### Effective Tax Rates
- Trading Income: 35% - (6/7 × 35%) = **5%**
- Passive Interest: 35% - (5/7 × 35%) = **10%**
- Double Tax Relief: 35% - (2/3 × 35%) = **11.67%**

### Participation Exemption

#### Eligibility Criteria (Verified)
- [x] **Equity Holding**: ≥5% equity OR ≥10% voting rights OR €1.164M value held for 183 days
- [x] **Anti-Abuse Provisions** (One of three):
  - EU/EEA residency
  - Foreign tax rate ≥15%
  - Active trading (not >50% passive income)

#### Implementation Status
- [x] Basic eligibility check implemented
- [x] EU country list validated
- [x] Tax rate threshold check (15%)
- [x] Trading activity flag

## Validation Results

### ✅ Passed
1. CIT calculation accuracy
2. Refund fraction calculations
3. Effective tax rate computations
4. Participation exemption logic

### ⚠️ Requires Expert Review
1. **Complex Scenarios**: Multi-tier holding structures
2. **Timing Rules**: 183-day holding period tracking
3. **Hybrid Instruments**: Treatment of convertible debt
4. **Transfer Pricing**: Arm's length principle application

### 📋 Recommended Enhancements
1. Add Malta Revenue Authority API integration
2. Implement advance tax ruling validation
3. Add notional interest deduction (NID) calculator
4. Include Malta holding company regime rules

## Expert Reviewer Notes

**Date**: _____________  
**Reviewer**: _____________  
**Firm**: _____________  

**Comments**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Approval**: [ ] Approved  [ ] Approved with modifications  [ ] Rejected
