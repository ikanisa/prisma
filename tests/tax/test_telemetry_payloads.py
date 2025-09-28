from __future__ import annotations


def test_activity_snapshot_contains_decision_and_metrics():
    response = {
        'scenario': 'FY24 Filing',
        'result': {
            'module': 'tax.mt.cit',
            'metrics': {'taxableIncome': 720000, 'taxDue': 252000, 'effectiveRate': 0.21},
            'workflow': {
                'decision': 'approved',
                'reasons': [],
                'approvalsRequired': [],
                'nextSteps': ['Archive computation output with working papers'],
            },
            'telemetry': {'revenue': 1250000, 'taxableIncome': 720000, 'taxDue': 252000, 'effectiveRate': 0.21},
            'evidence': {'carryForward': 50000, 'adjustments': 10000},
        },
        'activity': {
            'id': '123e4567-e89b-12d3-a456-426614174000',
            'module': 'tax.mt.cit',
            'scenario': 'FY24 Filing',
            'decision': 'approved',
            'summary': 'Malta CIT computation executed',
            'metrics': {'taxableIncome': 720000, 'taxDue': 252000},
            'timestamp': '2025-01-15T12:00:00Z',
            'actor': 'analyst@malta.co',
        },
    }

    telemetry = response['result']['telemetry']
    assert set(telemetry.keys()) >= {'taxableIncome', 'taxDue'}
    assert all(isinstance(value, (int, float)) for value in telemetry.values())

    activity = response['activity']
    assert activity['decision'] == response['result']['workflow']['decision']
    assert activity['metrics']['taxDue'] == response['result']['metrics']['taxDue']
