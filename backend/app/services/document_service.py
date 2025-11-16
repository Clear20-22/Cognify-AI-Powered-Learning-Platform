"""
Document Service - Business logic for document management
"""

import os
import uuid
import tempfile
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
from fastapi import UploadFile, HTTPException
from bson import ObjectId

from app.models.document import Document
from app.pdfReader.extract_pdf import extract_text_from_document, prepare_text_for_llm
from app.db.base import MongoDataStore


class DocumentService:
    """Service for document upload, storage, and processing."""
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {".pdf", ".pptx"}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    
    def __init__(self, data_store: MongoDataStore):
        self.data_store = data_store
        self.db = data_store.db
        self.fs = data_store.fs  # GridFS bucket
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
    
    async def upload_document(
        self, 
        user_id: str, 
        file: UploadFile
    ) -> Document:
        """
        Upload and store a document.
        
        Args:
            user_id: User uploading the document
            file: Uploaded file
            
        Returns:
            Created document object
            
        Raises:
            HTTPException: If file validation fails
        """
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {self.MAX_FILE_SIZE // (1024*1024)} MB"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Generate unique document ID
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        
        # Upload file to GridFS
        gridfs_id = await self.fs.upload_from_stream(
            filename=file.filename,
            source=file_content,
            metadata={
                "doc_id": doc_id,
                "user_id": user_id,
                "file_type": file_ext[1:],
                "content_type": file.content_type,
                "upload_date": datetime.now()
            }
        )
        
        # Create document record
        document = Document(
            id=doc_id,
            user_id=user_id,
            filename=file.filename,
            file_type=file_ext[1:],  # Remove the dot
            file_size=file_size,
            file_path=None,  # Not using filesystem anymore
            gridfs_id=str(gridfs_id),  # Store GridFS ObjectId
            processing_status="pending",
            created_at=datetime.now()
        )
        
        # Store in database
        await self.db.documents.insert_one(document.model_dump())
        
        # Start background processing (in production, use background tasks)
        try:
            await self._process_document(doc_id, gridfs_id)
        except Exception as e:
            print(f"Error processing document {doc_id}: {e}")
            # Don't fail the upload if processing fails
        
        return document
    
    async def _process_document(self, doc_id: str, gridfs_id):
        """
        Process document to extract text (background task).
        
        Args:
            doc_id: Document ID
            gridfs_id: GridFS file ID
        """
        temp_file_path = None
        try:
            # Update status to processing
            await self.db.documents.update_one(
                {"id": doc_id},
                {"$set": {"processing_status": "processing"}}
            )
            
            # Download file from GridFS to temp location for processing
            grid_out = await self.fs.open_download_stream(gridfs_id)
            file_content = await grid_out.read()
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            # Extract text
            extracted_text = extract_text_from_document(temp_file_path, purngre=50)
            
            # Count pages/slides (rough estimate from extracted text)
            page_count = len(extracted_text.split("---")) if "---" in extracted_text else None
            
            # Update document with extracted text
            await self.db.documents.update_one(
                {"id": doc_id},
                {
                    "$set": {
                        "extracted_text": extracted_text[:100000],  # Limit to 100k chars for storage
                        "page_count": page_count,
                        "processing_status": "completed",
                        "processed_at": datetime.now()
                    }
                }
            )
            
        except Exception as e:
            # Mark as failed
            await self.db.documents.update_one(
                {"id": doc_id},
                {
                    "$set": {
                        "processing_status": "failed",
                        "metadata.error": str(e)
                    }
                }
            )
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise
    
    async def get_user_documents(self, user_id: str) -> List[Document]:
        """
        Get all documents for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of documents
        """
        cursor = self.db.documents.find({"user_id": user_id}).sort("created_at", -1)
        documents = await cursor.to_list(length=100)
        return [Document(**doc) for doc in documents]
    
    async def get_document(self, doc_id: str, user_id: str) -> Optional[Document]:
        """
        Get a specific document.
        
        Args:
            doc_id: Document ID
            user_id: User ID (for access control)
            
        Returns:
            Document if found and belongs to user, None otherwise
        """
        doc_data = await self.db.documents.find_one({"id": doc_id, "user_id": user_id})
        if doc_data:
            return Document(**doc_data)
        return None
    
    async def delete_document(self, doc_id: str, user_id: str) -> bool:
        """
        Delete a document.
        
        Args:
            doc_id: Document ID
            user_id: User ID (for access control)
            
        Returns:
            True if deleted, False if not found
        """
        # Get document to delete file
        document = await self.get_document(doc_id, user_id)
        if not document:
            return False
        
        # Delete file from GridFS
        try:
            if document.gridfs_id:
                await self.fs.delete(ObjectId(document.gridfs_id))
            # Also delete old filesystem files if they exist (for backward compatibility)
            elif document.file_path:
                file_path = Path(document.file_path)
                if file_path.exists():
                    file_path.unlink()
        except Exception as e:
            print(f"Error deleting file: {e}")
        
        # Delete from database
        result = await self.db.documents.delete_one({"id": doc_id, "user_id": user_id})
        return result.deleted_count > 0
    
    async def get_document_file(self, doc_id: str, user_id: str) -> Optional[bytes]:
        """
        Get document file content from GridFS or filesystem (backward compatibility).
        
        Args:
            doc_id: Document ID
            user_id: User ID (for access control)
            
        Returns:
            File content as bytes, or None if not found
        """
        document = await self.get_document(doc_id, user_id)
        if not document:
            return None
        
        # Try GridFS first (new method)
        if document.gridfs_id:
            try:
                grid_out = await self.fs.open_download_stream(ObjectId(document.gridfs_id))
                return await grid_out.read()
            except Exception as e:
                print(f"Error retrieving file from GridFS: {e}")
        
        # Fallback to filesystem (old method, backward compatibility)
        if document.file_path:
            try:
                file_path = Path(document.file_path)
                if file_path.exists():
                    with open(file_path, "rb") as f:
                        return f.read()
            except Exception as e:
                print(f"Error retrieving file from filesystem: {e}")
        
        return None
    
    async def get_document_text_chunks(self, doc_id: str, user_id: str, chunk_size: int = 4000) -> List[str]:
        """
        Get document text split into chunks for LLM processing.
        
        Args:
            doc_id: Document ID
            user_id: User ID
            chunk_size: Maximum characters per chunk
            
        Returns:
            List of text chunks
        """
        document = await self.get_document(doc_id, user_id)
        if not document or not document.extracted_text:
            return []
        
        return prepare_text_for_llm(document.extracted_text, chunk_size)
