from pathlib import Path

PAGE_PATH = Path('apps/web/app/accounting/page.tsx')
PAGE_CONTENT = PAGE_PATH.read_text()


def test_workspace_declares_client_component():
    assert PAGE_CONTENT.lstrip().startswith("'use client';")


def test_workspace_iterates_modules_from_metadata():
    assert 'const modules = useMemo(() => ACCOUNTING_MODULES' in PAGE_CONTENT
    assert 'modules.map((module) => {' in PAGE_CONTENT
    assert 'module.title' in PAGE_CONTENT
    assert 'module.description' in PAGE_CONTENT
    assert 'module.acceptanceCriteria.map' in PAGE_CONTENT


def test_workspace_calls_accounting_api():
    assert "fetch(`/api/accounting/${module}`" in PAGE_CONTENT
    assert 'submitModule(module.key)' in PAGE_CONTENT
    assert 'payloads[module.key]' in PAGE_CONTENT
    assert 'responses[module.key]' in PAGE_CONTENT


def test_workspace_surface_accessibility_labels():
    assert 'aria-labelledby="accounting-workspace-heading"' in PAGE_CONTENT
    assert 'aria-label="Accounting modules"' in PAGE_CONTENT
