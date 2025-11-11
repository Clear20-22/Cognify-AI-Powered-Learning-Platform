import React, { useState, useEffect } from 'react';
import ChatIcon from '../assets/chat.svg';
import { apiService } from '../services/apiService';
import { useUserId, useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';

function ChatPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [currentChatSubject, setCurrentChatSubject] = useState('');
  
  // Exam states - now dynamic
  const [examStarted, setExamStarted] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [examLoading, setExamLoading] = useState(false);
  const [examSubmitting, setExamSubmitting] = useState(false);
  
  // Chat states
  const [currentChat, setCurrentChat] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  const [examPanelWidth, setExamPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  
  // Chat messages - now dynamic
  const [messages, setMessages] = useState([]);
  
  // Get real user ID
  const userId = useUserId();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  const currentQuestion = currentExam?.exam_data?.questions?.[currentQuestionIndex];

  // Create a new chat with generated content
  const createNewChat = async (subject = "Mathematics", difficulty = "intermediate") => {
    try {
      setChatLoading(true);
      const newChat = await apiService.generateChat(userId, subject, difficulty);
      
      setCurrentChat(newChat);
      
      // Convert chat messages to display format
      const displayMessages = newChat.chat_data.messages.map(msg => ({
        id: msg.id,
        from: msg.from_user === 'user' ? 'user' : 'ai',
        text: msg.text
      }));
      
      setMessages(displayMessages);
      
      // Automatically generate an exam from the chat
      await generateExamFromCurrentChat(newChat.chat_id);
      
    } catch (error) {
      console.error('Failed to create chat:', error);
      // Fallback to demo mode
      await createDemoChat(subject, difficulty);
    } finally {
      setChatLoading(false);
    }
  };

  // Generate exam from current chat
  const generateExamFromCurrentChat = async (chatId = null) => {
    if (!chatId && !currentChat) return;
    
    try {
      setExamLoading(true);
      const examChatId = chatId || currentChat.chat_id;
      const newExam = await apiService.generateExamFromChat(examChatId, userId, 5);
      
      setCurrentExam(newExam);
      setExamStarted(true);
      setCurrentQuestionIndex(0);
      setAnswers({});
      
    } catch (error) {
      console.error('Failed to generate exam from chat:', error);
      // Fallback to topic-based exam generation
      const subject = currentChat?.subject || "Mathematics";
      await generateExamByTopic(subject);
    } finally {
      setExamLoading(false);
    }
  };

  // Generate exam by topic
  const generateExamByTopic = async (subject = "Mathematics", topic = null, difficulty = "intermediate") => {
    try {
      setExamLoading(true);
      const newExam = await apiService.generateExamByTopic(
        userId, 
        subject, 
        topic, 
        difficulty, 
        5, 
        currentChat?.chat_id
      );
      
      setCurrentExam(newExam);
      setExamStarted(true);
      setCurrentQuestionIndex(0);
      setAnswers({});
      
    } catch (error) {
      console.error('Failed to generate exam by topic:', error);
      // Final fallback to demo exam
      await createDemoExam();
    } finally {
      setExamLoading(false);
    }
  };

  // Load exams for current chat
  const loadChatExams = async () => {
    try {
      setExamLoading(true);
      
      if (currentChat) {
        const exams = await apiService.getChatExams(currentChat.chat_id);
        const inProgressExam = exams.find(exam => exam.status === 'in_progress');
        
        if (inProgressExam) {
          setCurrentExam(inProgressExam);
          setExamStarted(true);
          // Load existing answers
          const existingAnswers = {};
          inProgressExam.exam_data.user_answers.forEach(answer => {
            existingAnswers[answer.question_id] = answer.answer;
          });
          setAnswers(existingAnswers);
          return;
        }
      }
      
      // If no chat or no exams, create new content
      await createNewChat();
      
    } catch (error) {
      console.error('Failed to load exams:', error);
      // Final fallback
      await createDemoChat();
    } finally {
      setExamLoading(false);
    }
  };

  // Create demo content when API is not available  
  const createDemoChat = async (subject = "Mathematics", difficulty = "intermediate") => {
    const demoChat = {
      chat_id: "demo-chat",
      title: `${subject} Discussion`,
      subject: subject,
      chat_data: {
        messages: [
          {
            id: "msg_1",
            from_user: "user",
            text: `Hi! Can you help me understand ${subject}? I'm at ${difficulty} level.`
          },
          {
            id: "msg_2", 
            from_user: "ai",
            text: `Of course! I'd be happy to help you with ${subject}. Let's start with the fundamentals.`
          }
        ],
        metadata: {
          subject: subject,
          difficulty: difficulty
        }
      }
    };
    
    setCurrentChat(demoChat);
    
    const displayMessages = demoChat.chat_data.messages.map(msg => ({
      id: msg.id,
      from: msg.from_user === 'user' ? 'user' : 'ai',
      text: msg.text
    }));
    
    setMessages(displayMessages);
    await createDemoExam();
  };

  // Load initial content when component mounts
  useEffect(() => {
    loadChatExams();
  }, [userId]);

  // Create a demo exam for demonstration
  const createDemoExam = async () => {
    try {
      const demoExamData = {
        user_id: userId,
        chat_id: currentChat?.chat_id || null,
        title: "Demo Assessment",
        subject: currentChat?.subject || "General",
        exam_data: {
          questions: [
            {
              id: "q1",
              type: "mcq",
              question: "What is a fundamental concept in learning?",
              options: ["Practice and repetition", "Memorization only", "Avoiding challenges", "Passive listening"],
              correct_answer: "Practice and repetition",
              explanation: "Active practice and repetition help reinforce learning and build understanding."
            },
            {
              id: "q2",
              type: "mcq",
              question: "Which approach is most effective for problem-solving?",
              options: ["Guessing randomly", "Breaking down complex problems", "Avoiding difficult questions", "Rushing through"],
              correct_answer: "Breaking down complex problems",
              explanation: "Breaking complex problems into smaller, manageable parts makes them easier to solve."
            }
          ],
          user_answers: [],
          results: {}
        }
      };

      try {
        const newExam = await apiService.createExam(demoExamData);
        setCurrentExam(newExam);
      } catch (apiError) {
        // If API fails, use local demo data
        setCurrentExam({
          exam_id: "demo-exam",
          title: "Demo Assessment",
          subject: "General",
          status: "in_progress",
          exam_data: demoExamData.exam_data
        });
      }
      
      setExamStarted(true);
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error) {
      console.error('Failed to create demo exam:', error);
    }
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const cancelNewChat = () => {
    setNewChatSubject('');
    setShowNewChatModal(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      id: Date.now(),
      from: "user",
      text: input.trim()
    };
    
    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);
    
    try {
      // Get AI response
      const aiResponse = await apiService.sendMessage(currentInput);
      
      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        from: "ai",
        text: aiResponse
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        from: "ai",
        text: "Sorry, I'm having trouble connecting to the AI service. Please try again later."
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !answers[currentQuestion.id] || !currentExam) return;
    
    try {
      setExamSubmitting(true);
      
      // Submit answer to API
      if (currentExam.exam_id !== "demo-exam") {
        const response = await apiService.submitAnswer(
          currentExam.exam_id,
          currentQuestion.id,
          answers[currentQuestion.id]
        );
        
        console.log('Answer submitted:', response);
        
        // Show feedback if available
        if (response.is_correct !== null) {
          const feedbackMessage = {
            id: Date.now(),
            from: "ai",
            text: `${response.is_correct ? '✅ Correct!' : '❌ Incorrect.'} ${response.explanation || ''}`
          };
          setMessages(prev => [...prev, feedbackMessage]);
        }
      } else {
        // For demo exam, just show a local message
        const feedbackMessage = {
          id: Date.now(),
          from: "ai", 
          text: `Answer "${answers[currentQuestion.id]}" submitted for question ${currentQuestionIndex + 1}.`
        };
        setMessages(prev => [...prev, feedbackMessage]);
      }
      
      // Move to next question or complete exam
      if (currentQuestionIndex < currentExam.exam_data.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // All questions answered, complete the exam
        await completeExam();
      }
      
    } catch (error) {
      console.error('Failed to submit answer:', error);
      const errorMessage = {
        id: Date.now(),
        from: "ai",
        text: "Failed to submit answer. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setExamSubmitting(false);
    }
  };

  const completeExam = async () => {
    if (!currentExam) return;
    
    try {
      setExamSubmitting(true);
      
      if (currentExam.exam_id !== "demo-exam") {
        const response = await apiService.completeExam(currentExam.exam_id);
        
        const resultsMessage = {
          id: Date.now(),
          from: "ai",
          text: `🎉 Exam completed! Your score: ${response.results.score?.toFixed(1)}% (${response.results.correct_answers}/${response.results.total_questions} correct)`
        };
        setMessages(prev => [...prev, resultsMessage]);
      } else {
        const resultsMessage = {
          id: Date.now(),
          from: "ai",
          text: "🎉 Demo exam completed! Thank you for trying the exam feature."
        };
        setMessages(prev => [...prev, resultsMessage]);
      }
      
      setExamStarted(false);
      setCurrentExam(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      
    } catch (error) {
      console.error('Failed to complete exam:', error);
      const errorMessage = {
        id: Date.now(),
        from: "ai",
        text: "Failed to complete exam. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setExamSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentExam.exam_data.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const windowWidth = window.innerWidth;
    const newWidth = windowWidth - e.clientX - 16;
    
    const constrainedWidth = Math.min(Math.max(newWidth, 280), 1000);
    setExamPanelWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Left Sidebar - Navigation */}
      <div className="w-16 bg-gray-200 flex flex-col items-center p-6">
        {/* Navigation Icons */}
        <div className="space-y-6">
          {/* Add New/Plus Icon */}
                    {/* Add New/Plus Icon */}
          <button 
            onClick={handleNewChat}
            className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-lg font-bold hover:bg-gray-800 transition-colors"
          >
            +
          </button>
          
          {/* Home Icon */}
          <button className="p-2 hover:bg-gray-300 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          
          {/* Chat Icon */}
          <button className="p-2 hover:bg-gray-300 rounded-lg transition-colors">
            <img src={ChatIcon} alt="Chat Icon" className="w-5 h-5 text-gray-600" />
          </button>
          
        </div>
        
        {/* Bottom Icons */}
        <div className="mt-auto space-y-4">
          {/* Settings Icon */}
          <button className="p-2 hover:bg-gray-300 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Logout Button */}
          <button 
            onClick={handleSignOut}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
            title="Sign Out"
          >
            <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          
          {/* User Avatar */}
          {user && (
            <Avatar
              src={null}
              alt={`${user.name || user.email?.split("@")[0] || "User"}'s avatar`}
              size="w-8 h-8"
              fallbackText={(user.name || user.email?.split("@")[0] || "U")[0].toUpperCase()}
            />
          )}
        </div>
      </div>

      {/* Center Panel - AI Chat */}
      <div className="bg-white flex flex-col" style={{ width: `calc(100% - 64px - ${examPanelWidth}px)` }}>
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">AI Assistant</h2>
              {currentChatSubject && (
                <p className="text-sm text-gray-500">{currentChatSubject}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(({ id, from, text }) => (
            <div
              key={id}
              className={`flex ${from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  from === "user"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">🤖</div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-gray-200 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-3 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-gray-400 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors relative group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-3 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-full w-full bg-gray-500 rounded-full" />
        </div>
      </div>

      {/* Right Panel - Exam Section */}
      <div className="bg-gray-50 border-l border-gray-200 flex flex-col" style={{ width: `${examPanelWidth}px` }}>
        {/* Exam Header */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentExam?.title || 'Educational Assistant'}
            </h2>
            <div className="flex gap-2">
              <button 
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                onClick={() => createNewChat("Mathematics", "intermediate")}
                disabled={chatLoading}
                title="Generate Math Chat"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>
              <button 
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                onClick={() => createNewChat("Science", "intermediate")}
                disabled={chatLoading}
                title="Generate Science Chat"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </button>
              <button 
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                onClick={loadChatExams}
                disabled={examLoading || chatLoading}
                title="Refresh Content"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          {currentExam && (
            <div className="mt-2 text-sm text-gray-600">
              Subject: {currentExam.subject} | Question {currentQuestionIndex + 1} of {currentExam.exam_data.questions.length}
            </div>
          )}
          {currentChat && (
            <div className="mt-1 text-xs text-gray-500">
              Chat: {currentChat.title}
            </div>
          )}
        </div>

        {/* Exam Content */}
        <div className="flex-1 p-6">
          {examLoading || chatLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-600">
                  {chatLoading ? 'Generating educational content...' : 'Loading exam...'}
                </p>
              </div>
            </div>
          ) : !examStarted || !currentExam ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <p className="text-gray-600 mb-4">No active content</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => createNewChat("Mathematics", "intermediate")}
                    className="block w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Generate Math Content
                  </button>
                  <button 
                    onClick={() => createNewChat("Science", "intermediate")}
                    className="block w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Generate Science Content
                  </button>
                  <button 
                    onClick={() => createNewChat("History", "intermediate")}
                    className="block w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Generate History Content
                  </button>
                  <button 
                    onClick={createDemoExam}
                    className="block w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Start Demo Exam
                  </button>
                </div>
              </div>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-6">
              {/* Question Header */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Question {currentQuestionIndex + 1}:
                </h3>
                <p className="text-gray-700 text-lg mb-6">{currentQuestion.question}</p>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h4 className="text-base font-medium text-gray-900 mb-4">Options:</h4>
                {currentQuestion.options?.map((option, index) => (
                  <label 
                    key={index} 
                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerChange(option)}
                      className="w-4 h-4 text-gray-600 border-2 border-gray-300 focus:ring-gray-500"
                    />
                    <span className="text-gray-700 text-base">{option}</span>
                  </label>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4">
                <button 
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {currentQuestionIndex + 1} / {currentExam.exam_data.questions.length}
                </span>
                <button 
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === currentExam.exam_data.questions.length - 1}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600">No questions available</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {examStarted && currentExam && currentQuestion && (
          <div className="p-6 border-t border-gray-200">
            <button 
              onClick={submitAnswer}
              disabled={!answers[currentQuestion.id] || examSubmitting}
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {examSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : currentQuestionIndex === currentExam.exam_data.questions.length - 1 ? (
                'Complete Exam'
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start New Chat</h3>
              <p className="text-sm text-gray-600">What subject would you like to discuss?</p>
            </div>
            
            <div className="mb-6">
              <input
                type="text"
                value={newChatSubject}
                onChange={(e) => setNewChatSubject(e.target.value)}
                placeholder="e.g., Mathematics, Physics, Programming..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createNewChat();
                  } else if (e.key === 'Escape') {
                    cancelNewChat();
                  }
                }}
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelNewChat}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewChat}
                disabled={!newChatSubject.trim()}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;