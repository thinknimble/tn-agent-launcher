from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.providers.google_gla import GoogleGLAProvider
from pydantic_ai.providers.openai import OpenAIProvider


def create_agent(provider, model, api_key, target_url=None):
    base_agent = None
    match provider:
        case "GEMINI":
            base_agent = GeminiModel(model, provider=GoogleGLAProvider(api_key=api_key))

        case "OPENAI":
            base_agent = OpenAIModel(model_name=model, provider=OpenAIProvider(api_key=api_key))
        case "OLLAMA":
            base_agent = OpenAIModel(
                model_name=model, provider=OpenAIProvider(base_url=target_url, api_key=api_key)
            )
        case "ANTHROPIC":
            base_agent = AnthropicModel(
                model_name=model, provider=AnthropicProvider(api_key=api_key)
            )

    return base_agent
