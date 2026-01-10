# Rwanda Tax Agents

This directory contains Rwanda-specific autonomous AI tax agents that provide Big-4 level tax automation.

## Overview

Rwanda's tax system is administered by the Rwanda Revenue Authority (RRA) through the ISHEMA platform. These agents automate complex tax calculations, filing, and compliance workflows.

## Agents

### 1. VAT Agent (`vat-agent.ts`)

RRA-compliant VAT calculation and ISHEMA filing automation.

**Features:**
- 18% standard rate calculation
- Zero-rating for exports, EAC, AfCFTA supplies
- Exempt supplies (health, education, basic foodstuffs)
- EBM invoice sequence validation
- VAT return generation (ISHEMA format)
- Registration threshold monitoring (RWF 20M annual / RWF 5M quarterly)

**Usage:**
```typescript
import { RwandaVATAgent } from '@prisma/tax';

const agent = new RwandaVATAgent();

const result = agent.calculateVAT({
  netAmount: 100000,
  category: 'STANDARD',
});
// Result: 18% VAT = RWF 18,000
```

---

### 2. CIT Agent (`cit-agent.ts`)

Corporate Income Tax calculation with Rwanda incentives.

**Features:**
- 28% standard CIT rate (2024+)
- Listed company incentives (20% for 40%, 25% for 30% floated)
- Export-oriented incentives
- IFRS to tax reconciliation
- Quarterly provisional tax calculation
- Annual return preparation

**Usage:**
```typescript
import { RwandaCITAgent } from '@prisma/tax';

const agent = new RwandaCITAgent();

const result = agent.calculateCIT({
  taxableIncome: 50000000,
  entityType: 'standard',
  fiscalYear: 2026,
});
// Result: 28% CIT = RWF 14,000,000
```

---

### 3. PAYE Agent (`paye-agent.ts`)

Pay As You Earn calculation and monthly filing.

**Features:**
- Progressive PAYE rates (0%, 20%, 30%)
- Monthly calculation with annual cap
- RSSB contribution integration
- Monthly ISHEMA payroll declaration
- FS3 equivalent reporting

**Usage:**
```typescript
import { RwandaPAYEAgent } from '@prisma/tax';

const agent = new RwandaPAYEAgent();

const result = agent.calculateMonthlyPAYE({
  grossSalary: 500000,
  otherBenefits: 50000,
});
// Result: Progressive PAYE calculation
```

---

### 4. RSSB Agent (`rssb-agent.ts`)

Rwanda Social Security Board contributions.

**Features:**
- Pension contribution (6% employee + 6% employer = 12% in 2026)
- Occupational hazard levy (2% employer)
- Maternity contribution (0.3% employer)
- RSSB declaration preparation
- Transition to 20% pension by 2030

**Usage:**
```typescript
import { RwandaRSSBAgent } from '@prisma/tax';

const agent = new RwandaRSSBAgent();

const result = agent.calculateRSSB({
  grossSalary: 500000,
  year: 2026,
});
// Result: Employee 6%, Employer 8.3%
```

---

### 5. Withholding Tax Agent (`withholding-agent.ts`)

Withholding tax on services, dividends, and rent.

**Features:**
- 15% WHT on services
- 15% WHT on dividends  
- 15% WHT on rent
- Non-resident rates
- WHT declaration generation
- Treaty rate application

---

### 6. Transfer Pricing Agent (`transfer-pricing-agent.ts`)

EAC/OECD compliant transfer pricing documentation.

**Features:**
- Arm's length principle validation
- OECD methods (CUP, RPM, CPM, TNMM, PSM)
- Master File / Local File generation
- EAC regional considerations
- Risk assessment for RPT transactions

---

## Configuration

All agents support the following configuration:

```typescript
interface AgentConfig {
  openaiApiKey?: string;        // OpenAI API key for AI features
  rraEndpoint?: string;         // ISHEMA API endpoint
  environment?: 'production' | 'sandbox';
}
```

## Tax Rates (2026)

| Tax Type | Rate | Notes |
|----------|------|-------|
| VAT | 18% | Standard rate |
| CIT | 28% | Standard rate |
| CIT (Listed 40%) | 20% | Companies with 40%+ float |
| CIT (Listed 30%) | 25% | Companies with 30%+ float |
| PAYE | 0/20/30% | Progressive brackets |
| RSSB Pension | 12% | 6% employee + 6% employer |
| RSSB Hazard | 2% | Employer only |
| RSSB Maternity | 0.3% | Employer only |
| WHT Services | 15% | Residents |
| WHT Dividends | 15% | Standard |
| DST | 1.5% | Digital Services Tax |

## Legal References

- Tax Code Law 016/2018
- VAT Law (as amended)
- RSSB Law 003/2015
- EAC Customs Management Act
- RRA Regulations and Circulars

## Support

For questions about Rwanda tax legislation, consult RRA guidelines at www.rra.gov.rw or ICPAR.
