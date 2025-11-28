# @prisma-glow/tax

Tax agent specialists for multi-jurisdiction tax compliance and advisory.

## Overview

This package contains 12 specialized AI tax agents covering multiple jurisdictions and tax domains:

### Corporate Tax Agents
- **EU Corporate Tax Specialist** (`tax-corp-eu-022`) - EU-27 corporate tax, ATAD compliance
- **US Corporate Tax Specialist** (`tax-corp-us-023`) - Federal & state corporate tax
- **UK Corporate Tax Specialist** (`tax-corp-uk-024`) - UK Corporation Tax, CT600
- **Canadian Corporate Tax Specialist** (`tax-corp-ca-025`) - Canadian ITA & provincial tax
- **Malta Corporate Tax Specialist** (`tax-corp-mt-026`) - Malta tax, EU directives
- **Rwanda Corporate Tax Specialist** (`tax-corp-rw-027`) - Rwanda tax, EAC integration

### Specialized Tax Agents
- **VAT/GST Specialist** (`tax-vat-028`) - Global VAT/GST compliance
- **Transfer Pricing Specialist** (`tax-tp-029`) - OECD guidelines, BEPS Actions
- **Personal Tax Specialist** (`tax-personal-030`) - Individual income tax
- **Tax Provision Specialist** (`tax-provision-031`) - ASC 740, IAS 12 compliance
- **Tax Controversy Specialist** (`tax-contro-032`) - Disputes, appeals, litigation
- **Tax Research Specialist** (`tax-research-033`) - Tax law research & analysis

## Installation

```bash
pnpm install @prisma-glow/tax
```

## Usage

```typescript
import { EUCorporateTaxAgent } from '@prisma-glow/tax';

const agent = new EUCorporateTaxAgent({
  organizationId: 'org-123',
  userId: 'user-456'
});

const result = await agent.execute({
  query: 'What is the corporate tax rate in Germany for 2024?'
});

console.log(result.output);
```

## Agent Capabilities

Each agent provides:
- ✅ Jurisdiction-specific tax guidance
- ✅ Compliance checking
- ✅ Tax calculation assistance
- ✅ Filing deadline tracking
- ✅ Tax optimization suggestions
- ✅ Regulatory update alerts

## Standards Compliance

- **OECD Guidelines** - Transfer Pricing, BEPS Actions
- **EU Directives** - ATAD I/II, DAC 6, Parent-Subsidiary
- **National Tax Codes** - IRC, ITA, Income Tax Acts
- **Accounting Standards** - ASC 740, IAS 12

## Development

```bash
# Run tests
pnpm test

# Build package
pnpm build

# Type check
pnpm typecheck
```

## Architecture

```
packages/tax/
├── src/
│   ├── agents/          # Individual tax agent implementations
│   ├── tools/           # Tax calculation tools & APIs
│   ├── prompts/         # System prompts & templates
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Shared utilities
│   └── index.ts         # Public API exports
└── tests/               # Test suite
```

## License

Private - Prisma Glow Internal Use Only
