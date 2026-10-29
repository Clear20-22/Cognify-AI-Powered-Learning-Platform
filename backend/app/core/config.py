"""
Core Configuration Settings
Centralized configuration using Pydantic Settings
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # App Info
    APP_NAME: str = "Cognify AI Learning Platform"
    APP_VERSION: str = "3.0.0"
    APP_DESCRIPTION: str = "Modern AI-powered educational platform"
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]
    
    # Server Settings
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Database Settings
    MONGODB_URI: Optional[str] = None
    DATABASE_NAME: str = "cognify_db"
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # AI Service Settings
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    AI_MODEL_GROQ: str = "openai/gpt-oss-120b"
    AI_MODEL_GEMINI: str = "gemini-3.8-flash"
    AI_MAX_TOKENS: int = 2048
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
