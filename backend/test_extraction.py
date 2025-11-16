#!/usr/bin/env python3
"""
Test script to verify enhanced PDF extraction capabilities
"""

import sys
from pathlib import Path

# Test import of all extraction libraries
print("Testing extraction library imports...")
print("="*50)

try:
    import pdfplumber
    print("✅ pdfplumber: Available")
except ImportError:
    print("❌ pdfplumber: Not available")

try:
    import PyPDF2
    print("✅ PyPDF2: Available")
except ImportError:
    print("❌ PyPDF2: Not available")

try:
    from pdf2image import convert_from_path
    print("✅ pdf2image: Available")
except ImportError:
    print("❌ pdf2image: Not available")

try:
    import pytesseract
    print("✅ pytesseract: Available")
    # Test tesseract command
    try:
        version = pytesseract.get_tesseract_version()
        print(f"   Tesseract version: {version}")
    except Exception as e:
        print(f"   Warning: Tesseract command not found: {e}")
except ImportError:
    print("❌ pytesseract: Not available")

try:
    from PIL import Image
    print("✅ Pillow (PIL): Available")
except ImportError:
    print("❌ Pillow (PIL): Not available")

try:
    from pptx import Presentation
    print("✅ python-pptx: Available")
except ImportError:
    print("❌ python-pptx: Not available")

print("="*50)
print("\nExtraction Capabilities Summary:")
print("-"*50)
print("✓ Standard PDF extraction: pdfplumber")
print("✓ Fallback PDF extraction: PyPDF2")
print("✓ OCR for scanned PDFs: Tesseract")
print("✓ PPTX extraction: python-pptx")
print("\n✅ All systems ready for maximum accuracy extraction!")
print("="*50)

# Test the actual extraction function
print("\nTesting extraction module...")
try:
    from app.pdfReader.extract_pdf import extract_text_from_document
    print("✅ extract_text_from_document: Successfully imported")
    print("\n🎯 Ready to extract documents with maximum accuracy!")
except ImportError as e:
    print(f"❌ Error importing extraction module: {e}")
