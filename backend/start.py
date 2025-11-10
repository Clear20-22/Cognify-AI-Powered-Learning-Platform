"""
Start the EduAI backend server with full Supabase integration
"""
import uvicorn
import os
import sys

def main():
    """Start the EduAI server with enhanced features."""
    print("🚀 Starting EduAI Backend Server...")
    print("📍 Server will run at: http://localhost:8000")
    print("🔗 API docs at: http://localhost:8000/docs")
    print("� Interactive docs at: http://localhost:8000/redoc")
    print()
    
    # Check for Gemini API key
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        print("✅ Gemini API key found - Real AI responses enabled")
    else:
        print("⚠️  No Gemini API key - Demo responses will be used")
    
    # Check for Supabase configuration
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if supabase_url and supabase_key:
        print("✅ Supabase configuration found - Database features enabled")
    else:
        print("⚠️  Missing Supabase configuration - Database features will be limited")
        print("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
    
    print()
    print("🎯 Available API endpoints:")
    print("   • /api/users - User management")
    print("   • /api/chats - Chat management") 
    print("   • /api/exams - Exam system")
    print("   • /health - Health check")
    print("   • /chat - Legacy chat endpoint")
    print()
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Shutting down EduAI backend...")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()