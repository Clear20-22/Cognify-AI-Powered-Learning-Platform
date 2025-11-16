# Document Upload Feature - Complete Integration Guide

## 🎯 Overview

The PDF/PPTX document upload feature has been successfully integrated into Cognify AI Learning Platform. Users can now upload study materials (PDFs and PowerPoint presentations) and process them with AI to generate notes, quizzes, and summaries.

---

## 📁 Backend Structure

### **1. Database Model**

**File**: `backend/app/models/document.py`

```python
Document Model Fields:
- id: Unique document identifier
- user_id: Owner of the document
- filename: Original filename
- file_type: pdf or pptx
- file_size: Size in bytes
- file_path: Storage location
- extracted_text: Processed text content
- page_count: Number of pages/slides
- processing_status: pending, processing, completed, failed
- metadata: Additional information
- created_at: Upload timestamp
- processed_at: Processing completion time
```

### **2. API Endpoints**

**File**: `backend/app/api/v1/documents.py`

```
POST   /api/documents/upload          - Upload PDF/PPTX (max 50MB)
GET    /api/documents/                - Get all user documents
GET    /api/documents/{doc_id}        - Get specific document
DELETE /api/documents/{doc_id}        - Delete document
POST   /api/documents/{doc_id}/process - Process with AI
```

**Process Actions:**

- `generate_notes` - Create structured study notes
- `generate_quiz` - Generate quiz questions (coming soon)
- `summarize` - Create concise summary

### **3. Document Service**

**File**: `backend/app/services/document_service.py`

**Features:**

- ✅ File validation (type, size)
- ✅ Secure file storage with unique IDs
- ✅ Background text extraction
- ✅ Memory-efficient processing
- ✅ User-isolated storage (uploads/{user_id}/)
- ✅ Automatic cleanup on delete

### **4. PDF/PPTX Extraction**

**File**: `backend/app/pdfReader/extract_pdf.py`

**Already Implemented:**

- Page-by-page PDF text extraction (pdfplumber)
- Slide-by-slide PPTX extraction (python-pptx)
- Memory-efficient processing up to 50MB
- Text cleaning and formatting
- Chunk preparation for LLM processing

---

## 🎨 Frontend Structure

### **1. Documents Component**

**File**: `frontend/src/components/Documents.jsx`

**Features:**

- ✅ Drag & drop file upload interface
- ✅ Real-time upload progress
- ✅ Document list with status indicators
- ✅ File size and page count display
- ✅ Processing actions (Notes, Quiz, Summary)
- ✅ Delete with confirmation modal
- ✅ Responsive design with Tailwind CSS

### **2. API Service Integration**

**File**: `frontend/src/services/apiService.js`

**New Methods:**

```javascript
apiService.uploadDocument(userId, file);
apiService.getUserDocuments(userId);
apiService.getDocument(docId);
apiService.deleteDocument(docId);
apiService.processDocument(docId, action, options);
```

### **3. Navigation Integration**

**Added to:**

- ✅ App.jsx - New route for "documents" page
- ✅ Dashboard.jsx - Documents button in sidebar
- ✅ Dashboard.jsx - "Upload Documents" quick action card

---

## 🗄️ Database Schema

### MongoDB Collection: `documents`

```javascript
{
  id: "doc_abc123xyz456",
  user_id: "user_xyz789",
  filename: "machine_learning_notes.pdf",
  file_type: "pdf",
  file_size: 2048576,
  file_path: "/uploads/user_xyz789/doc_abc123xyz456.pdf",
  extracted_text: "Chapter 1: Introduction...",
  page_count: 45,
  processing_status: "completed",
  metadata: {
    title: "Machine Learning Notes",
    subject: "Computer Science"
  },
  created_at: "2024-01-15T10:30:00Z",
  processed_at: "2024-01-15T10:31:00Z"
}
```

**Indexes Needed** (for production):

```javascript
db.documents.createIndex({ user_id: 1, created_at: -1 });
db.documents.createIndex({ id: 1, user_id: 1 });
```

---

## 🚀 Usage Flow

### **User Journey:**

1. **Navigate to Documents**

   - Click "Documents" in sidebar OR
   - Click "Upload Documents" quick action on Dashboard

