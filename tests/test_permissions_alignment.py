import os

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

import pytest

pytest.importorskip('fastapi')

from server.config_loader import get_config_permission_map
import server.main as main


def test_permission_map_matches_system_config():
    config_map = get_config_permission_map()
    main.clear_permission_map_cache()
    permission_map = main.get_permission_map_snapshot()
    for key, role in config_map.items():
        assert permission_map.get(key) == role
