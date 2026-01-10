# Prisma AI Enhancement Report (Tri-Country: Malta, Canada, Rwanda)

Status: Draft spec. Regulatory details must be validated before production use.
Scope: Build a Big-4 level autonomous audit/tax/accounting AI agent system exclusively for MT/CA/RW.

## Executive Summary
This report defines the target-state capabilities, architecture, and market-specific compliance features for an autonomous agent system focused on Malta, Canada, and Rwanda. It prioritizes jurisdictional correctness, auditability, and automation in tax, audit, and accounting workflows.

Market overview (baseline assumptions):
- Malta (MT): EU member state, VAT-driven economy, gaming/iGaming hub, standard VAT 18%.
- Canada (CA): GST/HST system with provincial variation, CRA oversight, federal GST 5%.
- Rwanda (RW): Emerging market, VAT 18%, EBM mandatory, digital transformation focus.

## 1. Market-Specific Regulatory Landscape (2025 target)

### 1.1 Malta Tax and Audit Framework
VAT system (summary):
- Standard rate: 18%
- Reduced rates: 12% (financial/health), 7% (hotels/sports), 5% (electricity/books/medical equipment)
- Zero rate: exports, medicines, international transport

Registration thresholds (effective Jan 2025):
- Article 10: EUR 30k services / EUR 35k goods
- Article 11: SME domestic exemption (EUR 35k)
- Article 11A: Cross-border exemption (EUR 100k EU-wide)
- Article 11B: Foreign SMEs in Malta (EUR 35k Malta)

Filing and audit:
- VAT filing: quarterly (15th of 2nd month following quarter)
- Audit window: 6 years
- E-invoicing: ViDA compliance target 2028-2030
- Authority: Commissioner for Revenue (CFR)
- Audit standards: ISA

Malta-specific compliance requirements:
- Intrastat declarations for EU trade
- OSS/IOSS for EU e-commerce
- SME scheme and cross-border exemptions (EU Directive 2020/285)
- Gaming/iGaming VAT treatment
- Transfer pricing documentation for controlled transactions

### 1.2 Canada Tax and Audit Framework
GST/HST system (summary):
- Federal GST: 5%
- HST provinces: ON 13%, NS 14% (rate change Apr 2025), NB 15%, NL 15%, PE 15%
- PST provinces: BC 7% (plus GST), SK 6%, MB 7%
- QST: QC 9.975% (plus GST)

Registration threshold:
- CAD 30k over 4 quarters or single quarter

Filing frequency (GST/HST):
- < CAD 1.5M: annual
- CAD 1.5M to 6M: quarterly
- > CAD 6M: monthly

Filing and audit:
- E-filing: mandatory (from Jan 2024)
- Audit window: 4 years (10 years for fraud)
- Record retention: 6 years minimum
- Authority: Canada Revenue Agency (CRA)
- Audit standards: CAS (based on ISA)

Canada-specific requirements:
- Input tax credits (ITCs) with full documentation
- Provincial nexus rules
- Remote seller thresholds
- Indigenous/Aboriginal GST/HST exemptions
- Separate CRA GST/HST audits

### 1.3 Rwanda Tax and Audit Framework
VAT and tax system (summary):
- Standard VAT rate: 18%
- Exempt: medical, education, raw agriculture, gaming (2025 amendment)

Registration thresholds:
- Annual: RWF 20,000,000
- Quarterly: RWF 5,000,000 (any quarter)
- Registration: within 7 days of exceeding threshold

Filing and audit:
- VAT: monthly, within 15 days
- Corporate income tax: 30% (annual, due Mar 31)
- Audit window: 5 years (10 years for fraud)
- Record retention: 10 years
- Authority: Rwanda Revenue Authority (RRA)

