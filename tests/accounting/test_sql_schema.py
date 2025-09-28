from pathlib import Path

SCHEMA_PATH = Path('supabase/accounting_A2_schema.sql')

TABLES = {
    'public.accounting_trace_events': 'Trace event log',
    'public.accounting_consolidation_runs': 'Consolidation runs',
    'public.accounting_revenue_contracts': 'Revenue contracts',
    'public.accounting_lease_measurements': 'Lease measurements',
    'public.accounting_ecl_runs': 'ECL runs',
    'public.accounting_impairment_tests': 'Impairment tests',
    'public.accounting_tax_packs': 'Tax packs',
    'public.accounting_cash_flow_blueprints': 'Cash flow builder',
    'public.accounting_disclosure_composer': 'Disclosure composer',
    'public.accounting_esef_exports': 'ESEF exports',
    'public.accounting_basis_switches': 'Basis switcher',
    'public.accounting_industry_toggles': 'Industry toggles',
    'public.accounting_specialised_packs': 'Specialised packs',
    'public.accounting_governance_telemetry': 'Governance telemetry',
}


def test_schema_tables_present():
    sql = SCHEMA_PATH.read_text()
    for table in TABLES:
        create_stmt = f"CREATE TABLE IF NOT EXISTS {table}"
        assert create_stmt in sql, f"Missing table definition for {table}"
        assert f"ALTER TABLE {table.split('.')[-1]}" not in sql, "Schema uses fully qualified table names"


def test_schema_rls_policies():
    sql = SCHEMA_PATH.read_text()
    for table in TABLES:
        short = table.split('.')[-1]
        assert f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY" in sql
        assert f'CREATE POLICY "{short}_read"' in sql or table.endswith('trace_events'), f"Missing read policy for {table}"
        if not table.endswith('trace_events'):
            assert f'CREATE POLICY "{short}_write"' in sql, f"Missing write policy for {table}"


def test_schema_mentions_trace_reuse():
    sql = SCHEMA_PATH.read_text()
    assert 'accounting_trace_events' in sql
    assert sql.count('trace_id UUID REFERENCES public.accounting_trace_events') >= 10
