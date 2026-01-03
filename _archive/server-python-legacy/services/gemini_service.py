"""
Gemini AI Service
Provides Google Generative AI integration for agent capabilities.
"""
import os
import logging
from typing import Optional, Dict, Any, AsyncIterator
from datetime import datetime, timedelta

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("google-generativeai not installed. Install with: pip install google-generativeai")

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter for API calls"""
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: list[datetime] = []
    
    def can_proceed(self) -> bool:
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)
        self.requests = [req for req in self.requests if req > cutoff]
        
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        return False
    
    def wait_time(self) -> float:
        if not self.requests:
            return 0.0
        oldest = min(self.requests)
        wait = (oldest + timedelta(seconds=self.window_seconds) - datetime.now()).total_seconds()
        return max(0.0, wait)


class GeminiService:
    """
    Google Generative AI (Gemini) service for agent operations.
    
    Features:
    - Model initialization with configuration
    - Prompt management and templating
    - Response parsing and validation
    - Error handling with retries
    - Rate limiting
    - Streaming support
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-pro",
        max_requests_per_minute: int = 60
    ):
        if not GEMINI_AVAILABLE:
            raise ImportError(
                "google-generativeai is not installed. "
                "Install it with: pip install google-generativeai"
            )
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable or api_key parameter required")
        
        self.model_name = model_name
        self.rate_limiter = RateLimiter(max_requests=max_requests_per_minute)
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        
        # Initialize model
        self.model = genai.GenerativeModel(self.model_name)
        
        logger.info(f"Gemini service initialized with model: {model_name}")
    
    def _build_prompt(self, template: str, variables: Dict[str, Any]) -> str:
        """
        Build a prompt from a template with variables.
        
        Args:
            template: Prompt template with {variable} placeholders
            variables: Dictionary of variable values
            
        Returns:
            Formatted prompt string
        """
        try:
            return template.format(**variables)
        except KeyError as e:
            logger.error(f"Missing variable in prompt template: {e}")
            raise ValueError(f"Missing required variable: {e}")
    
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Generate a response from a prompt.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional generation parameters
            
        Returns:
            Generated text response
            
        Raises:
            RuntimeError: If rate limit exceeded or API error
        """
        if not self.rate_limiter.can_proceed():
            wait_time = self.rate_limiter.wait_time()
            logger.warning(f"Rate limit exceeded. Wait {wait_time:.1f}s")
            raise RuntimeError(f"Rate limit exceeded. Retry after {wait_time:.1f}s")
        
        try:
            generation_config = {
                "temperature": temperature,
            }
            if max_tokens:
                generation_config["max_output_tokens"] = max_tokens
            
            response = await self.model.generate_content_async(
                prompt,
                generation_config=generation_config,
                **kwargs
            )
            
            if not response.text:
                logger.error("Empty response from Gemini")
                raise RuntimeError("Empty response from Gemini API")
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise RuntimeError(f"Gemini API error: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncIterator[str]:
        """
        Generate a streaming response from a prompt.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature
            **kwargs: Additional generation parameters
            
        Yields:
            Text chunks as they are generated
        """
        if not self.rate_limiter.can_proceed():
            wait_time = self.rate_limiter.wait_time()
            logger.warning(f"Rate limit exceeded. Wait {wait_time:.1f}s")
            raise RuntimeError(f"Rate limit exceeded. Retry after {wait_time:.1f}s")
        
        try:
            generation_config = {"temperature": temperature}
            
            response = await self.model.generate_content_async(
                prompt,
                generation_config=generation_config,
                stream=True,
                **kwargs
            )
            
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            logger.error(f"Gemini streaming error: {str(e)}")
            raise RuntimeError(f"Gemini streaming error: {str(e)}")
    
    def parse_response(
        self,
        response: str,
        expected_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parse and validate a response.
        
        Args:
            response: Raw response text
            expected_format: Expected format (e.g., 'json', 'markdown')
            
        Returns:
            Parsed response dictionary
        """
        result = {
            "text": response,
            "timestamp": datetime.now().isoformat(),
            "model": self.model_name
        }
        
        if expected_format == "json":
            import json
            try:
                # Try to extract JSON from response
                result["data"] = json.loads(response)
            except json.JSONDecodeError:
                logger.warning("Response is not valid JSON")
                result["data"] = None
        
        return result
    
    async def generate_with_template(
        self,
        template: str,
        variables: Dict[str, Any],
        **kwargs
    ) -> str:
        """
        Generate a response using a prompt template.
        
        Args:
            template: Prompt template string
            variables: Variables to inject into template
            **kwargs: Additional generation parameters
            
        Returns:
            Generated response text
        """
        prompt = self._build_prompt(template, variables)
        return await self.generate(prompt, **kwargs)


# Singleton instance
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get or create the Gemini service singleton."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