Rwanda-specific requirements:
- EBM mandatory for VAT-registered taxpayers
- Real-time EBM transmission to RRA
- Digital services tax: 1.5% on gross revenue (2025)
- Tourism levy: 3% on accommodation
- Withholding tax certificates for international payments
- Mobile money integration (MTN MoMo, Airtel, M-Pesa)
- Audit standards: ISA with local adaptations

## 2. Full-Stack Architecture (Tri-Country)

### 2.1 Backend Infrastructure
- API gateway with country routing
- Dedicated MT/CA/RW engines
- Shared AI agent orchestration layer

Stack target:
- Node.js 20+ / TypeScript 5.x
- NestJS for microservices
- Prisma v6+ with PostgreSQL 16
- GraphQL + REST
- RabbitMQ for EBM near-real-time
- Redis, Elasticsearch, BullMQ

### 2.2 Database Model (Illustrative)
Core tables (country-agnostic):
- tenants
- tax_transactions
- audit_programs

Country-specific registries:
- Malta VAT registrations (Article 10/11/11A/11B)
- Canada GST registrations (BN, province codes, filing frequency)
- Rwanda tax registrations (TIN, EBM serial, sync status)

## 3. AI Agent System (Country-Aware)

Base agent contract:
- agentId, capabilities, supportedCountries, autonomyLevel

Key agents:
- Malta VAT Agent: SME threshold monitoring, OSS/IOSS, Intrastat
- Canada GST/HST Agent: province-level tax logic, ITCs, CRA compliance
- Rwanda EBM Agent: real-time invoice sync, offline recovery, compliance alerts
- Unified Audit Agent: ISA/CAS program selection and risk factors

## 4. Country-Specific Feature Sets

Malta module:
- SME scheme automation (Article 10/11/11A/11B)
- OSS/IOSS compliance
- Intrastat automation
- Gaming/iGaming VAT specialization
- ViDA e-invoicing readiness

Canada module:
- Multi-province GST/HST/PST/QST logic
- ITC maximization and validation
- Provincial nexus monitoring
- CRA audit readiness packs
- Indigenous/Aboriginal exemption handling

Rwanda module:
- EBM integration (critical)
- RRA portal automation (VAT, CIT, WHT)
- Digital services tax and tourism levy
- Mobile money reconciliation
- EAC harmonization considerations

## 5. Example Workflows

Cross-border transaction (MT -> CA SaaS):
- Malta VAT Agent: place of supply = CA, Malta VAT 0%
- Canada GST Agent: advisory for self-assessed HST (province specific)
- Audit Agent: evidence capture for audit trail

Rwanda EBM failure:
- Offline invoice queue, retry sync
- Alert and task creation
- Full audit log for RRA defense

Multi-country client:
- MT HQ + CA branch + RW subsidiary
- Consolidated reporting in EUR base
- Transfer pricing compliance across entities

## 6. Competitive Positioning (Assumptions)
- Prisma AI positions against global tax vendors by specializing in MT/CA/RW.
- Differentiators: Rwanda EBM automation, unified audit + tax + accounting, high autonomy.

## 7. Pricing Model (Draft)
Starter / Professional / Enterprise tiers, with market-adjusted pricing for EUR/CAD/RWF.
Pricing and add-ons require commercial validation.

## 8. Technical Implementation Roadmap
Phase 1 (Months 1-4):
- Multi-tenant DB, country routing, base API
- Agent orchestration framework
- MVP agents: Malta VAT, Canada GST, Rwanda EBM

Phase 2 (Months 5-8):
- Full tax and audit automation per country
- Integration hub (QuickBooks, Xero, Stripe)

Phase 3 (Months 9-12):
- Advanced autonomy, continuous monitoring
- Multi-GAAP reporting and scale

Phase 4 (Months 13-18):
- Predictive analytics
- Enterprise compliance and certifications

## Notes
- This document is a product and technical target state; all statutory values must be validated with official sources before production activation.
- Any new tool added for autonomous agents must be reviewed against AGENT-GUARDRAILS.md.
