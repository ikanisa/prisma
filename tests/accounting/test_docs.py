from pathlib import Path

DOC_DIR = Path('STANDARDS/POLICY')
MODULE_DOCS = {
    'consolidation': 'Group Consolidation Guide',
    'revenue': 'Revenue Contracts Guide',
    'leases': 'Lease Measurement Guide',
    'ecl': 'Financial Instruments & ECL Guide',
    'impairment': 'Impairment Testing Guide',
    'tax': 'Income Tax Pack Guide',
    'cashflow': 'Cash Flow Builder Guide',
    'disclosures': 'Disclosure Composer Guide',
    'esef': 'ESEF / iXBRL Exporter Guide',
    'gapsme': 'Basis Switcher (GAPSME) Guide',
    'industry': 'Industry Toggle Guide',
    'specialised': 'Specialised Pack Guide',
    'telemetry': 'Governance Telemetry Guide',
}


def test_guides_cover_modules():
    for key, title in MODULE_DOCS.items():
        path = DOC_DIR / f'{key}.md'
        assert path.exists(), f'Missing policy guide for {key}'
        content = path.read_text()
        assert title in content
        assert '## Overview' in content
        assert '## Payload Requirements' in content
        assert '## Approval Matrix' in content
        assert 'Endpoint:' in content
        assert 'Trace:' in content


def test_directory_index():
    index = (DOC_DIR / 'README.md').read_text()
    for title in MODULE_DOCS.values():
        assert any(word in index for word in title.split()), f'{title} not referenced in README'
