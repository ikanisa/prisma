"""
API Router Registry
All FastAPI routers for the Prisma Glow API
"""

# Import all routers
from .agents import router as agents_router
from .analytics import router as analytics_router
from .auth import router as auth_router
from .documents import router as documents_router
from .executions import router as executions_router
from .gemini_chat import router as gemini_chat_router
from .health import router as health_router
from .knowledge import router as knowledge_router
from .learning import router as learning_router
from .organizations import router as organizations_router
from .personas import router as personas_router
from .rag import router as rag_router
from .security import router as security_router
from .tax_agents import router as tax_agents_router
from .tools import router as tools_router
from .vector_stores import router as vector_stores_router
from .workflows import router as workflows_router

# Export all routers
__all__ = [
    "agents_router",
    "analytics_router",
    "auth_router",
    "documents_router",
    "executions_router",
    "gemini_chat_router",
    "health_router",
    "knowledge_router",
    "learning_router",
    "organizations_router",
    "personas_router",
    "rag_router",
    "security_router",
    "tax_agents_router",
    "tools_router",
    "vector_stores_router",
    "workflows_router",
]
