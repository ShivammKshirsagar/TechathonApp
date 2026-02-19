from __future__ import annotations

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings for backend services and providers."""

    llm_provider: str = Field("openai", validation_alias="LLM_PROVIDER")
    llm_api_key: str = Field("", validation_alias="LLM_API_KEY")
    openai_api_key: str = Field("", validation_alias="OPENAI_API_KEY")
    llm_model: str = Field("gpt-4o-mini", validation_alias="LLM_MODEL")
    llm_base_url: Optional[str] = Field(None, validation_alias="LLM_BASE_URL")
    llm_temperature: float = Field(0.2, validation_alias="LLM_TEMPERATURE")
    llm_max_tokens: Optional[int] = Field(None, validation_alias="LLM_MAX_TOKENS")
    llm_timeout: int = Field(30, validation_alias="LLM_TIMEOUT")

    azure_openai_endpoint: Optional[str] = Field(None, validation_alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_deployment: Optional[str] = Field(None, validation_alias="AZURE_OPENAI_DEPLOYMENT")
    azure_openai_api_version: str = Field(
        "2024-02-15-preview", validation_alias="AZURE_OPENAI_API_VERSION"
    )

    postgres_dsn: Optional[str] = Field(None, validation_alias="POSTGRES_DSN")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
