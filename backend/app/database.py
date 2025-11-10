import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Singleton Supabase client for database operations."""
    
    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None
    
    def __new__(cls) -> 'SupabaseClient':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self) -> None:
        """Initialize the Supabase client."""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
            
            if not supabase_url or not supabase_key:
                raise ValueError(
                    "Missing required environment variables: SUPABASE_URL and "
                    "(SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)"
                )
            
            self._client = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance."""
        if self._client is None:
            self._initialize_client()
        return self._client
    
    def health_check(self) -> bool:
        """Check if Supabase connection is healthy."""
        try:
            # Try a simple query to test connection
            response = self.client.from_("users").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return False


# Global instance
supabase_client = SupabaseClient()


def get_supabase_client() -> Client:
    """Get the Supabase client instance."""
    return supabase_client.client