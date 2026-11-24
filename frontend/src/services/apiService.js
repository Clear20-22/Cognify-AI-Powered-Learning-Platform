// DTO Adapters (Adapter Pattern) for API normalization
export const adaptExamData = (rawExam) => {
  if (!rawExam) return null;
  return {
    id: rawExam.id || rawExam._id || rawExam.exam_id,
    topic: rawExam.topic || 'General Topic',
    difficulty: rawExam.difficulty || 'intermediate',
    numQuestions: rawExam.num_questions || (rawExam.questions ? rawExam.questions.length : 0),
    questions: (rawExam.questions || []).map((q, idx) => ({
      index: q.index !== undefined ? q.index : idx,
      question: q.question || '',
      options: q.options || [],
      correct: q.correct || null
    })),
    score: rawExam.score || null,
    submitted: !!rawExam.submitted,
    createdAt: rawExam.created_at || new Date().toISOString()
  };
};

export const adaptDocumentData = (rawDoc) => {
  if (!rawDoc) return null;
  return {
    id: rawDoc.id || rawDoc._id,
    filename: rawDoc.filename || rawDoc.name || 'Untitled Document',
    fileType: rawDoc.file_type || rawDoc.type || 'pdf',
    charCount: rawDoc.char_count || 0,
    uploadedAt: rawDoc.uploaded_at || rawDoc.created_at || new Date().toISOString()
  };
};

