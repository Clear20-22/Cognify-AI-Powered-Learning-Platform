"""
Document Text Extraction Module for LLM Processing

This script extracts text from potentially large documents (up to 50 MB) in a memory-efficient manner
by processing page by page or slide by slide. The extracted text is cleaned and formatted for use 
with LLMs to generate notes and questions.

Supported formats:
- PDF (text-based)
- PPTX (PowerPoint presentations)

Requirements:
- pdfplumber for PDF extraction
- python-pptx for PowerPoint extraction
- Memory-efficient processing for large files
"""

import re
import os
from typing import Optional
from pathlib import Path
import pdfplumber
from pptx import Presentation


def clean_text(text: str) -> str:
    """
    Clean extracted text by removing unnecessary whitespace while preserving structure.
    
    Args:
        text: Raw text extracted from PDF
        
    Returns:
        Cleaned text with proper paragraph structure
    """
    if not text or not text.strip():
        return ""
    
    # Remove excessive whitespace but preserve paragraph breaks
    # Replace multiple spaces with single space
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Replace multiple newlines with double newline (paragraph break)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    
    # Remove single line breaks within paragraphs (join continuation lines)
    # This helps when PDF text wraps mid-sentence
    lines = text.split('\n')
    cleaned_lines = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            # Preserve empty lines as paragraph separators
            if cleaned_lines and cleaned_lines[-1] != '':
                cleaned_lines.append('')
        else:
            # Check if this line should be joined with previous
            if cleaned_lines and cleaned_lines[-1] and not cleaned_lines[-1].endswith(('.', '!', '?', ':', ';')):
                # Join with previous line if it doesn't end with punctuation
                cleaned_lines[-1] += ' ' + line
            else:
                cleaned_lines.append(line)
    
    # Join lines and normalize paragraph breaks
    cleaned_text = '\n'.join(cleaned_lines)
    
    # Final cleanup: ensure max 2 consecutive newlines
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    
    return cleaned_text.strip()


def extract_text_from_pptx(pptx_path: str, output_path: Optional[str] = None, purngre: int = 50) -> str:
    """
    Extract text from PowerPoint (PPTX) slide by slide in a memory-efficient manner.
    
    Args:
        pptx_path: Path to the input PPTX file
        output_path: Path to save the extracted text (optional)
        purngre: Progress reporting interval - report every N slides (default: 50)
        
    Returns:
        Extracted and cleaned text from the PPTX
        
    Raises:
        FileNotFoundError: If PPTX file doesn't exist
        Exception: For PPTX processing errors
    """
    if not os.path.exists(pptx_path):
        raise FileNotFoundError(f"PPTX file not found: {pptx_path}")
    
    print(f"Starting PPTX extraction from: {pptx_path}")
    print(f"Progress will be reported every {purngre} slides")
    
    extracted_text_parts = []
    total_slides = 0
    blank_slides = 0
    
    try:
        # Open PowerPoint presentation
        prs = Presentation(pptx_path)
        total_slides = len(prs.slides)
        print(f"Total slides to process: {total_slides}")
        
        # Process slide by slide to minimize memory usage
        for slide_num, slide in enumerate(prs.slides, start=1):
            slide_text_parts = []
            
            # Extract text from all shapes in the slide
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    slide_text_parts.append(shape.text)
                
                # Extract text from tables if present
                if shape.has_table:
                    table = shape.table
                    for row in table.rows:
                        row_text = []
                        for cell in row.cells:
                            if cell.text:
                                row_text.append(cell.text)
                        if row_text:
                            slide_text_parts.append(" | ".join(row_text))
            
            # Combine all text from the slide
            if slide_text_parts:
                slide_text = "\n".join(slide_text_parts)
                cleaned_slide_text = clean_text(slide_text)
                
                # Skip blank slides
                if cleaned_slide_text:
                    extracted_text_parts.append(f"--- Slide {slide_num} ---\n{cleaned_slide_text}")
                else:
                    blank_slides += 1
            else:
                blank_slides += 1
            
            # Progress reporting based on purngre interval
            if slide_num % purngre == 0:
                print(f"Processed {slide_num}/{total_slides} slides ({blank_slides} blank slides skipped)")
        
        # Final progress report
        print(f"\nExtraction complete!")
        print(f"Total slides processed: {total_slides}")
        print(f"Blank slides skipped: {blank_slides}")
        print(f"Slides with content: {total_slides - blank_slides}")
        
        # Join all slide texts with separators
        full_text = "\n\n".join(extracted_text_parts)
        
        # Final cleaning pass
        full_text = clean_text(full_text)
        
        # Save to file if output path provided
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
            print(f"Extracted text saved to: {output_path}")
            print(f"Total characters: {len(full_text)}")
        
        return full_text
        
    except Exception as e:
        print(f"Error processing PPTX: {str(e)}")
        raise


