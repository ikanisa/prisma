# Malta CFR e-Services Integration

Malta Commissioner for Revenue (CFR) e-Services integration client for automated tax filing and queries.

## Overview

This client provides programmatic access to Malta's CFR e-Services portal for:
- VAT return submission
- Corporate tax return filing
- Shareholder refund claims
- FITWI regime elections
- Intrastat declarations
- Account queries

## Configuration

```typescript
import { CFReServicesClient } from '@prisma/integrations';

const client = new CFReServicesClient({
  apiKey: process.env.CFR_API_KEY,
  certificatePath: '/path/to/certificate.p12',
  certificatePassword: process.env.CFR_CERT_PASSWORD,
  environment: 'sandbox', // or 'production'
});
```

### Environments

- `sandbox` - CFR test environment for development
- `production` - Live CFR e-Services

## Features

### VAT Return Submission

```typescript
const response = await client.submitVATReturn({
  vatNumber: 'MT12345678',
  periodStart: '2025-01-01',
  periodEnd: '2025-03-31',
  box1OutputVAT: 18000,
  box2InputVAT: 5000,
  box3NetVAT: 13000,
  intraEUSupplies: [...],
  intraEUAcquisitions: [...],
});
```

### Corporate Tax Return

```typescript
const response = await client.submitCorporateTaxReturn({
  companyTIN: '12345678M',
  fiscalYear: 2025,
  chargeableIncome: 100000,
  taxPayable: 35000,
  taxAccounts: {
    MTA: { income: 100000, taxPaid: 35000 },
    // ...
  },
});
```

### Shareholder Refund Claims

```typescript
const response = await client.submitRefundClaim({
  companyTIN: '12345678M',
  shareholderTIN: '87654321M',
  distributionDate: '2025-04-15',
  grossDividend: 65000,
  taxAllocated: 35000,
  refundType: 'six_sevenths',
  refundAmount: 30000,
  beneficialOwner: {
    name: 'Shareholder Ltd',
    jurisdiction: 'UK',
    taxResidenceCertificate: true,
  },
});
```

### FITWI Regime Election

```typescript
const response = await client.submitFITWIElection({
  companyTIN: '12345678M',
  fiscalYear: 2025,
  electionType: 'initial',
  chargeableIncome: 100000,
  fitwiTax: 15000,
});
```

### Account Queries

```typescript
// Query VAT account status
const vatAccount = await client.queryVATAccount('MT12345678');

// Validate VAT number
const isValid = await client.validateVATNumber('MT12345678');
```

## Response Format

All submissions return a `CFRResponse`:

```typescript
interface CFRResponse {
  referenceNumber: string;  // CFR reference for tracking
  status: 'submitted' | 'pending' | 'accepted' | 'rejected';
  submissionDate: string;
  errors?: string[];
  warnings?: string[];
}
```

## Deadlines

| Filing | Deadline |
|--------|----------|
| VAT Return | 15th of 2nd month after period end |
| Corporate Tax | 9 months after fiscal year end |
| Shareholder Refund | 14 days from dividend distribution |
| FITWI Election | With annual return |
| Intrastat | 10th of following month |

## Error Handling

```typescript
try {
  const response = await client.submitVATReturn(data);
  if (response.status === 'rejected') {
    console.error('Filing rejected:', response.errors);
  }
} catch (error) {
  if (error.code === 'CFR_AUTH_ERROR') {
    // Re-authenticate
  } else if (error.code === 'CFR_VALIDATION_ERROR') {
    // Fix data issues
  }
}
```

## Sandbox Mode

The sandbox environment returns simulated responses with reference numbers like `CFR-{timestamp}-{random}`. Use this for:
- Integration testing
- Developer onboarding
- CI/CD pipelines

## Production Requirements

For production use:
1. Register with CFR for e-Services access
2. Obtain digital certificate from CFR
3. Configure HTTPS client authentication
4. Use production API endpoints

## Legal

This client is a reference implementation. Actual CFR API integration requires:
- Official CFR API documentation
- Registered taxpayer credentials
- Approved digital certificate

Consult CFR for current API specifications and compliance requirements.
