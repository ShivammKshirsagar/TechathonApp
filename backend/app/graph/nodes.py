# backend/app/services/llm_service.py
from __future__ import annotations

import os
import json
from typing import Any, Dict, List, Optional, AsyncIterator, Callable
from dataclasses import dataclass
from functools import lru_cache

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import BaseTool, tool
from langchain_core.runnables import RunnableConfig
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult


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
    temperature: float = 0.2
    max_tokens: Optional[int] = None
    timeout: int = 30
    
    @classmethod
    def from_env(cls) -> "LLMConfig":
        """Load from environment with fallbacks"""
        return cls(
            api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY", ""),
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            base_url=os.getenv("LLM_BASE_URL"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.2")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2000")) if os.getenv("LLM_MAX_TOKENS") else None,
            timeout=int(os.getenv("LLM_TIMEOUT", "30")),
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
            kwargs = {
                "model": self.config.model,
                "temperature": self.config.temperature,
                "max_tokens": self.config.max_tokens,
                "timeout": self.config.timeout,
                "api_key": self.config.api_key,
            }
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


# Tool definitions for lending
@tool
async def calculate_emi(principal: float, tenure_months: int, interest_rate: float = 12.5) -> str:
    """Calculate EMI and total interest"""
    r = interest_rate / (12 * 100)
    emi = (principal * r * (1 + r)**tenure_months) / ((1 + r)**tenure_months - 1)
    total_payment = emi * tenure_months
    total_interest = total_payment - principal
    
    return json.dumps({
        "emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "total_payment": round(total_payment, 2),
        "affordability_check": "Calculate EMI/monthly_income to check affordability"
    })


@tool
async def analyze_purpose(purpose: str) -> str:
    """Categorize loan purpose and assess risk profile"""
    purpose_lower = purpose.lower()
    
    categories = {
        "debt_consolidation": {"risk": "low", "urgency": "high", "typical_tenure": 36},
        "medical": {"risk": "medium", "urgency": "critical", "typical_tenure": 12},
        "wedding": {"risk": "medium", "urgency": "high", "typical_tenure": 24},
        "education": {"risk": "low", "urgency": "medium", "typical_tenure": 60},
        "business": {"risk": "high", "urgency": "medium", "typical_tenure": 48},
        "home_renovation": {"risk": "low", "urgency": "low", "typical_tenure": 84},
    }
    
    # Simple keyword matching - in production use LLM classification
    for keyword, profile in categories.items():
        if keyword.replace("_", " ") in purpose_lower or keyword in purpose_lower:
            return json.dumps({
                "category": keyword,
                "risk_profile": profile["risk"],
                "urgency": profile["urgency"],
                "suggested_tenure": profile["typical_tenure"],
                "reasoning": f"Detected {keyword} purpose"
            })
    
    return json.dumps({
        "category": "other",
        "risk_profile": "medium",
        "urgency": "medium",
        "suggested_tenure": 36,
        "reasoning": "General purpose loan"
    })


@tool
async def check_affordability(monthly_income: float, existing_emis: float, proposed_emi: float) -> str:
    """Check if loan is affordable using FOIR (Fixed Obligation to Income Ratio)"""
    total_obligations = existing_emis + proposed_emi
    foir = (total_obligations / monthly_income) * 100
    
    status = "comfortable" if foir < 30 else "stretched" if foir < 50 else "risky" if foir < 60 else "rejected"
    
    return json.dumps({
        "foir_percentage": round(foir, 2),
        "status": status,
        "max_recommended_emi": round(monthly_income * 0.5, 2),
        "available_for_new_emi": round(monthly_income * 0.5 - existing_emis, 2),
        "recommendation": "Proceed" if status in ["comfortable", "stretched"] else "Reduce amount or tenure"
    })