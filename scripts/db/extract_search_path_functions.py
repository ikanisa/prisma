#!/usr/bin/env python3
import re
from pathlib import Path

MIGRATIONS = [
    Path("supabase/migrations/20250821115117_.sql"),
    Path("supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql"),
    Path("supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql"),
    Path("supabase/migrations/20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql"),
    Path("supabase/migrations/20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql"),
    Path("supabase/migrations/20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql"),
    Path("supabase/migrations/20250830125839_.sql"),
    Path("supabase/migrations/20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql"),
    Path("supabase/migrations/20250924014606_remote_schema.sql"),
    Path("supabase/migrations/20250924112000_activity_log_enrichment.sql"),
    Path("supabase/migrations/20250924141001_tax_mt_nid_patent_box_rls.sql"),
    Path("supabase/migrations/20250924231000_rate_limits.sql"),
    Path("supabase/migrations/20250925220000_app_is_member_of_wrapper.sql"),
    Path("supabase/migrations/20251018101620_remote_schema.sql"),
    Path("supabase/migrations/20251115090000_notification_fanout.sql"),
]

FUNCTION_PATTERN = re.compile(
    r"CREATE\s+OR\s+REPLACE\s+FUNCTION.*?\$\$;\s*",
    re.IGNORECASE | re.DOTALL,
)

SEARCH_PATH_PATTERN = re.compile(r"SET\s+search_path", re.IGNORECASE)

output_lines = [
    "-- Auto-generated list of security-definer functions with explicit search paths",
    "SET check_function_bodies = false;",
]

for path in MIGRATIONS:
    content = path.read_text()
    matches = FUNCTION_PATTERN.findall(content)
    selected = [m for m in matches if SEARCH_PATH_PATTERN.search(m)]
    if not selected:
        continue
    output_lines.append(f"\n-- From {path}")
    output_lines.extend(selected)

output_path = Path("test-results/supabase/search_path_functions.sql")
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text("\n".join(output_lines))

print(f"Wrote {output_path}")
