# backend/app/services/llm_service.py
from __future__ import annotations

import os
import json
from typing import Any, Dict, List, Optional, AsyncIterator, Callable
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlparse

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import BaseTool, tool
from langchain_core.runnables import RunnableConfig
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult
from pydantic import BaseModel

from app.settings import settings


class LLMConfigError(RuntimeError):
    """Raised when LLM configuration is missing or invalid."""


class LLMServiceError(RuntimeError):
    """Raised on LLM request failures or parsing errors."""


def ensure_json_keys(payload: Any, keys: list[str]) -> Dict[str, Any]:
    """Ensure payload is a dict and contains required keys."""
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise LLMServiceError("Failed to parse JSON response.") from exc
    if not isinstance(payload, dict):
        raise LLMServiceError("Expected a JSON object response.")
    for key in keys:
        payload.setdefault(key, None)
    return payload


class StreamingCallback(AsyncCallbackHandler):
    """Capture streaming tokens for SSE"""
    
    def __init__(self):
        self.tokens: List[str] = []
    
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.tokens.append(token)


@dataclass
class LLMConfig:
    api_key: str
    model: str
    base_url: Optional[str] = None
    provider: str = "openai"
    azure_endpoint: Optional[str] = None
    azure_deployment: Optional[str] = None
    azure_api_version: Optional[str] = None
    temperature: float = 0.2
    max_tokens: Optional[int] = None
    timeout: int = 30

    @staticmethod
    def _normalize_base_url(base_url: Optional[str], provider: str) -> Optional[str]:
        """Normalize custom OpenAI-compatible URLs (e.g. Ollama) to include /v1."""
        if not base_url:
            return base_url
        parsed = urlparse(base_url)
        path = (parsed.path or "").rstrip("/")
        if provider == "azure":
            return base_url
        if path in ("", "/"):
            return f"{base_url.rstrip('/')}/v1"
        return base_url
    
    @classmethod
    def from_env(cls) -> "LLMConfig":
        """Load from environment with fallbacks"""
        provider = (settings.llm_provider or "openai").lower()
        api_key = settings.llm_api_key or settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")
        return cls(
            api_key=api_key,
            model=settings.llm_model or os.getenv("LLM_MODEL", "gpt-4o-mini"),
            base_url=cls._normalize_base_url(
                settings.llm_base_url or os.getenv("LLM_BASE_URL"),
                provider,
            ),
            provider=provider,
            azure_endpoint=settings.azure_openai_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT"),
            azure_deployment=settings.azure_openai_deployment or os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            azure_api_version=settings.azure_openai_api_version or os.getenv("AZURE_OPENAI_API_VERSION"),
            temperature=float(settings.llm_temperature),
            max_tokens=settings.llm_max_tokens,
            timeout=int(settings.llm_timeout),
        )


