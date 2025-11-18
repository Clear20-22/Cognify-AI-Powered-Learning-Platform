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

  // Notes API methods
  async saveNote(userId, content, chatId = null, pdfName = null, tags = []) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          content: content,
          chat_id: chatId,
          pdf_name: pdfName,
          tags: tags
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
      throw new Error(`Failed to get note: ${error.message}`);
    }
  }

  async getUserNotes(userId, limit = 100) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes/users/${userId}/notes?limit=${limit}`, {
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
      throw new Error(`Failed to get user notes: ${error.message}`);
    }
  }

  async updateNote(noteId, updates) {
    try {
      const response = await fetch(`${this.baseURL}/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
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
        headers: {
          'Content-Type': 'application/json'
        }
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

  // Document API methods
  async uploadDocument(userId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${this.baseURL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
      const response = await fetch(`${this.baseURL}/api/documents/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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

  async getDocument(docId) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${this.baseURL}/api/documents/${docId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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

  async deleteDocument(docId) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${this.baseURL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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

  async processDocument(docId, action, options = {}) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${this.baseURL}/api/documents/${docId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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

  getDocumentFileUrl(docId) {
    const token = localStorage.getItem('access_token');
    return `${this.baseURL}/api/documents/${docId}/file?token=${token}`;
  }
}

export const apiService = new ApiService();