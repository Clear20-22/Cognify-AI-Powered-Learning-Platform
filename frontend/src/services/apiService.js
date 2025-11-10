// Simple API service for backend communication
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async sendMessage(message, context = null) {
    try {
      const response = await fetch(`${this.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
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
      const response = await fetch(`${this.baseURL}/api/chats/user/${userId}`, {
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
      let url = `${this.baseURL}/api/exams/user/${userId}`;
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(`Failed to get user exams: ${error.message}`);
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
}

export const apiService = new ApiService();