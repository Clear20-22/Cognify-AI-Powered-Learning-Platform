"""
Quick MongoDB Connection Test
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import ssl
import certifi

load_dotenv()

async def test_connection():
    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "cognify_db")
    
    print(f"🔍 Testing MongoDB connection...")
    print(f"📦 Database: {database_name}")
    print(f"🔗 URI: {mongodb_uri[:30]}...{mongodb_uri[-20:]}")
    
    try:
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        client = AsyncIOMotorClient(
            mongodb_uri,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=True
        )
        db = client[database_name]
        
        # Test connection with ping
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        
        # List collections
        collections = await db.list_collection_names()
        print(f"📚 Collections found: {collections if collections else 'None (empty database)'}")
        
        # Get database stats
        stats = await db.command("dbStats")
        print(f"💾 Database size: {stats.get('dataSize', 0) / 1024:.2f} KB")
        print(f"📊 Number of collections: {stats.get('collections', 0)}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed!")
        print(f"Error: {e}")
        print(f"\n💡 Possible issues:")
        print("   1. Incorrect password - verify in MongoDB Atlas")
        print("   2. IP not whitelisted - check Network Access in MongoDB Atlas")
        print("   3. Database user permissions - verify user has correct roles")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())