class AgenticLLMService:
    """
    LangChain-based LLM service with tool binding and streaming support.
    Replaces your urllib-based implementation.
    """
    
    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig.from_env()
        self._llm: Optional[ChatOpenAI] = None
        self._tools: List[BaseTool] = []
    
    @property
    def llm(self) -> ChatOpenAI:
        """Lazy initialization of LangChain LLM"""
        if self._llm is None:
            if not self.config.api_key:
                raise LLMConfigError("Missing LLM_API_KEY/OPENAI_API_KEY.")
            kwargs = {
                "model": self.config.model,
                "temperature": self.config.temperature,
                "max_tokens": self.config.max_tokens,
                "timeout": self.config.timeout,
                "api_key": self.config.api_key,
            }
            if self.config.provider == "azure":
                if not self.config.azure_endpoint or not self.config.azure_deployment:
                    raise LLMConfigError("Missing Azure OpenAI endpoint or deployment.")
                self._llm = AzureChatOpenAI(
                    azure_endpoint=self.config.azure_endpoint,
                    azure_deployment=self.config.azure_deployment,
                    api_version=self.config.azure_api_version or "2024-02-15-preview",
                    **kwargs,
                )
            else:
                if self.config.base_url:
                    kwargs["base_url"] = self.config.base_url
                self._llm = ChatOpenAI(**kwargs)
        return self._llm
    
    def bind_tools(self, tools: List[Callable]) -> "AgenticLLMService":
        """Bind tools for ReAct-style agent behavior"""
        self._tools = [t if isinstance(t, BaseTool) else tool(t) for t in tools]
        return self
    
    async def achat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        stream: bool = False,
    ) -> str:
        """Async chat with optional streaming"""
        langchain_messages = []
        
        if system_prompt:
            langchain_messages.append(SystemMessage(content=system_prompt))
        
        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        if stream:
            callback = StreamingCallback()
            response = await self.llm.ainvoke(
                langchain_messages,
                config=RunnableConfig(callbacks=[callback])
            )
            return response.content, callback.tokens
        
        response = await self.llm.ainvoke(langchain_messages)
        return response.content
    
    async def achat_with_tools(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        ReAct pattern: LLM decides to call tools or respond directly.
        Returns dict with 'content', 'tool_calls', 'reasoning'.
        """
        if not self._tools:
            raise ValueError("No tools bound. Call bind_tools() first.")
        
        # Bind tools to LLM
        llm_with_tools = self.llm.bind_tools(self._tools)
        
        langchain_messages = []
        if system_prompt:
            langchain_messages.append(SystemMessage(content=system_prompt))
        
        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        # First call - LLM decides what to do
        response = await llm_with_tools.ainvoke(langchain_messages)
        
        result = {
            "content": response.content,
            "tool_calls": [],
            "reasoning": None,
        }
        
        # Check if LLM wants to use tools
        if response.tool_calls:
            tool_results = []
            
            for tool_call in response.tool_calls:
                # Find the tool
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                # Execute tool
                selected_tool = next((t for t in self._tools if t.name == tool_name), None)
                if selected_tool:
                    try:
                        tool_output = await selected_tool.ainvoke(tool_args)
                        tool_results.append(ToolMessage(
                            content=str(tool_output),
                            tool_call_id=tool_call["id"]
                        ))
                        result["tool_calls"].append({
                            "name": tool_name,
                            "args": tool_args,
                            "output": tool_output,
                            "success": True,
                        })
                    except Exception as e:
                        tool_results.append(ToolMessage(
                            content=f"Error: {str(e)}",
                            tool_call_id=tool_call["id"]
                        ))
                        result["tool_calls"].append({
                            "name": tool_name,
                            "args": tool_args,
                            "error": str(e),
                            "success": False,
                        })
            
            # Second call with tool results
            langchain_messages.extend([response, *tool_results])
            final_response = await llm_with_tools.ainvoke(langchain_messages)
            result["content"] = final_response.content
            result["reasoning"] = f"Used tools: {[t['name'] for t in result['tool_calls']]}"
        
        return result
    
    async def achat_structured(
        self,
        messages: List[Dict[str, str]],
        output_schema: type[BaseModel],
        system_prompt: Optional[str] = None,
    ) -> BaseModel:
        """Get structured output using Pydantic schema"""
        from langchain_core.output_parsers import PydanticOutputParser
        
        parser = PydanticOutputParser(pydantic_object=output_schema)
        
        format_instructions = parser.get_format_instructions()
        full_prompt = f"{system_prompt or ''}\n\n{format_instructions}"
        
        content = await self.achat(messages, system_prompt=full_prompt)
        
        try:
            return parser.parse(content)
        except Exception as e:
            # Fallback: try to extract JSON
            json_content = self._extract_json(content)
            return output_schema(**json_content)

    def chat_json(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Synchronous JSON chat helper for backward compatibility."""
        langchain_messages = []
        if system_prompt:
            langchain_messages.append(SystemMessage(content=system_prompt))
        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))

        try:
            response = self.llm.invoke(langchain_messages)
        except Exception as exc:
            raise LLMServiceError(str(exc)) from exc

        payload = self._extract_json(response.content or "")
        return ensure_json_keys(payload, [])
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from text"""
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return {}
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            return {}
    
    async def astream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream tokens for SSE"""
        langchain_messages = []
        if system_prompt:
            langchain_messages.append(SystemMessage(content=system_prompt))
        
        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
        
        async for chunk in self.llm.astream(langchain_messages):
            yield chunk.content


# Global instance with caching
@lru_cache()
def get_llm_service() -> AgenticLLMService:
    """Get singleton LLM service"""
    return AgenticLLMService()


# Backward compatibility
def get_llm() -> AgenticLLMService:
    return get_llm_service()
