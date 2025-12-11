from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.src import SupportAgent, MESSAGES, rate_limited
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context for FastAPI: initialize and cleanup the SupportAgent."""
    # initialize
    app.state.agent = None
    app.state.model_names = []

    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
    MODEL_NAMES = os.getenv("MODEL_NAMES", "llama3.1-8b").split(",")

    if not CEREBRAS_API_KEY:
        logger.error("CEREBRAS_API_KEY environment variable is required")
        raise RuntimeError("CEREBRAS_API_KEY environment variable is required")

    logger.info("Initializing SupportAgent with models: %s", MODEL_NAMES)
    app.state.agent = SupportAgent(
        api_key=CEREBRAS_API_KEY,
        model_names=MODEL_NAMES,
        temperature=0.7,
    )
    app.state.model_names = MODEL_NAMES

    try:
        yield
    finally:
        # cleanup on shutdown
        agent = getattr(app.state, 'agent', None)
        if agent and hasattr(agent, 'close'):
            try:
                close_result = agent.close()
                if close_result and hasattr(close_result, '__await__'):
                    await close_result
            except Exception:
                logger.exception("Error while closing agent during shutdown")


app = FastAPI(title="Solaira Solar Chatbot API", lifespan=lifespan)

# CORS configuration for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",
        # Add your production domain when deploying
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the AI agent
"""
Lifespan-based startup/shutdown replaced app.on_event usage. The asynccontextmanager
`lifespan` ensures the agent is created while an event loop is running and is cleaned up
on shutdown. This avoids the deprecation warning for `on_event` and the "no running loop"
errors that occur when creating async components at import time.
"""

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    user_id: str
    energy_data: dict | None = None

class ChatResponse(BaseModel):
    response: str
    error: str | None = None

class HealthResponse(BaseModel):
    status: str
    message: str

# API Endpoints

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Solaira Solar Chatbot API is running"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for the solar AI assistant.
    
    Args:
        request: ChatRequest containing message, user_id, and optional energy_data
        
    Returns:
        ChatResponse with AI response or error message
    """
    try:
        # Validate message length
        if len(request.message) > 2000:
            return ChatResponse(
                response="",
                error=MESSAGES["length"]
            )
        
        # Check rate limiting
        if rate_limited(request.user_id):
            return ChatResponse(
                response="",
                error=MESSAGES["rate_limited"]
            )
        
        # Enhance prompt with energy data context if provided
        enhanced_prompt = request.message
        if request.energy_data:
            context = f"""
Current Energy System Status:
- Solar Production: {request.energy_data.get('solar', 0)} kW
- Grid Import: {request.energy_data.get('grid_import', 0)} kW
- Home Consumption: {request.energy_data.get('home_consumption', 0)} kW
- Grid Export: {request.energy_data.get('grid_export', 0)} kW

User Question: {request.message}
"""
            enhanced_prompt = context
        
        # Get AI response
        logger.info(f"Processing request from user: {request.user_id}")
        agent = getattr(app.state, 'agent', None)
        if not agent:
            logger.error("Agent not initialized")
            return ChatResponse(response="", error="Agent not initialized")

        response_text = await app.state.agent.get_response(
            prompt=enhanced_prompt,
            member_username=request.user_id
        )
        
        return ChatResponse(
            response=response_text,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        return ChatResponse(
            response="",
            error="Sorry, I encountered an error processing your request. Please try again."
        )

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check endpoint"""
    model_msg = None
    model_list = getattr(app.state, 'model_names', None)
    if model_list:
        model_msg = f"Agent initialized with model: {model_list[0]}"
    else:
        model_msg = "Agent not yet initialized"

    return {
        "status": "healthy",
        "message": model_msg
    }

if __name__ == "__main__":
    import uvicorn
    # When running via `python main.py` we avoid `reload=True` because
    # reload mode requires passing the application as an import string.
    # For development with auto-reload use the CLI: `uvicorn main:app --reload`
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)