def extract_text_from_pdf(pdf_path: str, output_path: Optional[str] = None, purngre: int = 100) -> str:
    """
    Extract text from PDF page by page in a memory-efficient manner.
    
    Args:
        pdf_path: Path to the input PDF file
        output_path: Path to save the extracted text (optional)
        purngre: Progress reporting interval - report every N pages (default: 100)
        
    Returns:
        Extracted and cleaned text from the PDF
        
    Raises:
        FileNotFoundError: If PDF file doesn't exist
        Exception: For PDF processing errors
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    print(f"Starting PDF extraction from: {pdf_path}")
    print(f"Progress will be reported every {purngre} pages")
    
    extracted_text_parts = []
    total_pages = 0
    blank_pages = 0
    
    try:
        # Open PDF with pdfplumber for better text extraction
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"Total pages to process: {total_pages}")
            
            # Process page by page to minimize memory usage
            for page_num, page in enumerate(pdf.pages, start=1):
                # Extract text from current page
                page_text = page.extract_text()
                
                # Clean the text
                if page_text:
                    cleaned_page_text = clean_text(page_text)
                    
                    # Skip blank pages
                    if cleaned_page_text:
                        extracted_text_parts.append(cleaned_page_text)
                    else:
                        blank_pages += 1
                else:
                    blank_pages += 1
                
                # Progress reporting based on purngre interval
                if page_num % purngre == 0:
                    print(f"Processed {page_num}/{total_pages} pages ({blank_pages} blank pages skipped)")
        
        # Final progress report
        print(f"\nExtraction complete!")
        print(f"Total pages processed: {total_pages}")
        print(f"Blank pages skipped: {blank_pages}")
        print(f"Pages with content: {total_pages - blank_pages}")
        
        # Join all page texts with paragraph breaks
        full_text = "\n\n".join(extracted_text_parts)
        
        # Final cleaning pass
        full_text = clean_text(full_text)
        
        # Save to file if output path provided
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
            print(f"Extracted text saved to: {output_path}")
            print(f"Total characters: {len(full_text)}")
        
        return full_text
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        raise


def prepare_text_for_llm(text: str, max_chunk_size: int = 4000) -> list[str]:
    """
    Prepare extracted text for LLM processing by splitting into manageable chunks.
    
    Args:
        text: Cleaned extracted text
        max_chunk_size: Maximum characters per chunk (default: 4000)
        
    Returns:
        List of text chunks suitable for LLM processing
    """
    if not text:
        return []
    
    # Split by paragraphs
    paragraphs = text.split('\n\n')
    
    chunks = []
    current_chunk = []
    current_size = 0
    
    for paragraph in paragraphs:
        paragraph_size = len(paragraph)
        
        # If adding this paragraph exceeds max size, save current chunk
        if current_size + paragraph_size > max_chunk_size and current_chunk:
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [paragraph]
            current_size = paragraph_size
        else:
            current_chunk.append(paragraph)
            current_size += paragraph_size + 2  # +2 for '\n\n'
    
    # Add remaining chunk
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    print(f"\nText prepared for LLM:")
    print(f"Total chunks: {len(chunks)}")
    print(f"Average chunk size: {sum(len(c) for c in chunks) // len(chunks) if chunks else 0} characters")
    
    return chunks


def extract_text_from_document(file_path: str, output_path: Optional[str] = None, purngre: int = 50) -> str:
    """
    Universal document text extraction that automatically detects file type.
    
    Args:
        file_path: Path to the input document (PDF or PPTX)
        output_path: Path to save the extracted text (optional)
        purngre: Progress reporting interval (default: 50)
        
    Returns:
        Extracted and cleaned text from the document
        
    Raises:
        ValueError: If file format is not supported
        FileNotFoundError: If file doesn't exist
    """
    file_ext = Path(file_path).suffix.lower()
    
    if file_ext == '.pdf':
        return extract_text_from_pdf(file_path, output_path, purngre)
    elif file_ext in ['.pptx', '.ppt']:
        if file_ext == '.ppt':
            print("Warning: .ppt format detected. Only .pptx is fully supported.")
        return extract_text_from_pptx(file_path, output_path, purngre)
    else:
        raise ValueError(f"Unsupported file format: {file_ext}. Supported formats: .pdf, .pptx")


def main():
    """
    Main function to demonstrate document text extraction.
    """
    # Example usage - automatically detects file type
    document_file = "sample.pdf"  # Can be .pdf or .pptx
    output_file = "extracted_text.txt"
    
    # Progress reporting interval (purngre variable as required)
    purngre = 50  # Report progress every 50 pages/slides
    
    try:
        # Extract text from document (auto-detects format)
        extracted_text = extract_text_from_document(
            file_path=document_file,
            output_path=output_file,
            purngre=purngre
        )
        
        # Prepare text for LLM processing
        text_chunks = prepare_text_for_llm(extracted_text, max_chunk_size=4000)
        
        print(f"\n{'='*50}")
        print("Document extraction and preparation complete!")
        print(f"Ready for LLM processing with {len(text_chunks)} chunks")
        print(f"{'='*50}")
        
        # Return the first chunk as a preview
        if text_chunks:
            print("\nPreview of first chunk:")
            print(text_chunks[0][:500] + "..." if len(text_chunks[0]) > 500 else text_chunks[0])
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please update the document_file variable with a valid file path")
    except ValueError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
