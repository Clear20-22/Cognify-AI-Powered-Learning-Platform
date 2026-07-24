"""
Document Extraction Strategy and Template Method Pattern
"""

from abc import ABC, abstractmethod
import logging
from typing import Dict, Any, List
from app.pdfReader.extract_pdf import (
    extract_text_from_pdf,
    extract_text_from_pptx,
    prepare_text_for_llm
)

logger = logging.getLogger(__name__)


class DocumentExtractorTemplate(ABC):
    """
    Template Method Pattern defining skeleton steps for document extraction.
    """

    def process(self, file_path: str) -> Dict[str, Any]:
        """Template method orchestrating the extraction algorithm."""
        try:
            self.validate(file_path)
            raw_text, count = self.extract_raw_content(file_path)
            cleaned_text = self.clean_text(raw_text)
            metadata = self.build_metadata(file_path, count, cleaned_text)
            return {
                "success": True,
                "text": cleaned_text,
                "char_count": len(cleaned_text),
                "file_path": file_path,
                **metadata
            }
        except Exception as e:
            logger.error(f"Extraction failed for {file_path}: {e}")
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path,
                "file_type": self.file_type
            }

    def validate(self, file_path: str) -> None:
        """Step 1: Validate file path extension."""
        if not file_path.lower().endswith(f".{self.file_type}"):
            raise ValueError(f"Invalid file type for {self.file_type} extractor: {file_path}")

    @abstractmethod
    def extract_raw_content(self, file_path: str) -> tuple[str, int]:
        """Step 2: Abstract extraction step to be implemented by concrete strategies."""
        pass

    def clean_text(self, text: str) -> str:
        """Step 3: Post-process and normalize text."""
        return text.strip() if text else ""

    @abstractmethod
    def build_metadata(self, file_path: str, count: int, text: str) -> Dict[str, Any]:
        """Step 4: Abstract metadata step."""
        pass

    @property
    @abstractmethod
    def file_type(self) -> str:
        pass


class PDFExtractorStrategy(DocumentExtractorTemplate):
    """Concrete Strategy for PDF extraction."""

    @property
    def file_type(self) -> str:
        return "pdf"

    def extract_raw_content(self, file_path: str) -> tuple[str, int]:
        return extract_text_from_pdf(file_path)

    def build_metadata(self, file_path: str, count: int, text: str) -> Dict[str, Any]:
        return {"page_count": count, "file_type": "pdf"}


class PPTXExtractorStrategy(DocumentExtractorTemplate):
    """Concrete Strategy for PPTX extraction."""

    @property
    def file_type(self) -> str:
        return "pptx"

    def extract_raw_content(self, file_path: str) -> tuple[str, int]:
        return extract_text_from_pptx(file_path)

    def build_metadata(self, file_path: str, count: int, text: str) -> Dict[str, Any]:
        return {"slide_count": count, "file_type": "pptx"}


class DocumentExtractorFactory:
    """Factory Strategy selector for Document Extractors."""

    _strategies = {
        "pdf": PDFExtractorStrategy(),
        "pptx": PPTXExtractorStrategy()
    }

    @classmethod
    def get_extractor(cls, file_path: str) -> DocumentExtractorTemplate:
        file_path_lower = file_path.lower()
        for ext, strategy in cls._strategies.items():
            if file_path_lower.endswith(f".{ext}"):
                return strategy
        raise ValueError(f"Unsupported file format: {file_path}")
