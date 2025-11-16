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
from typing import Optional, List
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import pdfplumber
from pptx import Presentation
try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    print("Warning: PyPDF2 not available. Install with: pip install PyPDF2")

try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("Warning: OCR not available. Install with: pip install pdf2image pytesseract pillow")


def clean_text(text: str) -> str:
    """
    Clean extracted text while maximizing content preservation and structure.
    Prioritizes accuracy over aggressive cleaning.
    
    Args:
        text: Raw text extracted from PDF
        
    Returns:
        Cleaned text with proper paragraph structure
    """
    if not text or not text.strip():
        return ""
    
    # Preserve special markers for tables and notes
    preserve_markers = ['[TABLE]', '[/TABLE]', '[NOTES:', '[SLIDE NOTES:']
    
    # Remove only truly excessive whitespace
    # Replace tabs with spaces
    text = text.replace('\t', '    ')
    
    # Remove spaces at line ends
    lines = text.split('\n')
    lines = [line.rstrip() for line in lines]
    
    # Remove excessive spaces within lines (but keep intentional spacing)
    cleaned_lines = []
    for line in lines:
        # Keep lines with special markers as-is
        if any(marker in line for marker in preserve_markers):
            cleaned_lines.append(line)
            continue
        
        # Replace multiple spaces with single space, but preserve structure
        line = re.sub(r'  +', ' ', line)
        cleaned_lines.append(line)
    
    # Rejoin lines
    text = '\n'.join(cleaned_lines)
    
    # Smart paragraph joining - only join lines that are clearly continuations
    lines = text.split('\n')
    final_lines = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Empty line - preserve as paragraph break
        if not line:
            if final_lines and final_lines[-1] != '':
                final_lines.append('')
            continue
        
        # Special markers - always preserve
        if any(marker in line for marker in preserve_markers):
            final_lines.append(line)
            continue
        
        # Check if this should be joined with previous line
        should_join = False
        if final_lines and final_lines[-1]:
            prev_line = final_lines[-1]
            
            # Don't join if previous line ends with strong punctuation
            if prev_line[-1] in '.!?:;':
                should_join = False
            # Don't join if current line starts with bullet/number
            elif re.match(r'^[•\-\*\d]+[\.\)\s]', line):
                should_join = False
            # Don't join if current line is all caps (likely a header)
            elif line.isupper() and len(line) > 3:
                should_join = False
            # Join if previous line looks incomplete (ends mid-word or with comma)
            elif prev_line[-1] in ',;' or (len(prev_line) > 0 and prev_line[-1].islower()):
                should_join = True
            # Join if line starts with lowercase (continuation)
            elif line[0].islower():
                should_join = True
        
        if should_join:
            final_lines[-1] = f"{final_lines[-1]} {line}"
        else:
            final_lines.append(line)
    
    # Join and normalize excessive newlines (max 2 consecutive)
    cleaned_text = '\n'.join(final_lines)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    
    # Remove any remaining trailing/leading whitespace
    cleaned_text = cleaned_text.strip()
    
    return cleaned_text


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
        
        # Process each slide individually for maximum accuracy
        for slide_num, slide in enumerate(prs.slides, start=1):
            slide_text_parts = []
            
            # Extract text from all shapes in the slide (comprehensive)
            for shape in slide.shapes:
                try:
                    # Extract regular text
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_text_parts.append(shape.text.strip())
                    
                    # Extract text from text frames with formatting
                    if hasattr(shape, "text_frame"):
                        for paragraph in shape.text_frame.paragraphs:
                            para_text = []
                            for run in paragraph.runs:
                                if run.text.strip():
                                    para_text.append(run.text.strip())
                            if para_text:
                                full_para = ' '.join(para_text)
                                if full_para not in slide_text_parts:  # Avoid duplicates
                                    slide_text_parts.append(full_para)
                    
                    # Extract text from tables with structure preservation
                    if hasattr(shape, 'has_table') and shape.has_table:
                        table = shape.table
                        table_text = ["\n[TABLE]"]
                        for row_idx, row in enumerate(table.rows):
                            row_cells = []
                            for cell in row.cells:
                                cell_text = cell.text.strip()
                                if cell_text:
                                    row_cells.append(cell_text)
                            if row_cells:
                                table_text.append(" | ".join(row_cells))
                        table_text.append("[/TABLE]\n")
                        slide_text_parts.extend(table_text)
                    
                    # Extract text from grouped shapes
                    if hasattr(shape, 'shapes'):  # Group shape
                        for subshape in shape.shapes:
                            if hasattr(subshape, "text") and subshape.text.strip():
                                sub_text = subshape.text.strip()
                                if sub_text not in slide_text_parts:
                                    slide_text_parts.append(sub_text)
                    
                    # Extract notes and comments if available
                    if hasattr(shape, 'notes_slide'):
                        try:
                            notes_text = shape.notes_slide.notes_text_frame.text.strip()
                            if notes_text:
                                slide_text_parts.append(f"\n[NOTES: {notes_text}]")
                        except:
                            pass
                    
                except Exception as e:
                    print(f"Warning: Could not extract from shape in slide {slide_num}: {e}")
                    continue
            
            # Extract slide notes if present
            try:
                if slide.has_notes_slide:
                    notes_text = slide.notes_slide.notes_text_frame.text.strip()
                    if notes_text:
                        slide_text_parts.append(f"\n[SLIDE NOTES: {notes_text}]")
            except Exception as e:
                print(f"Warning: Could not extract notes from slide {slide_num}: {e}")
            
            # Combine all text from the slide
            if slide_text_parts:
                slide_text = "\n".join(slide_text_parts)
                cleaned_slide_text = clean_text(slide_text)
                
                # Store if we have meaningful content
                if cleaned_slide_text and len(cleaned_slide_text.strip()) > 0:
                    extracted_text_parts.append(f"--- Slide {slide_num} ---\n{cleaned_slide_text}")
                    print(f"Slide {slide_num}: Extracted {len(cleaned_slide_text)} characters")
                else:
                    blank_slides += 1
                    print(f"Slide {slide_num}: No content after cleaning")
            else:
                blank_slides += 1
                print(f"Slide {slide_num}: No text found")
            
            # Progress reporting
            if slide_num % purngre == 0:
                print(f"\n=== Progress: {slide_num}/{total_slides} slides ===")
                print(f"Blank slides: {blank_slides}")
                print(f"Slides with content: {slide_num - blank_slides}\n")
        
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
            print("Priority: Maximum accuracy - using comprehensive extraction methods")
            
            # Process each page individually with multiple extraction methods for accuracy
            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = None
                
                # Method 1: pdfplumber with layout preservation (most accurate for structured PDFs)
                try:
                    page_text = page.extract_text(
                        layout=True,
                        x_tolerance=1,  # Tight tolerance for better accuracy
                        y_tolerance=1,
                        keep_blank_chars=False,
                        use_text_flow=True
                    )
                except Exception as e:
                    print(f"pdfplumber layout extraction failed for page {page_num}: {e}")
                
                # Method 2: If layout method fails or returns empty, try table extraction
                if not page_text or len(page_text.strip()) < 10:
                    try:
                        # Extract tables separately for better accuracy
                        tables = page.extract_tables()
                        if tables:
                            table_texts = []
                            for table in tables:
                                for row in table:
                                    row_text = ' | '.join([str(cell) if cell else '' for cell in row])
                                    if row_text.strip():
                                        table_texts.append(row_text)
                            if table_texts:
                                page_text = (page_text or '') + '\n' + '\n'.join(table_texts)
                    except Exception as e:
                        print(f"Table extraction failed for page {page_num}: {e}")
                
                # Method 3: Try extracting words with positions for complex layouts
                if not page_text or len(page_text.strip()) < 10:
                    try:
                        words = page.extract_words(
                            x_tolerance=1,
                            y_tolerance=1,
                            keep_blank_chars=False,
                            use_text_flow=True
                        )
                        if words:
                            # Sort words by position (top to bottom, left to right)
                            words_sorted = sorted(words, key=lambda w: (w['top'], w['x0']))
                            page_text = ' '.join([w['text'] for w in words_sorted])
                    except Exception as e:
                        print(f"Word extraction failed for page {page_num}: {e}")
                
                # Method 4: Fallback to PyPDF2 if available
                if (not page_text or len(page_text.strip()) < 10) and PYPDF2_AVAILABLE:
                    try:
                        with open(pdf_path, 'rb') as f:
                            pdf_reader = PyPDF2.PdfReader(f)
                            if page_num - 1 < len(pdf_reader.pages):
                                pypdf_text = pdf_reader.pages[page_num - 1].extract_text()
                                if pypdf_text and len(pypdf_text.strip()) > len(page_text or ''):
                                    page_text = pypdf_text
                                    print(f"Page {page_num}: Using PyPDF2 extraction (better result)")
                    except Exception as e:
                        print(f"PyPDF2 extraction failed for page {page_num}: {e}")
                
                # Method 5: OCR as last resort for scanned PDFs or images
                if (not page_text or len(page_text.strip()) < 10) and OCR_AVAILABLE:
                    try:
                        print(f"Page {page_num}: Attempting OCR (scanned content detected)")
                        # Convert page to image and apply OCR
                        images = convert_from_path(pdf_path, first_page=page_num, last_page=page_num, dpi=300)
                        if images:
                            ocr_text = pytesseract.image_to_string(images[0], lang='eng')
                            if ocr_text and len(ocr_text.strip()) > len(page_text or ''):
                                page_text = ocr_text
                                print(f"Page {page_num}: OCR successful")
                    except Exception as e:
                        print(f"OCR failed for page {page_num}: {e}")
                
                # Clean and store the text
                if page_text:
                    cleaned_page_text = clean_text(page_text)
                    
                    if cleaned_page_text and len(cleaned_page_text.strip()) > 0:
                        extracted_text_parts.append(cleaned_page_text)
                        print(f"Page {page_num}: Extracted {len(cleaned_page_text)} characters")
                    else:
                        blank_pages += 1
                        print(f"Page {page_num}: No content after cleaning")
                else:
                    blank_pages += 1
                    print(f"Page {page_num}: No text extracted")
                
                # Progress reporting
                if page_num % purngre == 0:
                    print(f"\n=== Progress: {page_num}/{total_pages} pages ===")
                    print(f"Blank pages: {blank_pages}")
                    print(f"Pages with content: {page_num - blank_pages}\n")
        
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


