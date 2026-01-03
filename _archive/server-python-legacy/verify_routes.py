import os
import sys
from fastapi.routing import APIRoute

# Mock environment variables to allow import
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-key"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-service-key"
os.environ["OPENAI_API_KEY"] = "mock-openai-key"
os.environ["ANTHROPIC_API_KEY"] = "mock-anthropic-key"

try:
    from server.main import app

    print("Successfully imported app.")

    iam_routes = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            if "/api/iam" in route.path:
                iam_routes.append(f"{route.methods} {route.path}")

    print("\nRegistered IAM Routes:")
    for r in sorted(iam_routes):
        print(r)

    expected_routes = [
        "/api/iam/profile/get",
        "/api/iam/profile/update",
        "/api/iam/members/list",
        "/api/iam/members/invite",
        "/api/iam/teams/create"
    ]

    missing = []
    for expected in expected_routes:
        found = any(expected in r for r in iam_routes)
        if not found:
            missing.append(expected)

    if missing:
        print(f"\n❌ Missing expected routes: {missing}")
        sys.exit(1)
    else:
        print("\n✅ All expected IAM routes found.")
        sys.exit(0)

except Exception as e:
    print(f"\n❌ Failed to import app or verify routes: {e}")
    sys.exit(1)
