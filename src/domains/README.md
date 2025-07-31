# Domain Architecture

This directory contains domain-specific modules organized by business functionality.

## Structure

```
src/domains/
├── payments/          # Payment processing, MoMo, QR codes
├── transport/         # Ride booking, driver management
├── commerce/          # Product listings, orders, inventory
├── communication/     # WhatsApp, messaging, campaigns
├── ai/               # Agent management, ML models
└── shared/           # Cross-domain utilities and types
```

## Guidelines

1. **Domain Isolation**: Each domain should be self-contained with minimal dependencies on other domains
2. **Shared Utilities**: Common functionality goes in `shared/`
3. **API Contracts**: Define clear interfaces between domains
4. **Type Safety**: Use TypeScript interfaces and the global `easyMO` namespace

## Domain Responsibilities

### Payments
- MoMo integration
- QR code generation
- Transaction processing
- Payment validation

### Transport  
- Ride booking
- Driver management
- Route optimization
- Trip tracking

### Commerce
- Product catalogs
- Order management
- Inventory tracking
- Business listings

### Communication
- WhatsApp messaging
- Template management
- Campaign automation
- Notification delivery

### AI
- Agent configuration
- Intent detection
- Response generation
- Learning management

### Shared
- Common utilities
- Validation helpers
- Error handling
- Type definitions