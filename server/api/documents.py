"""
Documents/ADA API Router
Handles ADA (Automated Document Analysis) operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/api/ada", tags=["documents", "ada"])


# ============================================================================
# Request/Response Models
# ============================================================================

class ADARunRequest(BaseModel):
    """ADA execution request"""
    document_id: str
    operation: str
    parameters: Optional[Dict[str, Any]] = None


class ADAExceptionUpdate(BaseModel):
    """ADA exception update"""
    exception_id: str
    status: str
    resolution: Optional[str] = None


# ============================================================================
# ADA Operations
# ============================================================================

@router.get("/run")
async def ada_run_get(run_id: str) -> Dict[str, Any]:
    """
    Get ADA run status
    
    TODO: Migrate from main.py
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Endpoint not yet migrated from main.py"
    )


@router.post("/run")
async def ada_run_post(request: ADARunRequest) -> Dict[str, Any]:
    """
    Execute ADA document analysis
    
    TODO: Migrate from main.py
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Endpoint not yet migrated from main.py"
    )


@router.post("/exception/update")
async def ada_exception_update(request: ADAExceptionUpdate) -> Dict[str, Any]:
    """
    Update ADA exception status
    
    TODO: Migrate from main.py
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Endpoint not yet migrated from main.py"
    )