def prepare_text_for_llm(text: str, max_chunk_size: int = 4000) -> List[str]:
    """
    Prepare extracted text for LLM processing by splitting into manageable chunks.
    Optimized with better memory management.
    
    Args:
        text: Cleaned extracted text
        max_chunk_size: Maximum characters per chunk (default: 4000)
        
    Returns:
        List of text chunks suitable for LLM processing
    """
    if not text:
        return []
    
    # Split by paragraphs
    paragraphs = [p for p in text.split('\n\n') if p.strip()]
    
    if not paragraphs:
        return []
    
    chunks = []
    current_chunk = []
    current_size = 0
    
    for paragraph in paragraphs:
        para_len = len(paragraph)
        
        # If single paragraph is too large, split it by sentences
        if para_len > max_chunk_size:
            sentences = re.split(r'(?<=[.!?])\s+', paragraph)
            for sentence in sentences:
                sent_len = len(sentence)
                if current_size + sent_len > max_chunk_size and current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                    current_chunk = [sentence]
                    current_size = sent_len
                else:
                    current_chunk.append(sentence)
                    current_size += sent_len + 2
        # Normal paragraph handling
        elif current_size + para_len > max_chunk_size and current_chunk:
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [paragraph]
            current_size = para_len
        else:
            current_chunk.append(paragraph)
            current_size += para_len + 2
    
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
