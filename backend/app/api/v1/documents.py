"""
Document API Endpoints
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import FileResponse
import logging
import os

from app.api.deps import get_document_service, get_ai_service, get_current_user
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    DocumentProcessRequest,
    DocumentProcessResponse
)
from app.services.document_service import DocumentService
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents")


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Upload a PDF or PPTX document.
    
    - **file**: PDF or PPTX file (max 50MB)
    
    Returns the uploaded document information.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        document = await doc_service.upload_document(current_user["id"], file)
        
        return DocumentUploadResponse(
            id=document.id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            processing_status=document.processing_status,
            created_at=document.created_at
        )
    except Exception as e:
        logger.error(f"Upload document error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("/", response_model=DocumentListResponse)
async def get_documents(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Get all documents for the current user.
    
    Returns a list of all uploaded documents.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        documents = await doc_service.get_user_documents(current_user["id"])
        
        return DocumentListResponse(
            documents=[
                DocumentResponse(
                    id=doc.id,
                    user_id=doc.user_id,
                    filename=doc.filename,
                    file_type=doc.file_type,
                    file_size=doc.file_size,
                    page_count=doc.page_count,
                    processing_status=doc.processing_status,
                    extracted_text=doc.extracted_text,
                    metadata=doc.metadata,
                    created_at=doc.created_at,
                    processed_at=doc.processed_at
                )
                for doc in documents
            ],
            total=len(documents)
        )
    except Exception as e:
        logger.error(f"Get documents error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve documents: {str(e)}"
        )


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Get a specific document by ID.
    
    - **doc_id**: Document ID
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        document = await doc_service.get_document(doc_id, current_user["id"])
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentResponse(
            id=document.id,
            user_id=document.user_id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            page_count=document.page_count,
            processing_status=document.processing_status,
            extracted_text=document.extracted_text,
            metadata=document.metadata,
            created_at=document.created_at,
            processed_at=document.processed_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get document error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document: {str(e)}"
        )


@router.get("/{doc_id}/file")
async def get_document_file(
    doc_id: str,
    token: str = Query(...),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Get the actual document file (PDF/PPTX).
    
    - **doc_id**: Document ID
    - **token**: JWT token for authentication
    """
    try:
        # Validate token and get user from the token string
        from app.core.security import decode_access_token
        user_data = decode_access_token(token)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Get document
        document = await doc_service.get_document(doc_id, user_data["sub"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if file exists
        if not os.path.exists(document.file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Return file with inline disposition for PDF (to view in browser), download for PPTX
        media_type = "application/pdf" if document.file_type == "pdf" else "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        
        headers = {}
        if document.file_type == "pdf":
            # For PDF, use inline to display in browser
            headers["Content-Disposition"] = f'inline; filename="{document.filename}"'
        else:
            # For PPTX, use attachment to download
            headers["Content-Disposition"] = f'attachment; filename="{document.filename}"'
        
        return FileResponse(
            path=document.file_path,
            media_type=media_type,
            headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get document file error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document file: {str(e)}"
        )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Delete a document.
    
    - **doc_id**: Document ID
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        deleted = await doc_service.delete_document(doc_id, current_user["id"])
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete document error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/{doc_id}/process", response_model=DocumentProcessResponse)
async def process_document(
    doc_id: str,
    request: DocumentProcessRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    doc_service: DocumentService = Depends(get_document_service),
    ai_service: AIService = Depends(get_ai_service)
):
    """
    Process a document with AI.
    
    - **doc_id**: Document ID
    - **action**: Action to perform (generate_notes, generate_quiz, summarize)
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        # Get document
        document = await doc_service.get_document(doc_id, current_user["id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.processing_status != "completed":
            raise HTTPException(status_code=400, detail="Document is still being processed")
        
        # Get text chunks
        chunks = await doc_service.get_document_text_chunks(doc_id, current_user["id"])
        if not chunks:
            raise HTTPException(status_code=400, detail="No text extracted from document")
        
        # Process based on action
        result = {}
        if request.action == "generate_notes":
            # Use first chunk or combine chunks (limit to avoid token limits)
            text = "\n\n".join(chunks[:3])  # Use first 3 chunks
            notes = await ai_service.generate_study_notes(text)
            result = {"notes": notes}
            
        elif request.action == "generate_quiz":
            text = "\n\n".join(chunks[:2])
            # Reuse exam generation logic
            result = {"message": "Quiz generation not yet implemented"}
            
        elif request.action == "summarize":
            text = "\n\n".join(chunks[:3])
            summary = await ai_service.generate_summary(text)
            result = {"summary": summary}
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
        
        return DocumentProcessResponse(
            success=True,
            action=request.action,
            result=result,
            message="Document processed successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Process document error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )
