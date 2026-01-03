"""
Gemini Chat API Endpoints
Provides chat and streaming endpoints for Gemini integration
"""
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from typing import List, Optional, AsyncGenerator
from pydantic import BaseModel
import os
import json

from server.agents.gemini_provider import GeminiAgentProvider

router = APIRouter(prefix="/api/gemini", tags=["gemini"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gemini-2.0-flash-exp"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


class ChatResponse(BaseModel):
    content: str
    model: str
    tokens_used: int = 0
    finish_reason: str = "stop"


class AgentCreateRequest(BaseModel):
    name: str
    instructions: str
    tools: Optional[List[dict]] = []
    model: Optional[str] = "gemini-2.0-flash-exp"


class AgentCreateResponse(BaseModel):
    agent_id: str


# Initialize Gemini provider
gemini_provider = GeminiAgentProvider()


def verify_api_key(authorization: Optional[str] = Header(None)):
    """Verify API key from header or environment"""
    if authorization and authorization.startswith("Bearer "):
        return authorization.replace("Bearer ", "")
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="GOOGLE_API_KEY not configured"
        )
    return api_key


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Send a chat request to Gemini API
    
    Returns a complete response after generation finishes.
    """
    try:
        # Verify API key
        api_key = verify_api_key(authorization)
        
        # Build conversation history
        conversation = "\n".join([
            f"{msg.role}: {msg.content}" 
            for msg in request.messages
        ])
        
        # Get last message
        user_message = request.messages[-1].content if request.messages else ""
        
        # Import here to avoid circular dependency
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Create model
        model = genai.GenerativeModel(
            model_name=request.model,
            generation_config=genai.types.GenerationConfig(
                temperature=request.temperature,
                max_output_tokens=request.max_tokens,
            )
        )
        
        # Generate response
        response = await model.generate_content_async(user_message)
        
        return ChatResponse(
            content=response.text,
            model=request.model,
            tokens_used=0,  # Gemini doesn't provide token count in free tier
            finish_reason="stop"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def generate_stream(
    request: ChatRequest,
    api_key: str
) -> AsyncGenerator[str, None]:
    """Generate streaming response"""
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Get last message
        user_message = request.messages[-1].content if request.messages else ""
        
        # Create model
        model = genai.GenerativeModel(
            model_name=request.model,
            generation_config=genai.types.GenerationConfig(
                temperature=request.temperature,
                max_output_tokens=request.max_tokens,
            )
        )
        
        # Stream response
        response = await model.generate_content_async(
            user_message,
            stream=True
        )
        
        async for chunk in response:
            if chunk.text:
                # SSE format
                data = json.dumps({"content": chunk.text})
                yield f"data: {data}\n\n"
        
        # Send done signal
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        error_data = json.dumps({"error": str(e)})
        yield f"data: {error_data}\n\n"


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Send a chat request with streaming response
    
    Returns Server-Sent Events (SSE) stream.
    """
    try:
        # Verify API key
        api_key = verify_api_key(authorization)
        
        return StreamingResponse(
            generate_stream(request, api_key),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents", response_model=AgentCreateResponse)
async def create_agent(
    request: AgentCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new Gemini agent with specific instructions
    """
    try:
        # Verify API key
        api_key = verify_api_key(authorization)
        
        # Create agent
        agent_id = await gemini_provider.create_agent(
            name=request.name,
            instructions=request.instructions,
            tools=[],  # Tool conversion would go here
            model=request.model
        )
        
        return AgentCreateResponse(agent_id=agent_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "gemini-chat",
        "provider": "google-generative-ai"
    }
