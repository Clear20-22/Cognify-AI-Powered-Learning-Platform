"""
Unit tests for Document Extractor Strategies and Factory.
"""

import pytest
from app.services.document_extractors import (
    DocumentExtractorFactory,
    PDFExtractorStrategy,
    PPTXExtractorStrategy
)


def test_factory_strategy_selection():
    pdf_strat = DocumentExtractorFactory.get_extractor("sample.pdf")
    assert isinstance(pdf_strat, PDFExtractorStrategy)

    pptx_strat = DocumentExtractorFactory.get_extractor("presentation.PPTX")
    assert isinstance(pptx_strat, PPTXExtractorStrategy)

    with pytest.raises(ValueError):
        DocumentExtractorFactory.get_extractor("unsupported.docx")


def test_extractor_validation():
    pdf_strat = PDFExtractorStrategy()
    with pytest.raises(ValueError):
        pdf_strat.validate("file.txt")
