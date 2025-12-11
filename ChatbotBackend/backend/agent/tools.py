from langchain_core.tools import tool
from pathlib import Path


PROMPTS_DIR = Path(__file__).parents[1] / "prompts"


@tool
def get_error_handling_prompt() -> str:
    """Retrieves the Error Handling event info."""
    prompt_path = PROMPTS_DIR / "error_handling.txt"
    return prompt_path.read_text(encoding="utf-8")


@tool
def get_response_guidelines_prompt() -> str:
    """Retrieves the Response Guidelines event info."""
    prompt_path = PROMPTS_DIR / "response_guidelines.txt"
    return prompt_path.read_text(encoding="utf-8")


@tool
def get_safety_guardrails_prompt() -> str:
    """Retrieves the Safety Guardrails event info."""
    prompt_path = PROMPTS_DIR / "safety_guardrails.txt"
    return prompt_path.read_text(encoding="utf-8")


@tool
def get_solar_context_prompt() -> str:
    """Retrieves the Solar Context event info."""
    prompt_path = PROMPTS_DIR / "solar_context.txt"
    return prompt_path.read_text(encoding="utf-8")


@tool
def get_tool_guidelines_prompt() -> str:
    """Retrieves the Tool Guidelines event info."""
    prompt_path = PROMPTS_DIR / "tool_guidelines.txt"
    return prompt_path.read_text(encoding="utf-8")


@tool
def get_user_personas_prompt() -> str:
    """Retrieves the User Personas event info."""
    prompt_path = PROMPTS_DIR / "user_personas.txt"
    return prompt_path.read_text(encoding="utf-8")


TOOLS = [
    get_error_handling_prompt,
    get_response_guidelines_prompt,
    get_safety_guardrails_prompt,
    get_solar_context_prompt,
    get_tool_guidelines_prompt,
    get_user_personas_prompt,
]
