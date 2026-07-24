"""
PDF Service - Handles PDF and PPTX extraction operations
Refactored to use DocumentExtractorFactory (Strategy & Template Method Patterns).
"""

import logging
from app.services.document_extractors import DocumentExtractorFactory, PDFExtractorStrategy, PPTXExtractorStrategy
from app.pdfReader.extract_pdf import prepare_text_for_llm

logger = logging.getLogger(__name__)


class PDFService:
    """Service for handling PDF and PPTX document extraction."""
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> dict:
        return PDFExtractorStrategy().process(file_path)
    
    @staticmethod
    def extract_from_pptx(file_path: str) -> dict:
        return PPTXExtractorStrategy().process(file_path)
    
    @staticmethod
    def prepare_for_llm(
        text: str,
        max_chunk_size: int = 4000,
        overlap: int = 200
    ) -> dict:
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
        try:
            extractor = DocumentExtractorFactory.get_extractor(file_path)
            return extractor.process(file_path)
        except ValueError as ve:
            return {
                "success": False,
                "error": str(ve),
                "file_path": file_path
            }
