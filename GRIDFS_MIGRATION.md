# GridFS Migration Guide

## Overview

The document storage system has been migrated from **local filesystem** to **MongoDB GridFS**. This allows PDF/PPTX files to be stored directly in MongoDB alongside their metadata.

## What Changed

### Before (Filesystem Storage)

- Files stored in: `uploads/{user_id}/{doc_id}.pdf`
- MongoDB stored: metadata + file path reference
- Required filesystem access for file serving

### After (GridFS Storage)

- Files stored in: MongoDB GridFS (binary storage)
- MongoDB stores: metadata + GridFS file ID
- No filesystem dependency (except temp files during processing)

## Benefits

✅ **Centralized Storage**: All data in MongoDB (easier backup/restore)  
✅ **Scalability**: No filesystem size limits or inode constraints  
✅ **Cloud-Ready**: Works seamlessly with MongoDB Atlas  
✅ **Consistency**: Atomic operations with metadata  
✅ **Replication**: Files automatically replicated with MongoDB

## Technical Implementation

### 1. Database Layer (`app/db/base.py`)

```python
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

# GridFS bucket initialization
self.fs = AsyncIOMotorGridFSBucket(db)
```

### 2. Document Model (`app/models/document.py`)

Added new field:

```python
gridfs_id: Optional[str] = Field(None, description="GridFS file ID")
file_path: Optional[str] = Field(None, description="Deprecated")
```

### 3. Document Service (`app/services/document_service.py`)

#### Upload to GridFS:

```python
gridfs_id = await self.fs.upload_from_stream(
    filename=file.filename,
    source=file_content,
    metadata={
        "doc_id": doc_id,
        "user_id": user_id,
        "file_type": file_ext[1:],
        "upload_date": datetime.now()
    }
)
```

#### Download from GridFS:

```python
async def get_document_file(self, doc_id: str, user_id: str) -> Optional[bytes]:
    grid_out = await self.fs.open_download_stream(ObjectId(document.gridfs_id))
    return await grid_out.read()
```

#### Delete from GridFS:

```python
await self.fs.delete(ObjectId(document.gridfs_id))
```

### 4. API Endpoint (`app/api/v1/documents.py`)

Changed from `FileResponse` to `Response` with binary content:

```python
file_content = await doc_service.get_document_file(doc_id, user_data["sub"])
return Response(
    content=file_content,
    media_type=media_type,
    headers=headers
)
```

## How to Use

### Upload Document

```bash
curl -X POST "http://localhost:8000/api/documents/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

### Download Document

```bash
curl "http://localhost:8000/api/documents/{doc_id}/file?token=YOUR_TOKEN" \
  -o downloaded.pdf
```

### View in Browser

```
http://localhost:8000/api/documents/{doc_id}/file?token=YOUR_TOKEN
```

(PDFs open inline, PPTX files download)

## Database Structure

### Documents Collection

```json
{
  "id": "doc_abc123",
  "user_id": "user_xyz789",
  "filename": "lecture.pdf",
  "file_type": "pdf",
  "file_size": 1048576,
  "gridfs_id": "507f1f77bcf86cd799439011", // NEW
  "file_path": null, // DEPRECATED
  "extracted_text": "...",
  "page_count": 10,
  "processing_status": "completed",
  "created_at": "2025-11-17T12:00:00",
  "processed_at": "2025-11-17T12:00:05"
}
```

### GridFS Collections (Auto-created)

MongoDB creates two collections:

- `fs.files` - File metadata
- `fs.chunks` - File content (255KB chunks)

## Migration Steps (If You Have Existing Files)

### Option 1: Fresh Start (Recommended)

1. Clear existing documents:
   ```javascript
   db.documents.deleteMany({});
   ```
2. Upload new files through the UI

### Option 2: Migrate Existing Files

Create a migration script:

```python
import asyncio
from pathlib import Path
from bson import ObjectId
from app.database import get_database
from app.db.base import MongoDataStore

async def migrate_files():
    db = await get_database()
    data_store = MongoDataStore(db)

    documents = await db.documents.find({}).to_list(None)

    for doc in documents:
        if doc.get('file_path') and not doc.get('gridfs_id'):
            file_path = Path(doc['file_path'])
            if file_path.exists():
                # Read file
                with open(file_path, 'rb') as f:
                    file_content = f.read()

                # Upload to GridFS
                gridfs_id = await data_store.fs.upload_from_stream(
                    filename=doc['filename'],
                    source=file_content,
                    metadata={
                        "doc_id": doc['id'],
                        "user_id": doc['user_id'],
                        "file_type": doc['file_type']
                    }
                )

                # Update document
                await db.documents.update_one(
                    {"id": doc['id']},
                    {"$set": {"gridfs_id": str(gridfs_id)}}
                )

                print(f"Migrated: {doc['filename']}")

asyncio.run(migrate_files())
```

## Monitoring GridFS

### Check Storage Usage

```javascript
// MongoDB Shell
db.fs.files.stats();
db.fs.chunks.stats();
```

### List All Files

```javascript
db.fs.files.find().pretty();
```

### Find Orphaned Files

```javascript
// Files in GridFS but not in documents collection
var docGridFsIds = db.documents.distinct("gridfs_id");
db.fs.files.find({
  _id: { $nin: docGridFsIds.map((id) => ObjectId(id)) },
});
```

## Troubleshooting

### Issue: "File not found"

- Check if `gridfs_id` exists in document record
- Verify GridFS file: `db.fs.files.findOne({_id: ObjectId("YOUR_ID")})`

### Issue: Large MongoDB size

- GridFS stores files in 255KB chunks
- Use compression at application level if needed
- Consider file size limits (current: 50MB)

### Issue: Slow uploads

- GridFS is slightly slower than filesystem
- For production, use MongoDB Atlas with fast storage
- Consider background processing for large files

## Performance Considerations

| Operation    | Filesystem  | GridFS       |
| ------------ | ----------- | ------------ |
| Upload       | ⚡ Fast     | ✅ Good      |
| Download     | ⚡ Fast     | ✅ Good      |
| Backup       | ❌ Separate | ✅ Included  |
| Replication  | ❌ Manual   | ✅ Automatic |
| Cloud Deploy | ⚠️ Complex  | ✅ Simple    |

## Next Steps

1. ✅ Test file upload
2. ✅ Test file viewing in browser
3. ✅ Test file deletion
4. ⬜ Monitor GridFS storage usage
5. ⬜ Set up automated backups
6. ⬜ Consider adding file compression

## Rollback (If Needed)

To rollback to filesystem storage:

1. Restore previous version of:
   - `app/db/base.py`
   - `app/models/document.py`
   - `app/services/document_service.py`
   - `app/api/v1/documents.py`
2. Remove GridFS collections:
   ```javascript
   db.fs.files.drop();
   db.fs.chunks.drop();
   ```

---

**Status**: ✅ Migration Complete  
**Date**: November 17, 2025  
**Version**: 2.0 (GridFS)
