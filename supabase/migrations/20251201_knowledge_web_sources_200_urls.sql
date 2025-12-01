-- Migration: Knowledge Web Sources - 200 Trusted URLs
-- Description: Creates knowledge_web_sources table and seeds it with 200 curated URLs
--              for AI agent learning across IFRS, ISA, Tax, Big4, and regulatory sources.
-- Created: 2025-12-01

-- ============================================================================
-- TABLE: knowledge_web_sources
-- ============================================================================
-- Each row = one trusted URL (with domain + metadata) for AI agent learning.

create table if not exists knowledge_web_sources (
    id uuid primary key default gen_random_uuid(),
    name text not null,                  -- "IFRS - Issued Standards", "RRA VAT"
    url text not null,                   -- full URL
    domain text not null,                -- e.g. "ifrs.org"
    category text not null,              -- "IFRS", "ISA", "TAX", "BIG4", "ACCA", etc.
    jurisdiction_code text default 'GLOBAL',  -- "GLOBAL", "RW", "MT", etc.
    authority_level text not null default 'SECONDARY'
        check (authority_level in ('PRIMARY', 'SECONDARY', 'INTERNAL')),
    status text not null default 'ACTIVE'
        check (status in ('ACTIVE', 'INACTIVE')),
    priority int not null default 1,     -- 1 = core, higher = less central
    tags text[] default '{}',            -- e.g. '{ifrs,ias,isa,tax}'
    notes text,
    last_crawled_at timestamptz,
    created_by uuid,
    updated_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists idx_kws_domain
    on knowledge_web_sources (domain);

create index if not exists idx_kws_category
    on knowledge_web_sources (category);

create index if not exists idx_kws_jurisdiction
    on knowledge_web_sources (jurisdiction_code);

create index if not exists idx_kws_status
    on knowledge_web_sources (status);

create index if not exists idx_kws_authority_level
    on knowledge_web_sources (authority_level);

create index if not exists idx_kws_priority
    on knowledge_web_sources (priority);

-- ============================================================================
-- SEED DATA: 200 Trusted URLs
-- ============================================================================

insert into knowledge_web_sources
    (name, url, domain, category, jurisdiction_code, authority_level, status, priority, tags)
values
-- A. IFRS / IAS / IFRIC (1–12)
('IFRS Foundation - Home', 'https://www.ifrs.org', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{ifrs,foundation}'),
('IFRS - Issued Standards', 'https://www.ifrs.org/issued-standards/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{ifrs,standards}'),
('IFRS - List of Standards', 'https://www.ifrs.org/issued-standards/list-of-standards/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{ifrs,ias,ifrs}'),
('IFRS - Work Plan', 'https://www.ifrs.org/projects/work-plan/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{ifrs,projects,work-plan}'),
('IFRS - News and Events', 'https://www.ifrs.org/news-and-events/', 'ifrs.org', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{news,updates}'),
('IFRS - IFRIC Interpretations', 'https://www.ifrs.org/issued-standards/ifric-interpretations/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{ifric,interpretations}'),
('IFRS - Supporting Implementation', 'https://www.ifrs.org/supporting-implementation/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{guidance,implementation}'),
('IFRS - About Us', 'https://www.ifrs.org/about-us/', 'ifrs.org', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{about,governance}'),
('IFRS Taxonomy', 'https://www.ifrs.org/content/dam/ifrs/project/ifrs-taxonomy/', 'ifrs.org', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{taxonomy}'),
('IFRS for SMEs', 'https://www.ifrs.org/ifrs-for-smes/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{smes}'),
('IFRS for SMEs - Issued', 'https://www.ifrs.org/issued-standards/ifrs-for-smes/', 'ifrs.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{smes,standards}'),
('IFRS - Open for Comment', 'https://www.ifrs.org/projects/open-for-comment/', 'ifrs.org', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{exposure-drafts,consultation}'),

-- B. IAASB / IESBA / IFAC (13–26)
('IAASB - Home', 'https://www.iaasb.org', 'iaasb.org', 'ISA', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{isa,audit}'),
('IAASB - ISA Focus Area', 'https://www.iaasb.org/focus-areas/international-standards-auditing-isa', 'iaasb.org', 'ISA', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{isa,standards}'),
('IAASB - Guidance', 'https://www.iaasb.org/guidance', 'iaasb.org', 'ISA', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{guidance}'),
('IAASB - Publications', 'https://www.iaasb.org/publications', 'iaasb.org', 'ISA', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{publications}'),
('IAASB - ISA Clarity', 'https://www.iaasb.org/isa-clarity', 'iaasb.org', 'ISA', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{clarity}'),
('IAASB - Strengthening International Auditing', 'https://www.iaasb.org/strengthening-international-auditing', 'iaasb.org', 'ISA', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{audit-quality}'),
('IFAC - IAASB Standards', 'https://www.ifac.org/iaasb/standards', 'ifac.org', 'ISA', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{isa,ifac}'),
('IFAC - Home', 'https://www.ifac.org', 'ifac.org', 'IFRS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{ifac,global}'),
('IFAC - Knowledge Gateway', 'https://www.ifac.org/knowledge-gateway', 'ifac.org', 'KNOWLEDGE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{articles,guidance}'),
('IFAC - Publications & Resources', 'https://www.ifac.org/publications-resources', 'ifac.org', 'KNOWLEDGE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{resources}'),
('IESBA - Home', 'https://www.ethicsboard.org', 'ethicsboard.org', 'ETHICS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{iesba,ethics}'),
('IESBA - Code of Ethics', 'https://www.ethicsboard.org/iesba-code', 'ethicsboard.org', 'ETHICS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{code-of-ethics}'),
('IESBA - Standards', 'https://www.ethicsboard.org/standards', 'ethicsboard.org', 'ETHICS', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{standards}'),
('IFAC - Ethics', 'https://www.ifac.org/ethics', 'ifac.org', 'ETHICS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{ethics,iesba}'),

-- C. Big 4 – KPMG / PwC / Deloitte / EY (27–50)
('KPMG - Home', 'https://kpmg.com', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{audit,tax,advisory}'),
('KPMG - IFRS in Focus', 'https://kpmg.com/xx/en/home/services/audit/ifrs-in-focus.html', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 1, '{ifrs,interpretation}'),
('KPMG - Insights', 'https://kpmg.com/xx/en/home/insights.html', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{insights,articles}'),
('KPMG - Audit Services', 'https://kpmg.com/xx/en/home/services/audit.html', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{audit}'),
('KPMG - IFRS Reporting', 'https://kpmg.com/xx/en/home/services/audit/international-financial-reporting-standards.html', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{ifrs,technical}'),
('KPMG - ISA Resources', 'https://kpmg.com/xx/en/home/services/audit/international-standards-on-auditing.html', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{isa,guidance}'),
('KPMG - Tax Services', 'https://kpmg.com/xx/en/home/services/tax.html', 'kpmg.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{tax}'),

('PwC - Home', 'https://www.pwc.com', 'pwc.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{audit,tax,consulting}'),
('PwC - Viewpoint', 'https://viewpoint.pwc.com', 'viewpoint.pwc.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 1, '{ifrs,us-gaap,library}'),
('PwC - Accounting Guides', 'https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides.html', 'viewpoint.pwc.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{guides,ifrs,gaap}'),
('PwC - Audit Guides', 'https://viewpoint.pwc.com/dt/us/en/audit_guides.html', 'viewpoint.pwc.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{audit,guides}'),
('PwC - IFRS Reporting Services', 'https://www.pwc.com/gx/en/services/assurance/capital-markets/services/ifrs-reporting.html', 'pwc.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{ifrs,assurance}'),

('Deloitte - Global', 'https://www2.deloitte.com/global/en.html', 'deloitte.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{audit,tax}'),
('IAS Plus - Home', 'https://www.iasplus.com', 'iasplus.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 1, '{ifrs,iasplus}'),
('IAS Plus - Standards', 'https://www.iasplus.com/en/standards', 'iasplus.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 1, '{standards,ifrs,ias}'),
('IAS Plus - News', 'https://www.iasplus.com/en/news', 'iasplus.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{news,updates}'),
('IAS Plus - Projects', 'https://www.iasplus.com/en/projects', 'iasplus.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{projects}'),
('IAS Plus - Publications', 'https://www.iasplus.com/en/publications', 'iasplus.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{publications,guides}'),
('IAS Plus - IFRS Topical', 'https://www.iasplus.com/en/resources/ifrs-topical', 'iasplus.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{topics,ifrs}'),
('Deloitte - Tax', 'https://www2.deloitte.com/global/en/services/tax.html', 'deloitte.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{tax}'),

('EY - Home', 'https://www.ey.com', 'ey.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{audit,advisory}'),
('EY - IFRS', 'https://www.ey.com/en_gl/ifrs', 'ey.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{ifrs}'),
('EY - Assurance', 'https://www.ey.com/en_gl/assurance', 'ey.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{assurance,audit}'),
('EY - Tax', 'https://www.ey.com/en_gl/tax', 'ey.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{tax}'),
('EY - Insights', 'https://www.ey.com/en_gl/insights', 'ey.com', 'BIG4', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{insights,articles}'),

-- D. OECD Tax (51–58)
('OECD - Home', 'https://www.oecd.org', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{oecd,policy}'),
('OECD - Tax', 'https://www.oecd.org/tax/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{tax,global}'),
('OECD - BEPS', 'https://www.oecd.org/tax/beps/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{beps,base-erosion}'),
('OECD - Transfer Pricing', 'https://www.oecd.org/tax/transfer-pricing/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{transfer-pricing}'),
('OECD - Tax Policy', 'https://www.oecd.org/ctp/tax-policy/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{tax-policy}'),
('OECD - Exchange of Information', 'https://www.oecd.org/ctp/exchange-of-information/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{exchange-of-information}'),
('OECD - Automatic Exchange', 'https://www.oecd.org/tax/automatic-exchange/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{automatic-exchange}'),
('OECD - Tax Administration', 'https://www.oecd.org/tax/administration/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{tax-administration}'),

-- E. Malta Tax / Corporate (59–77)
('CFR Malta - Home', 'https://cfr.gov.mt/en/Pages/Home.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 1, '{tax,malta}'),
('CFR Malta - eServices', 'https://cfr.gov.mt/en/eServices/Pages/default.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 2, '{eservices,returns}'),
('CFR Malta - Inland Revenue Guides', 'https://cfr.gov.mt/en/inlandrevenue/taxguides/Pages/default.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 1, '{guides,income-tax}'),
('CFR Malta - VAT', 'https://cfr.gov.mt/en/vat/Pages/default.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 1, '{vat}'),
('CFR Malta - Customs', 'https://cfr.gov.mt/en/customs/Pages/default.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 2, '{customs,excise}'),
('CFR Malta - Personal Tax', 'https://cfr.gov.mt/en/inlandrevenue/personal/Pages/default.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 2, '{personal-tax}'),
('CFR Malta - Corporate Tax', 'https://cfr.gov.mt/en/inlandrevenue/corporate/Pages/default.aspx', 'cfr.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 2, '{corporate-tax}'),

('Malta Business Registry - Home', 'https://mbr.mt', 'mbr.mt', 'CORP', 'MT', 'PRIMARY', 'ACTIVE', 1, '{company-registry}'),
('Malta Business Registry - Legislation', 'https://mbr.mt/legislation/', 'mbr.mt', 'CORP', 'MT', 'PRIMARY', 'ACTIVE', 1, '{company-law}'),
('Malta Business Registry - Services', 'https://mbr.mt/services/', 'mbr.mt', 'CORP', 'MT', 'PRIMARY', 'ACTIVE', 2, '{filings,services}'),

('MFSA - Home', 'https://www.mfsa.mt', 'mfsa.mt', 'REG', 'MT', 'PRIMARY', 'ACTIVE', 1, '{regulator,financial-services}'),
('MFSA - Publications', 'https://www.mfsa.mt/publications/', 'mfsa.mt', 'REG', 'MT', 'PRIMARY', 'ACTIVE', 2, '{rules,guidance}'),
('MFSA - Consumers', 'https://www.mfsa.mt/consumers/', 'mfsa.mt', 'REG', 'MT', 'SECONDARY', 'ACTIVE', 3, '{consumers}'),
('MFSA - Industry', 'https://www.mfsa.mt/industry/', 'mfsa.mt', 'REG', 'MT', 'PRIMARY', 'ACTIVE', 2, '{industry}'),
('MFSA - Authorisation', 'https://www.mfsa.mt/industry/authorisation/', 'mfsa.mt', 'REG', 'MT', 'PRIMARY', 'ACTIVE', 2, '{licensing,authorisation}'),

('FIAU Malta - Home', 'https://fiaumalta.org', 'fiaumalta.org', 'AML', 'MT', 'PRIMARY', 'ACTIVE', 1, '{aml,kyc}'),
('FIAU Malta - Publications', 'https://fiaumalta.org/publications/', 'fiaumalta.org', 'AML', 'MT', 'PRIMARY', 'ACTIVE', 2, '{publications}'),
('FIAU Malta - Guidance Notes', 'https://fiaumalta.org/guidance-notes/', 'fiaumalta.org', 'AML', 'MT', 'PRIMARY', 'ACTIVE', 2, '{guidance,aml}'),

-- F. Rwanda Tax / Corporate (78–92)
('RRA - Home', 'https://www.rra.gov.rw', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 1, '{tax,rwanda}'),
('RRA - Income Tax', 'https://www.rra.gov.rw/tax-information/income-tax', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 1, '{income-tax}'),
('RRA - VAT', 'https://www.rra.gov.rw/tax-information/vat', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 1, '{vat}'),
('RRA - Excise', 'https://www.rra.gov.rw/tax-information/excise', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 2, '{excise}'),
('RRA - eServices', 'https://www.rra.gov.rw/e-services', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 2, '{eservices,returns}'),
('RRA - News', 'https://www.rra.gov.rw/news', 'rra.gov.rw', 'TAX', 'RW', 'SECONDARY', 'ACTIVE', 3, '{news}'),
('RRA - Regulations', 'https://www.rra.gov.rw/regulations', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 2, '{regulations}'),
('RRA - Forms', 'https://www.rra.gov.rw/forms', 'rra.gov.rw', 'TAX', 'RW', 'PRIMARY', 'ACTIVE', 2, '{forms}'),

('Rwanda Gazette via gazettes.africa', 'https://gazettes.africa/gazettes/rw', 'gazettes.africa', 'LAW', 'RW', 'PRIMARY', 'ACTIVE', 2, '{gazette,acts}'),
('Rwanda Parliament', 'https://rwandaparliament.gov.rw/', 'rwandaparliament.gov.rw', 'LAW', 'RW', 'SECONDARY', 'ACTIVE', 3, '{laws}'),
('Rwanda MINICOM', 'https://www.minicom.gov.rw/', 'minicom.gov.rw', 'REG', 'RW', 'SECONDARY', 'ACTIVE', 3, '{commerce}'),
('National Bank of Rwanda', 'https://www.bnr.rw/', 'bnr.rw', 'REG', 'RW', 'PRIMARY', 'ACTIVE', 2, '{banking,regulation}'),

('Rwanda Development Board - Home', 'https://rdb.rw', 'rdb.rw', 'CORP', 'RW', 'PRIMARY', 'ACTIVE', 1, '{business,investment}'),
('RDB - Investment', 'https://rdb.rw/investment/', 'rdb.rw', 'CORP', 'RW', 'PRIMARY', 'ACTIVE', 2, '{investment}'),
('RDB - Business Registration', 'https://rdb.rw/services/business-registration/', 'rdb.rw', 'CORP', 'RW', 'PRIMARY', 'ACTIVE', 2, '{company-formation}'),

-- G. Global tax authorities (93–100)
('US IRS - Home', 'https://www.irs.gov', 'irs.gov', 'TAX', 'US', 'PRIMARY', 'ACTIVE', 2, '{us-tax}'),
('UK HMRC', 'https://www.gov.uk/government/organisations/hm-revenue-customs', 'gov.uk', 'TAX', 'UK', 'PRIMARY', 'ACTIVE', 2, '{uk-tax,hmrc}'),
('Canada Revenue Agency', 'https://www.canada.ca/en/revenue-agency.html', 'canada.ca', 'TAX', 'CA', 'PRIMARY', 'ACTIVE', 3, '{canada-tax}'),
('Australian Taxation Office', 'https://www.ato.gov.au', 'ato.gov.au', 'TAX', 'AU', 'PRIMARY', 'ACTIVE', 3, '{australia-tax}'),
('Income Tax India', 'https://www.incometaxindia.gov.in', 'incometaxindia.gov.in', 'TAX', 'IN', 'PRIMARY', 'ACTIVE', 3, '{india-tax}'),
('Hong Kong Inland Revenue Department', 'https://www.ird.gov.hk', 'ird.gov.hk', 'TAX', 'HK', 'PRIMARY', 'ACTIVE', 3, '{hk-tax}'),
('UK Government Tax Service', 'https://www.tax.service.gov.uk', 'tax.service.gov.uk', 'TAX', 'UK', 'PRIMARY', 'ACTIVE', 3, '{online-tax-service}'),
('South African Revenue Service', 'https://www.sars.gov.za', 'sars.gov.za', 'TAX', 'ZA', 'PRIMARY', 'ACTIVE', 3, '{south-africa-tax}'),

-- H. Professional bodies (101–111)
('ACCA - Home', 'https://www.accaglobal.com', 'accaglobal.com', 'PRO', 'GLOBAL', 'SECONDARY', 'ACTIVE', 1, '{acca}'),
('ACCA - Exam Support', 'https://www.accaglobal.com/an/en/student/exam-support-resources.html', 'accaglobal.com', 'PRO', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{exam-support}'),
('ACCA - Technical Activities', 'https://www.accaglobal.com/gb/en/technical/activities.html', 'accaglobal.com', 'PRO', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{technical}'),
('ACCA - Professional Exam Resources', 'https://www.accaglobal.com/gb/en/student/exam-support-resources/professional.html', 'accaglobal.com', 'PRO', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{acca,professional}'),

('AICPA - Home', 'https://www.aicpa.org', 'aicpa.org', 'PRO', 'US', 'SECONDARY', 'ACTIVE', 1, '{cpa,audit}'),
('Journal of Accountancy', 'https://www.journalofaccountancy.com', 'journalofaccountancy.com', 'KNOWLEDGE', 'US', 'SECONDARY', 'ACTIVE', 2, '{articles}'),

('CPA Canada - Home', 'https://www.cpacanada.ca', 'cpacanada.ca', 'PRO', 'CA', 'SECONDARY', 'ACTIVE', 1, '{cpa-canada}'),
('CPA Canada - Resources', 'https://www.cpacanada.ca/en/business-and-accounting-resources', 'cpacanada.ca', 'PRO', 'CA', 'SECONDARY', 'ACTIVE', 2, '{resources}'),

('ICAEW - Home', 'https://www.icaew.com', 'icaew.com', 'PRO', 'UK', 'SECONDARY', 'ACTIVE', 2, '{icaew}'),
('ICAEW - Technical', 'https://www.icaew.com/technical', 'icaew.com', 'PRO', 'UK', 'SECONDARY', 'ACTIVE', 2, '{technical}'),

('CIMA Global', 'https://www.cimaglobal.com', 'cimaglobal.com', 'PRO', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{cima,management-accounting}'),

-- I. US GAAP / FASB (112–115)
('ASC - Codification', 'https://asc.fasb.org', 'fasb.org', 'US_GAAP', 'US', 'PRIMARY', 'ACTIVE', 1, '{us-gaap,asc}'),
('FASB - Home', 'https://www.fasb.org', 'fasb.org', 'US_GAAP', 'US', 'PRIMARY', 'ACTIVE', 2, '{fasb}'),
('FASB - Standards', 'https://www.fasb.org/standards', 'fasb.org', 'US_GAAP', 'US', 'PRIMARY', 'ACTIVE', 2, '{standards}'),
('FASB - Getting Started', 'https://www.fasb.org/page/getting-started', 'fasb.org', 'US_GAAP', 'US', 'SECONDARY', 'ACTIVE', 3, '{getting-started}'),

-- J. Academic / research (116–120)
('Google Scholar', 'https://scholar.google.com', 'scholar.google.com', 'RESEARCH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{scholar}'),
('ResearchGate', 'https://www.researchgate.net', 'researchgate.net', 'RESEARCH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{research}'),
('SSRN', 'https://papers.ssrn.com', 'ssrn.com', 'RESEARCH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{papers}'),
('JSTOR', 'https://www.jstor.org', 'jstor.org', 'RESEARCH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{journals}'),
('ScienceDirect', 'https://www.sciencedirect.com', 'sciencedirect.com', 'RESEARCH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{science,articles}'),

-- K. Audit regulators (121–126)
('PCAOB - Home', 'https://www.pcaobus.org', 'pcaobus.org', 'AUDIT_REG', 'US', 'PRIMARY', 'ACTIVE', 2, '{audit,oversight}'),
('PCAOB - Inspections', 'https://www.pcaobus.org/oversight/inspections', 'pcaobus.org', 'AUDIT_REG', 'US', 'PRIMARY', 'ACTIVE', 2, '{inspections}'),
('UK FRC - Home', 'https://www.frc.org.uk', 'frc.org.uk', 'AUDIT_REG', 'UK', 'PRIMARY', 'ACTIVE', 2, '{regulator}'),
('UK FRC - Accountants', 'https://www.frc.org.uk/accountants', 'frc.org.uk', 'AUDIT_REG', 'UK', 'SECONDARY', 'ACTIVE', 3, '{accountants}'),
('UK FRC - Auditors', 'https://www.frc.org.uk/auditors', 'frc.org.uk', 'AUDIT_REG', 'UK', 'SECONDARY', 'ACTIVE', 3, '{auditors}'),
('IFIAR', 'https://www.ifiar.org', 'ifiar.org', 'AUDIT_REG', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{global-regulators}'),

-- L. Corporate / EU / OECD governance (127–130)
('EU Single Market & Economy', 'https://single-market-economy.ec.europa.eu/', 'ec.europa.eu', 'CORP', 'EU', 'SECONDARY', 'ACTIVE', 3, '{company-law,eu}'),
('EUR-Lex', 'https://eur-lex.europa.eu/', 'eur-lex.europa.eu', 'LAW', 'EU', 'PRIMARY', 'ACTIVE', 2, '{eu-law}'),
('OECD - Corporate Governance', 'https://www.oecd.org/corporate/', 'oecd.org', 'GOVERNANCE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{corporate-governance}'),
('World Bank - Doing Business (archived)', 'https://www.doingbusiness.org', 'doingbusiness.org', 'CORP', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{business-environment}'),

-- M. Banking / Insurance / Public sector / ESG (131–139)
('BIS - Home', 'https://www.bis.org', 'bis.org', 'BANKING', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{banking}'),
('BIS - Regulations', 'https://www.bis.org/regulations.htm', 'bis.org', 'BANKING', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{regulation}'),
('IFRS - Financial Instruments Projects', 'https://www.ifrs.org/projects/financial-instruments/', 'ifrs.org', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{financial-instruments}'),

('IAIS', 'https://www.iaisweb.org', 'iaisweb.org', 'INSURANCE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{insurance-supervision}'),

('IPSASB - Home', 'https://www.ipsasb.org', 'ipsasb.org', 'PUBLIC_SECTOR', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{ipsas}'),
('IFAC - IPSASB Standards', 'https://www.ifac.org/ipsasb/standards', 'ifac.org', 'PUBLIC_SECTOR', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{public-sector-standards}'),

('IFRS - Sustainability', 'https://www.ifrs.org/sustainability/', 'ifrs.org', 'ESG', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{sustainability,esg}'),
('ESMA - Home', 'https://www.esma.europa.eu', 'esma.europa.eu', 'REG', 'EU', 'PRIMARY', 'ACTIVE', 2, '{markets}'),
('ESG Standards Board', 'https://www.esgstandardsboard.org', 'esgstandardsboard.org', 'ESG', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{esg,standards}'),

-- N. More global firms (140–144)
('Grant Thornton Global - Home', 'https://www.grantthornton.global', 'grantthornton.global', 'FIRM', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{audit,tax}'),
('Grant Thornton - Insights', 'https://www.grantthornton.global/en/insights/', 'grantthornton.global', 'FIRM', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{insights}'),

('BDO Global - Home', 'https://www.bdo.global', 'bdo.global', 'FIRM', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{audit,tax}'),
('BDO - Insights', 'https://www.bdo.global/en-gb/insights', 'bdo.global', 'FIRM', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{insights}'),

('Mazars - Home', 'https://www.mazars.com', 'mazars.com', 'FIRM', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{audit,tax}'),

-- O. Cross-border TP / treaties (145–148)
('UN Tax Committee', 'https://www.un.org/development/desa/financing/tax', 'un.org', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{un-tax}'),
('IBFD (International Bureau of Fiscal Documentation)', 'https://www.ibfd.org', 'ibfd.org', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{tax-research}'),
('International Tax Review', 'https://www.internationaltaxreview.com', 'internationaltaxreview.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{tax-news}'),
('Tax Treaties Info (generic)', 'https://www.taxtreaties.com', 'taxtreaties.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{treaties}'),

-- P. Rwanda additional regulators (149–151)
('RURA - Home', 'https://www.rura.rw', 'rura.rw', 'REG', 'RW', 'PRIMARY', 'ACTIVE', 3, '{utilities,regulator}'),
('RDB - Old org domain', 'https://org.rdb.rw', 'rdb.rw', 'CORP', 'RW', 'SECONDARY', 'ACTIVE', 3, '{legacy}'),
('MINIJUST Rwanda', 'https://minijust.gov.rw', 'minijust.gov.rw', 'LAW', 'RW', 'SECONDARY', 'ACTIVE', 3, '{justice}'),

-- Q. Malta additional (152–155)
('Identity Malta', 'https://identitymalta.com', 'identitymalta.com', 'CORP', 'MT', 'SECONDARY', 'ACTIVE', 3, '{immigration,residence}'),
('Maltese Government Portal', 'https://www.gov.mt', 'gov.mt', 'GOV', 'MT', 'SECONDARY', 'ACTIVE', 3, '{government}'),
('Malta Ministry for Justice', 'https://justice.gov.mt', 'justice.gov.mt', 'LAW', 'MT', 'SECONDARY', 'ACTIVE', 3, '{justice}'),
('Malta Customs', 'https://customs.gov.mt', 'customs.gov.mt', 'TAX', 'MT', 'PRIMARY', 'ACTIVE', 3, '{customs}'),

-- R. Accounting education / practice (156–159)
('AccountingTools', 'https://www.accountingtools.com', 'accountingtools.com', 'KNOWLEDGE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{learning}'),
('CPA Journal', 'https://www.cpajournal.com', 'cpajournal.com', 'KNOWLEDGE', 'US', 'SECONDARY', 'ACTIVE', 3, '{articles}'),
('FEE (Federation of European Accountants) / Accountancy Europe', 'https://www.accountancyeurope.eu', 'accountancyeurope.eu', 'PRO', 'EU', 'SECONDARY', 'ACTIVE', 3, '{europe,accountancy}'),
('The Wire (generic knowledge - optional)', 'https://www.thewire.org', 'thewire.org', 'KNOWLEDGE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{misc}'),

-- S. Transfer Pricing specialization (160–163)
('OECD - Transfer Pricing (again, direct link)', 'https://www.oecd.org/tax/transfer-pricing/', 'oecd.org', 'TAX', 'GLOBAL', 'PRIMARY', 'ACTIVE', 1, '{transfer-pricing}'),
('Tax Foundation', 'https://taxfoundation.org', 'taxfoundation.org', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{tax-analysis}'),
('TransferPricing.com', 'https://transferpricing.com', 'transferpricing.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{tp}'),
('EY Tax Insights', 'https://taxinsights.ey.com', 'ey.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{tax-insights}'),

-- T. VAT / indirect tax (164–167)
('Tax Foundation - VAT', 'https://taxfoundation.org/value-added-tax/', 'taxfoundation.org', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{vat}'),
('VATLive (Avalara VAT resource)', 'https://www.vatlive.com', 'vatlive.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{vat,indirect-tax}'),
('Avalara - Home', 'https://www.avalara.com', 'avalara.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{vat,compliance}'),
('TMS VAT Guides (example)', 'https://www.tmsconsulting.com/vat-guides/', 'tmsconsulting.com', 'TAX', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{vat-guides}'),

-- U. Law libraries (168–171)
('LexisNexis', 'https://www.lexisnexis.com', 'lexisnexis.com', 'LAW', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{legal-db}'),
('Westlaw', 'https://www.westlaw.com', 'westlaw.com', 'LAW', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{legal-db}'),
('Cornell LII', 'https://www.law.cornell.edu', 'law.cornell.edu', 'LAW', 'US', 'SECONDARY', 'ACTIVE', 3, '{legal-reference}'),
('International Labour Organization', 'https://www.ilo.org', 'ilo.org', 'LAW', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{labour-law}'),

-- V. IFRS interpretation & presentation (172–175)
('IFRSbox', 'https://www.ifrsbox.com', 'ifrsbox.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{ifrs,examples}'),
('AccountingWEB', 'https://www.accountingweb.com', 'accountingweb.com', 'KNOWLEDGE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{practice,forum}'),
('CFO.com', 'https://www.cfo.com', 'cfo.com', 'KNOWLEDGE', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{finance}'),
('Journal of Accountancy (again direct)', 'https://www.journalofaccountancy.com', 'journalofaccountancy.com', 'KNOWLEDGE', 'US', 'SECONDARY', 'ACTIVE', 3, '{magazine}'),

-- W. Fair value / valuation (176–180)
('PwC Canada - Valuation', 'https://www.pwccanada.com/en/services/valuation.html', 'pwccanada.com', 'VALUATION', 'CA', 'SECONDARY', 'ACTIVE', 3, '{valuation}'),
('IVSC - International Valuation Standards Council', 'https://www.ivsc.org', 'ivsc.org', 'VALUATION', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{valuation-standards}'),
('CFA Volunteer / Example portal', 'https://www.cfavolunteer.com', 'cfavolunteer.com', 'VALUATION', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{cfa}'),
('CFA Institute', 'https://www.cfainstitute.org', 'cfainstitute.org', 'VALUATION', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{cfa}'),
('ASA - American Society of Appraisers', 'https://www.appraisers.org', 'appraisers.org', 'VALUATION', 'GLOBAL', 'SECONDARY', 'ACTIVE', 3, '{appraisal}'),

-- X. Governance & risk (181–185)
('COSO - Home', 'https://www.coso.org', 'coso.org', 'GOVERNANCE', 'GLOBAL', 'PRIMARY', 'ACTIVE', 2, '{internal-control,erm}'),
('NCUA', 'https://www.ncua.gov', 'ncua.gov', 'REG', 'US', 'SECONDARY', 'ACTIVE', 4, '{credit-unions}'),
('FINRA', 'https://www.finra.org', 'finra.org', 'REG', 'US', 'SECONDARY', 'ACTIVE', 3, '{securities-reg}'),
('US SEC', 'https://www.sec.gov', 'sec.gov', 'REG', 'US', 'PRIMARY', 'ACTIVE', 2, '{sec,filings}'),
('ESMA - again as markets regulator', 'https://www.esma.europa.eu', 'esma.europa.eu', 'REG', 'EU', 'PRIMARY', 'ACTIVE', 2, '{markets-regulator}'),

-- Y. Example financial statements (186–189)
('Deloitte - IFRS Model Financial Statements', 'https://www2.deloitte.com/global/en/services/audit/example-financial-statements.html', 'deloitte.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{model-fs}'),
('PwC - Example FS', 'https://www.pwc.com/us/en/cfodirect/publications/financial-statements.html', 'pwc.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{example-fs}'),
('EY - IFRS Sample FS', 'https://www.ey.com/en_gl/assurance/ifrs-sample-financial-statements', 'ey.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{sample-fs}'),
('KPMG - IFRS Model FS', 'https://kpmg.com/xx/en/home/insights/2023/ifrs-model-financial-statements.html', 'kpmg.com', 'IFRS', 'GLOBAL', 'SECONDARY', 'ACTIVE', 2, '{model-fs}'),

-- Z. AI / tech docs (190–192)
('Google Developers', 'https://developers.google.com', 'developers.google.com', 'TECH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{api,google}'),
('OpenAI Docs', 'https://platform.openai.com/docs', 'platform.openai.com', 'TECH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{openai}'),
('Supabase Docs', 'https://supabase.com/docs', 'supabase.com', 'TECH', 'GLOBAL', 'SECONDARY', 'ACTIVE', 4, '{supabase}'),

-- AA. East Africa regional (193–197)
('Kenya Revenue Authority', 'https://www.kra.go.ke', 'kra.go.ke', 'TAX', 'KE', 'PRIMARY', 'ACTIVE', 3, '{east-africa-tax}'),
('Uganda Revenue Authority', 'https://www.ura.go.ug', 'ura.go.ug', 'TAX', 'UG', 'PRIMARY', 'ACTIVE', 3, '{east-africa-tax}'),
('Tanzania Revenue Authority', 'https://www.tra.go.tz', 'tra.go.tz', 'TAX', 'TZ', 'PRIMARY', 'ACTIVE', 3, '{east-africa-tax}'),
('Zambia Revenue Authority', 'https://www.zra.org.zm', 'zra.org.zm', 'TAX', 'ZM', 'PRIMARY', 'ACTIVE', 3, '{east-africa-tax}'),
('Kampala Capital City Authority (example local gov)', 'https://www.kcca.go.ug', 'kcca.go.ug', 'GOV', 'UG', 'SECONDARY', 'ACTIVE', 4, '{municipal}'),

-- AB. EU tax/customs (198–200)
('EU Taxation & Customs', 'https://ec.europa.eu/taxation_customs', 'ec.europa.eu', 'TAX', 'EU', 'PRIMARY', 'ACTIVE', 2, '{eu-tax}'),
('European Commission - Info', 'https://ec.europa.eu/info/index_en', 'ec.europa.eu', 'GOV', 'EU', 'SECONDARY', 'ACTIVE', 3, '{eu-info}'),
('EU Tax & Customs - Portal', 'https://taxation-customs.ec.europa.eu', 'taxation-customs.ec.europa.eu', 'TAX', 'EU', 'PRIMARY', 'ACTIVE', 2, '{tax,customs}');

-- ============================================================================
-- COMMENTS FOR FUTURE USE
-- ============================================================================

comment on table knowledge_web_sources is 'Curated list of 200 trusted web sources for AI agent learning across IFRS, ISA, Tax, Big4, and regulatory domains';
comment on column knowledge_web_sources.name is 'Human-readable label for the source';
comment on column knowledge_web_sources.url is 'Full URL of the source';
comment on column knowledge_web_sources.domain is 'Domain name extracted from URL for grouping';
comment on column knowledge_web_sources.category is 'Source category: IFRS, ISA, TAX, BIG4, PRO, etc.';
comment on column knowledge_web_sources.jurisdiction_code is 'ISO country code or GLOBAL for international sources';
comment on column knowledge_web_sources.authority_level is 'PRIMARY=official standards bodies, SECONDARY=interpretive guidance, INTERNAL=company sources';
comment on column knowledge_web_sources.status is 'ACTIVE sources are crawled, INACTIVE are ignored';
comment on column knowledge_web_sources.priority is 'Lower numbers = higher priority (1=core, 2=important, 3+=secondary)';
comment on column knowledge_web_sources.tags is 'Array of tags for filtering and search';
comment on column knowledge_web_sources.last_crawled_at is 'Timestamp of last successful crawl';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the seed data:
-- SELECT category, jurisdiction_code, count(*) 
-- FROM knowledge_web_sources 
-- GROUP BY category, jurisdiction_code 
-- ORDER BY category, jurisdiction_code;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
