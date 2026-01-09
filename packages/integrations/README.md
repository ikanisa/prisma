# Integrations Package

Third-party integrations for tax platforms and ERP systems.

## Tax Platform Integrations

| Module | Description |
|--------|-------------|
| `avalara-integration.ts` | Avalara AvaTax API (tax calc, nexus, address validation) |
| `stripe-tax-integration.ts` | Stripe Tax (calculations, registrations) |
| `irs-eservices-integration.ts` | IRS MeF (form submission, status tracking) |

## ERP Integrations

| Module | Description |
|--------|-------------|
| `netsuite-integration.ts` | NetSuite REST API (SuiteQL, trial balance) |
| `quickbooks-integration.ts` | QuickBooks Online (reports, invoices, JEs) |
| `xero-integration.ts` | Xero Accounting (reports, journals) |
| `sage-intacct-integration.ts` | Sage Intacct (multi-entity, dimensions) |

## Usage

```typescript
// Tax
import { avalaraClient } from '@prisma/integrations/tax/avalara-integration';
import { irsClient } from '@prisma/integrations/tax/irs-eservices-integration';

// ERP
import { netsuiteClient } from '@prisma/integrations/erp/netsuite-integration';
import { quickbooksClient } from '@prisma/integrations/erp/quickbooks-integration';

// Calculate tax
const tax = await avalaraClient.calculateTax({
  lines: [{ amount: 100 }],
  addresses: { shipTo: { country: 'US', region: 'WA' } },
});

// Get trial balance
const tb = await netsuiteClient.getTrialBalance('Dec 2025');
```

## Environment Variables

```bash
# Avalara
AVALARA_ACCOUNT_ID=your-account-id
AVALARA_LICENSE_KEY=your-license-key
AVALARA_ENVIRONMENT=sandbox

# Stripe
STRIPE_SECRET_KEY=sk_test_...

# IRS
IRS_EFIN=your-efin
IRS_SOFTWARE_ID=your-software-id

# NetSuite
NETSUITE_ACCOUNT_ID=123456
NETSUITE_CONSUMER_KEY=...
NETSUITE_TOKEN_ID=...

# QuickBooks
QBO_CLIENT_ID=...
QBO_CLIENT_SECRET=...
QBO_REALM_ID=...

# Xero
XERO_CLIENT_ID=...
XERO_TENANT_ID=...

# Sage Intacct
SAGE_SENDER_ID=...
SAGE_COMPANY_ID=...
```