2. **Upload File**

   - Click upload area or drag & drop
   - Select PDF or PPTX file (max 50MB)
   - Click "Upload" button
   - Backend validates and stores file
   - Automatic text extraction begins

3. **View Documents**

   - See all uploaded documents
   - Status indicators:
     - ⏳ Pending - Just uploaded
     - 🔄 Processing - Extracting text
     - ✅ Ready - Can be processed
     - ❌ Failed - Error occurred

4. **Process with AI**

   - Once status is "Ready"
   - Click action buttons:
     - 📝 Notes - Generate study notes
     - 📊 Quiz - Generate quiz (coming soon)
     - ✨ Summary - Create summary

5. **Manage Documents**
   - View file details (size, pages, date)
   - Delete unwanted documents
   - Confirmation before deletion

---

## 🔧 Configuration

### **Backend Requirements** (already in requirements.txt)

```
pdfplumber>=0.11.0
python-pptx>=0.6.23
python-multipart>=0.0.12
```

### **Environment Variables**

```bash
# Already configured
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### **File Storage**

- Location: `backend/uploads/{user_id}/`
- Auto-created on first upload
- Isolated per user for security
- Clean up when documents are deleted

---

## 📊 Features Summary

### ✅ **Implemented**

- File upload (PDF & PPTX)
- File validation (type, size, content)
- Secure storage with user isolation
- Automatic text extraction
- Document listing and details
- Document deletion
- AI processing (notes, summary)
- Status tracking (pending → processing → completed)
- Responsive UI with upload progress
- Error handling and user feedback

### 🚧 **Coming Soon**

- Quiz generation from documents
- Document search and filtering
- Document preview/viewer
- Batch upload
- Document sharing
- Export processed content

---

## 🎯 Testing Checklist

### **Backend Testing**

```bash
# Start backend
cd backend
uvicorn main:app --reload

# Test endpoints (use Postman or curl)
POST /api/documents/upload
GET  /api/documents/
GET  /api/documents/{doc_id}
POST /api/documents/{doc_id}/process
DELETE /api/documents/{doc_id}
```

### **Frontend Testing**

```bash
# Start frontend
cd frontend
npm run dev

# Test workflow:
1. ✅ Navigate to Documents page
2. ✅ Upload PDF file
3. ✅ Upload PPTX file
4. ✅ Wait for processing
5. ✅ Generate notes from document
6. ✅ Generate summary
7. ✅ Delete document
8. ✅ Test file size validation (>50MB)
9. ✅ Test file type validation (.txt, .doc)
```

---

## 🎨 UI Components

### **Status Indicators**

- ⏳ **Pending** (gray) - Just uploaded
- 🔄 **Processing** (blue, spinning) - Extracting text
- ✅ **Ready** (green) - Can process with AI
- ❌ **Failed** (red) - Error occurred

### **Action Buttons** (shown when Ready)

- 📝 **Notes** - Blue background
- 📊 **Quiz** - Green background
- ✨ **Summary** - Purple background

### **Navigation**

- Dashboard sidebar: "Documents" button with BookOpenIcon
- Quick Actions: "Upload Documents" card (purple gradient)
- Top nav: Documents link in all pages

---

## 🔐 Security Features

1. **Authentication Required** - Bearer token for all endpoints
2. **User Isolation** - Can only access own documents
3. **File Validation** - Type and size checks
4. **Secure Storage** - Files stored with unique IDs
5. **Path Sanitization** - Prevents directory traversal
6. **MongoDB Security** - User ID filtering on all queries

---

## 📝 API Examples

### **Upload Document**

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("/api/documents/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### **Process Document**

```javascript
const response = await fetch(`/api/documents/${docId}/process`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "generate_notes",
    options: {},
  }),
});
```

---

## 🎉 Success!

The document upload feature is now fully integrated and ready to use. Users can:

1. ✅ Upload PDFs and PPTX files
2. ✅ View all their documents
3. ✅ Process documents with AI
4. ✅ Generate study materials automatically
5. ✅ Manage their document library

**Access the feature:** Dashboard → Documents (sidebar) or "Upload Documents" quick action

---

## 📞 Support

For issues or questions:

- Check console logs for detailed errors
- Verify API keys are configured
- Ensure MongoDB is running
- Check file permissions in uploads/ directory
