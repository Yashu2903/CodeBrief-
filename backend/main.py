

import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables from .env file if it exists (for development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed, skip .env loading
    pass

# Configure logging - explicitly avoid logging sensitive data
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Hugging Face Proxy API",
    description="Secure proxy for Hugging Face Router API (Chat Completions)",
    version="1.0.0"
)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
# Note: In production, you should restrict origins to your specific Chrome extension ID
# For development, allowing all origins is acceptable for a proxy service
# Chrome extensions can make cross-origin requests, so CORS is primarily for browser security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Chrome extension compatibility
    allow_credentials=False,  # No cookies/sessions needed
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Configuration
HF_API_KEY = os.getenv("HF_API_KEY")
HF_API_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "Qwen/Qwen2.5-7B-Instruct"
MAX_INPUT_SIZE = 500000  # Maximum input size in characters (~500KB)
MAX_RESPONSE_SIZE = 100000  # Maximum response size in characters (~100KB)
REQUEST_TIMEOUT = 120  # Timeout for HF API requests in seconds

# Validate that HF_API_KEY is set
if not HF_API_KEY:
    logger.error("HF_API_KEY environment variable is not set!")
    raise ValueError("HF_API_KEY environment variable must be set")


# Request/Response models
class RepoInfo(BaseModel):
    """Repository information model"""
    owner: str = Field(..., min_length=1, max_length=200)
    repo: str = Field(..., min_length=1, max_length=200)
    url: str = Field(..., min_length=1, max_length=500)

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Basic URL validation"""
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class GenerateResumeRequest(BaseModel):
    """Request model for resume generation"""
    repoInfo: RepoInfo
    formattedPrompt: str = Field(..., min_length=1)

    @field_validator('formattedPrompt')
    @classmethod
    def validate_prompt_size(cls, v: str) -> str:
        """Validate prompt size to prevent abuse"""
        if len(v) > MAX_INPUT_SIZE:
            raise ValueError(f'Prompt too large. Maximum size is {MAX_INPUT_SIZE} characters.')
        return v


class GenerateResumeResponse(BaseModel):
    """Response model for resume generation"""
    resumePoints: str


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    message: str
    status_code: int


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Hugging Face Proxy API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/generate-resume", response_model=GenerateResumeResponse)
@limiter.limit("10/minute")  # Rate limit: 10 requests per minute per IP
async def generate_resume(request: Request, body: GenerateResumeRequest):
    """
    Generate resume points from repository information and formatted prompt.
    
    This endpoint acts as a proxy to Hugging Face Inference API, keeping the
    API token secure on the server side.
    
    Security:
    - Rate limited to prevent abuse
    - Input size validation
    - No logging of prompts or responses
    - Token never exposed to client
    """
    try:
        # Validate input size (additional check beyond Pydantic)
        if len(body.formattedPrompt) > MAX_INPUT_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Input too large. Maximum size is {MAX_INPUT_SIZE} characters."
            )
        
        # Prepare request to Hugging Face API
        # Note: We do NOT log the prompt or any sensitive data
        logger.info(f"Processing request for {body.repoInfo.owner}/{body.repoInfo.repo}")
        
        # Call Hugging Face Router API
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            try:
                # Use the Hugging Face Router API with chat completions format
                # The endpoint expects OpenAI-compatible chat format
                response = await client.post(
                    HF_API_URL,
                    headers={
                        "Authorization": f"Bearer {HF_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": HF_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert technical recruiter and software engineer who writes concise ATS-optimized resume bullets. You ALWAYS include quantifiable numbers and metrics in every bullet point to demonstrate measurable impact and achievements."
                            },
                            {
                                "role": "user",
                                "content": body.formattedPrompt
                            }
                        ],
                        "max_tokens": 2000,
                        "temperature": 0.7
                    }
                )
                
                # Handle different HTTP status codes
                if response.status_code == 401:
                    logger.error("Hugging Face API authentication failed - invalid token")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Backend authentication error. Please contact the administrator."
                    )
                
                if response.status_code == 429:
                    logger.warning("Hugging Face API rate limit exceeded")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Service temporarily unavailable due to rate limits. Please try again later."
                    )
                
                if response.status_code == 503:
                    logger.warning("Hugging Face API model is loading")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Model is currently loading. Please wait 10-20 seconds and try again."
                    )
                
                if not response.is_success:
                    logger.error(f"Hugging Face API error: {response.status_code}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"External API error: {response.status_code}. Please try again later."
                    )
                
                # Parse response
                # Hugging Face Router API returns OpenAI-compatible chat completions format
                response_data = response.json()
                
                # Extract text from chat completions format: {"choices": [{"message": {"content": "..."}}]}
                resume_points = ""
                if isinstance(response_data, dict):
                    choices = response_data.get("choices", [])
                    if choices and len(choices) > 0:
                        message = choices[0].get("message", {})
                        resume_points = message.get("content", "")
                
                if not resume_points:
                    # Fallback: log and raise error if response format is unexpected
                    logger.error(f"Unexpected response format from Hugging Face API: {response_data}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Unexpected response format from external API."
                    )
                
                # Validate response size
                if len(resume_points) > MAX_RESPONSE_SIZE:
                    logger.warning("Response size exceeds maximum, truncating")
                    resume_points = resume_points[:MAX_RESPONSE_SIZE] + "\n... [truncated]"
                
                # Treat model output as plain text only - no execution or eval
                # Return the response without any processing that could execute code
                return GenerateResumeResponse(resumePoints=resume_points)
                
            except httpx.TimeoutException:
                logger.error("Hugging Face API request timed out")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Request to external API timed out. Please try again."
                )
            except httpx.RequestError as e:
                logger.error(f"Request error to Hugging Face API: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to external API. Please try again later."
                )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except ValueError as e:
        # Handle validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded"""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "status_code": 429
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