// Simple API service for backend communication
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async sendMessage(message, userId, context = null, chatId = null) {
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          user_id: userId,
          context: context,
          chat_id: chatId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Chat API methods
  async generateChat(userId, subject, difficulty = 'intermediate') {
    try {
      const response = await fetch(`${this.baseURL}/api/chats/generate?user_id=${userId}&subject=${encodeURIComponent(subject)}&difficulty=${difficulty}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to generate chat: ${error.message}`);
    }
  }

  async getChat(chatId) {
    try {
      const response = await fetch(`${this.baseURL}/api/chats/${chatId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get chat: ${error.message}`);
    }
  }

  async getUserChats(userId) {
    try {
      const response = await fetch(`${this.baseURL}/api/users/${userId}/chats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get user chats: ${error.message}`);
    }
  }

  // Exam API methods
  async generateExamFromChat(chatId, userId, numQuestions = 5) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/generate-from-chat/${chatId}?user_id=${userId}&num_questions=${numQuestions}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to generate exam from chat: ${error.message}`);
    }
  }

  async generateExamByTopic(userId, subject, topic = null, difficulty = 'intermediate', numQuestions = 5, chatId = null) {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        subject: subject,
        difficulty: difficulty,
        num_questions: numQuestions
      });
      
      if (topic) params.append('topic', topic);
      if (chatId) params.append('chat_id', chatId);

      const response = await fetch(`${this.baseURL}/api/exams/generate-by-topic?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to generate exam by topic: ${error.message}`);
    }
  }

  async getExam(examId) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/${examId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get exam: ${error.message}`);
    }
  }

  async getUserExams(userId, status = null) {
    try {
      let url = `${this.baseURL}/api/exams/users/${userId}`;
      if (status) {
        url += `?status=${status}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Return empty array if endpoint doesn't exist yet
        if (response.status === 404) {
          return { exams: [] };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      // Return empty array instead of throwing
      return { exams: [] };
    }
  }

  async getChatExams(chatId) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/chat/${chatId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get chat exams: ${error.message}`);
    }
  }

  async createExam(examData) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(examData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to create exam: ${error.message}`);
    }
  }

  async submitAnswer(examId, questionId, answer) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/${examId}/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exam_id: examId,
          question_id: questionId,
          answer: answer
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to submit answer: ${error.message}`);
    }
  }

  async submitExam(data) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to submit exam: ${error.message}`);
    }
  }

  async saveExamProgress(examId, answers) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exam_id: examId,
          answers: answers
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to save progress: ${error.message}`);
    }
  }

  async completeExam(examId) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/${examId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to complete exam: ${error.message}`);
    }
  }

  async deleteExam(examId) {
    try {
      const response = await fetch(`${this.baseURL}/api/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // DELETE may return 204 No Content or a success response
      if (response.status === 204) {
        return { success: true };
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to delete exam: ${error.message}`);
    }
  }

  // Notes API methods
  // Notes are private to their owner (FR-NOTE-04), so every call sends the user's token.
  // A demo session has no account on the server, so it has no notes.
  notesHeaders() {
    return this.authHeaders('Sign in to save and view notes');
  }

  // Headers for endpoints that require a signed-in account
  authHeaders(demoMessage = 'Please sign in to continue') {
    const token = localStorage.getItem('access_token');
    if (!token || token === 'demo-token') {
      throw new Error(demoMessage);
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  }

  isDemoSession() {
    const token = localStorage.getItem('access_token');
    return !token || token === 'demo-token';
  }

  async saveNote(userId, content, chatId = null, pdfName = null, tags = [], topic = null) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes`, {
        method: 'POST',
        headers: this.notesHeaders(),
        body: JSON.stringify({
          content: content,
          chat_id: chatId,
          pdf_name: pdfName,
          tags: tags,
          topic: topic
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to save note: ${error.message}`);
    }
  }

  async getNote(noteId) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes/${noteId}`, {
        method: 'GET',
        headers: this.notesHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get note: ${error.message}`);
    }
  }

  async getUserNotes(userId, limit = 100) {
    if (this.isDemoSession()) {
      return { user_id: userId, total: 0, notes: [] };
    }
    try {
      const response = await fetch(`${this.baseURL}/api/notes/users/${userId}/notes?limit=${limit}`, {
        method: 'GET',
        headers: this.notesHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get user notes: ${error.message}`);
    }
  }

  async updateNote(noteId, updates) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: this.notesHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to update note: ${error.message}`);
    }
  }

  async deleteNote(noteId) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: this.notesHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // DELETE returns 204 No Content, so don't try to parse JSON
      return { success: true };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }

  // Admin API methods (FR-AUTH-09) — the backend allows these for admins only
  async adminRequest(path, options = {}) {
    const response = await fetch(`${this.baseURL}/api/users${path}`, {
      ...options,
      headers: this.authHeaders()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : `HTTP error! status: ${response.status}`;
      throw new Error(detail);
    }
    return data;
  }

  async listUsers(limit = 500) {
    return this.adminRequest(`?limit=${limit}`);
  }

  async setUserStatus(userId, isActive) {
    return this.adminRequest(`/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
  }

  async setUserRole(userId, role) {
    return this.adminRequest(`/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  // Document API methods
  async uploadDocument(userId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('access_token');
      const headers = {};
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseURL}/api/documents/upload?user_id=${userId}`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, document: data };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  async getUserDocuments(userId) {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseURL}/api/documents/?user_id=${userId}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, documents: data.documents, total: data.total };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get documents: ${error.message}`);
    }
  }

  async getDocument(docId, userId) {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseURL}/api/documents/${docId}?user_id=${userId}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, document: data };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  async deleteDocument(docId, userId) {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseURL}/api/documents/${docId}?user_id=${userId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async processDocument(docId, userId, action, options = {}) {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseURL}/api/documents/${docId}/process?user_id=${userId}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ action, options })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, result: data.result, message: data.message };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  getDocumentFileUrl(docId, userId) {
    console.log('🔍 getDocumentFileUrl - docId:', docId, 'userId:', userId);
    // Always include user_id in the URL for reliability
    const url = `${this.baseURL}/api/documents/${docId}/file?user_id=${userId}`;
    console.log('📎 PDF URL:', url);
    return url;
  }

  async submitQuiz(docId, userId, questions, userAnswers) {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('💾 Submitting quiz for doc:', docId, 'with', Object.keys(userAnswers).length, 'answers');
      
      const response = await fetch(`${this.baseURL}/api/documents/${docId}/quiz/submit?user_id=${userId}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          document_id: docId,
          questions: questions,
          user_answers: userAnswers
        })
      });

      if (!response.ok) {
        console.error('❌ Failed to submit quiz. Status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Quiz submitted successfully:', data);
      return { success: true, attempt: data };
    } catch (error) {
      console.error('❌ API Error submitting quiz:', error);
      throw new Error(`Failed to submit quiz: ${error.message}`);
    }
  }

  async getLatestQuizAttempt(docId, userId) {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🔍 Fetching latest quiz attempt for doc:', docId);
      
      const response = await fetch(`${this.baseURL}/api/documents/${docId}/quiz/latest?user_id=${userId}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('ℹ️ No previous quiz attempt found for doc:', docId);
          return { success: false, attempt: null };
        }
        console.error('❌ Error fetching quiz attempt. Status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Retrieved previous quiz attempt:', data);
      return { success: true, attempt: data };
    } catch (error) {
      console.error('❌ API Error fetching quiz attempt:', error);
      return { success: false, attempt: null };
    }
  }
}

export const apiService = new ApiService();