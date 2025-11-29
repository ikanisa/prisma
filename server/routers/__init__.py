"""
FastAPI Router modules for the Prisma Glow API.

This package contains modular API routers that organize endpoints by domain.
The routers are designed to be progressively extracted from main.py to improve
code organization and maintainability.

Router modules:
- iam: Identity and Access Management (organizations, members, teams, profiles)
- admin: Administrative functions (org settings, audit logs, impersonation)
- retrieval: RAG and vector store operations
- storage: Document storage and management
- tasks: Task management endpoints
- knowledge: Knowledge base and corpus management
- controls: Internal controls and compliance
"""

from typing import List

# List of all router modules for easy importing
__all__: List[str] = []
