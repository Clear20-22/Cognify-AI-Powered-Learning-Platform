"""
PDF Service - Handles PDF extraction operations
"""

import logging
from typing import Optional
from app.pdfReader.extract_pdf import (
    extract_text_from_pdf,
    extract_text_from_pptx,
    prepare_text_for_llm
)

logger = logging.getLogger(__name__)


class PDFService:
    """Service for handling PDF and PPTX document extraction."""
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> dict:
        """
        Extract text from a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dictionary with extracted text, page count, and statistics
        """
        try:
            text, page_count = extract_text_from_pdf(file_path)
            
            return {
                "success": True,
                "text": text,
                "page_count": page_count,
                "char_count": len(text),
                "file_path": file_path,
                "file_type": "pdf"
            }
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path,
                "file_type": "pdf"
            }
    
    @staticmethod
    def extract_from_pptx(file_path: str) -> dict:
        """
        Extract text from a PowerPoint file.
        
        Args:
            file_path: Path to the PPTX file
            
        Returns:
            Dictionary with extracted text, slide count, and statistics
        """
        try:
            text, slide_count = extract_text_from_pptx(file_path)
            
            return {
                "success": True,
                "text": text,
                "slide_count": slide_count,
                "char_count": len(text),
                "file_path": file_path,
                "file_type": "pptx"
            }
        except Exception as e:
            logger.error(f"PPTX extraction error: {e}")
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path,
                "file_type": "pptx"
            }
    
    @staticmethod
    def prepare_for_llm(
        text: str,
        max_chunk_size: int = 4000,
        overlap: int = 200
    ) -> list:
        """
        Prepare extracted text for LLM processing by chunking.
        
        Args:
            text: Extracted text
            max_chunk_size: Maximum characters per chunk
            overlap: Character overlap between chunks
            
        Returns:
            List of text chunks
        """
        try:
            chunks = prepare_text_for_llm(text, max_chunk_size, overlap)
            
            return {
                "success": True,
                "chunks": chunks,
                "num_chunks": len(chunks),
                "total_chars": len(text),
                "max_chunk_size": max_chunk_size,
                "overlap": overlap
            }
        except Exception as e:
            logger.error(f"Text preparation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "chunks": []
            }
    
    @staticmethod
    def extract_document(file_path: str) -> dict:
        """
        Extract text from document (auto-detect PDF or PPTX).
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Dictionary with extracted text and metadata
        """
        file_path_lower = file_path.lower()
        
        if file_path_lower.endswith('.pdf'):
            return PDFService.extract_from_pdf(file_path)
        elif file_path_lower.endswith('.pptx'):
            return PDFService.extract_from_pptx(file_path)
        else:
            return {
                "success": False,
                "error": "Unsupported file type. Only PDF and PPTX are supported.",
                "file_path": file_path
            }
