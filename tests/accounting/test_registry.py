from pathlib import Path
import re

METADATA_PATH = Path('apps/web/lib/accounting/metadata.ts')

EXPECTED_MODULES = {
    'consolidation': 'Group Consolidation',
    'revenue': 'Revenue Contracts',
    'leases': 'Lease Measurements',
    'ecl': 'Financial Instruments & ECL',
    'impairment': 'Impairment Testing',
    'tax': 'Income Tax Packs',
    'cashflow': 'Cash Flow Builder',
    'disclosures': 'Disclosure Composer',
    'esef': 'ESEF / iXBRL Exporter',
    'gapsme': 'Basis Switcher (GAPSME)',
    'industry': 'Industry Toggles',
    'specialised': 'Specialised Industry Packs',
    'telemetry': 'Governance Telemetry',
}


def test_module_registry_integrity():
    text = METADATA_PATH.read_text()
    discovered_keys = re.findall(r"key: '([a-z]+)'", text)
    assert set(EXPECTED_MODULES.keys()).issubset(discovered_keys)
    assert len(discovered_keys) >= len(EXPECTED_MODULES)

    for key, title in EXPECTED_MODULES.items():
        assert f"key: '{key}'" in text
        assert title in text

    # Ensure default payloads highlight critical data for tricky modules.
    assert 'performanceObligations' in text
    assert 'industries: [' in text
    assert 'newConcepts' in text


def test_metadata_exports_keys_list():
    text = METADATA_PATH.read_text()
    assert 'export const ACCOUNTING_MODULE_KEYS' in text
    # Ensure ordering includes consolidation first for workspace navigation.
    assert text.index("'consolidation'") < text.index("'revenue'")
