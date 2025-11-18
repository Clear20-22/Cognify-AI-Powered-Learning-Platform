import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ChatIcon from "../assets/chat.svg";
import { apiService } from "../services/apiService";
import { useUserId, useAuth } from "../hooks/useAuth.jsx";
import Avatar from "./Avatar";

// Helper function to parse and format AI-generated content
const parseContent = (text) => {
  if (!text) return [];

  const sections = [];
  const lines = text.split("\n");
  let currentSection = { title: "", content: [], type: "normal" };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip lines with only markdown symbols or incomplete formatting
    if (
      trimmedLine.match(/^#{3,}$/) ||
      trimmedLine.match(/^[-*_]{3,}$/) ||
      trimmedLine.toLowerCase().includes("still have") ||
      trimmedLine === "---"
    ) {
      return;
    }

    // Check for headers (lines that start with ## or #### or end with :)
    if (trimmedLine.match(/^#{1,4}\s+(.+)$/)) {
      // Save previous section if it has content
      if (currentSection.content.length > 0 || currentSection.title) {
        sections.push({ ...currentSection });
      }
      // Start new section
      const titleText = trimmedLine.replace(/^#{1,4}\s+/, "").trim();
      currentSection = {
        title: titleText,
        content: [],
        type: "header",
        level: (trimmedLine.match(/^#+/) || [""])[0].length,
      };
    }
    // Check for section headers ending with colon
    else if (
      trimmedLine.match(/^(.+):$/) &&
      trimmedLine.length < 60 &&
      !trimmedLine.match(/^https?:/)
    ) {
      // Save previous section if it has content
      if (currentSection.content.length > 0 || currentSection.title) {
        sections.push({ ...currentSection });
      }
      // Start new section
      currentSection = {
        title: trimmedLine.replace(/:$/, "").trim(),
        content: [],
        type: "header",
        level: 2,
      };
    }
    // Check for bullet points
    else if (
      trimmedLine.match(/^[-•*]\s+(.+)/) ||
      trimmedLine.match(/^\d+\.\s+(.+)/)
    ) {
      const bulletText = trimmedLine
        .replace(/^[-•*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim();

      if (bulletText.length > 0) {
        currentSection.content.push({
          type: "bullet",
          text: bulletText,
        });
      }
    }
    // Check for bold text **text** or important standalone lines
    else if (
      trimmedLine.includes("**") ||
      (trimmedLine.length > 5 &&
        trimmedLine === trimmedLine.toUpperCase() &&
        trimmedLine.match(/^[A-Z\s]+$/) &&
        !trimmedLine.match(/^\d/))
    ) {
      currentSection.content.push({
        type: "bold",
        text: trimmedLine,
      });
    }
    // Regular text
    else if (trimmedLine.length > 0) {
      currentSection.content.push({
        type: "text",
        text: trimmedLine,
      });
    }
    // Empty line - create separation (but not multiple in a row)
    else if (
      currentSection.content.length > 0 &&
      currentSection.content[currentSection.content.length - 1]?.type !==
        "space"
    ) {
      currentSection.content.push({ type: "space" });
    }
  });

  // Add last section if it has meaningful content
  if (currentSection.content.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  // Filter out empty sections
  return sections.filter(
    (section) => section.title || section.content.length > 0
  );
};

// Helper to render formatted text with bold
const renderFormattedText = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

function ChatPage({ onNavigate }) {
  const { chatId } = useParams(); // Get chatId from URL
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState("");
  const [currentChatSubject, setCurrentChatSubject] = useState("");

  // Exam states - now dynamic
  const [examStarted, setExamStarted] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [examLoading, setExamLoading] = useState(false);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [showExamPanel, setShowExamPanel] = useState(false); // Control exam panel visibility

  // Chat states
  const [currentChat, setCurrentChat] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const [examPanelWidth, setExamPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Chat messages - now dynamic
  const [messages, setMessages] = useState([]);

  // Edit and file upload states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track saved notes (messageId -> noteId mapping)
  const [savedNotes, setSavedNotes] = useState({});

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // History state
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Get real user ID
  const userId = useUserId();
  const { user, signOut } = useAuth();

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;
      
      try {
        const result = await apiService.getUserChats(userId);
        if (result && result.chats) {
          setChatHistory(result.chats);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    loadChatHistory();
  }, [userId]);

  // Group chats by date
  const groupChatsByDate = (chats) => {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    chats.forEach((chat) => {
      const chatDate = new Date(chat.created_at);
      let groupKey;

      if (chatDate.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (chatDate.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (chatDate > lastWeek) {
        groupKey = "Last 7 Days";
      } else {
        groupKey = chatDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(chat);
    });

    return groups;
  };

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  // Handle search in chat messages
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Filter messages that contain the search query (case-insensitive)
    const results = messages.filter((msg) =>
      msg.text.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(results.map(msg => msg.id));
  };

  // Highlight search text in message
  const highlightSearchText = (text, query) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="bg-yellow-300 text-gray-900">{part}</mark>
        : part
    );
  };

  const currentQuestion =
    currentExam?.exam_data?.questions?.[currentQuestionIndex];

  // Create a new chat with generated content
  const createNewChat = async (
    subject = "Mathematics",
    difficulty = "intermediate"
  ) => {
    try {
      setChatLoading(true);
      const newChat = await apiService.generateChat(
        userId,
        subject,
        difficulty
      );

      setCurrentChat(newChat);

      // Convert chat messages to display format
      const displayMessages = newChat.chat_data.messages.map((msg) => ({
        id: msg.id,
        from: msg.from_user === "user" ? "user" : "ai",
        text: msg.text,
      }));

      setMessages(displayMessages);

      // Don't automatically generate exam - let user request it manually
      // await generateExamFromCurrentChat(newChat.chat_id);
    } catch (error) {
      console.error("Failed to create chat:", error);
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
      const newExam = await apiService.generateExamFromChat(
        examChatId,
        userId,
        5
      );

      setCurrentExam(newExam);
      setExamStarted(true);
      setShowExamPanel(true); // Show panel when exam is generated
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error) {
      console.error("Failed to generate exam from chat:", error);
      // Fallback to topic-based exam generation
      const subject = currentChat?.subject || "Mathematics";
      await generateExamByTopic(subject);
    } finally {
      setExamLoading(false);
    }
  };

  // Generate exam by topic
  const generateExamByTopic = async (
    subject = "Mathematics",
    topic = null,
    difficulty = "intermediate"
  ) => {
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
      setShowExamPanel(true); // Show panel when exam is generated
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error) {
      console.error("Failed to generate exam by topic:", error);
      // Final fallback to demo exam
      await createDemoExam();
    } finally {
      setExamLoading(false);
    }
  };

  // Create demo content when API is not available
  const createDemoChat = async (
    subject = "Mathematics",
    difficulty = "intermediate"
  ) => {
    const demoChat = {
      chat_id: "demo-chat",
      title: `${subject} Discussion`,
      subject: subject,
      chat_data: {
        messages: [
          {
            id: "msg_1",
            from_user: "user",
            text: `Hi! Can you help me understand ${subject}? I'm at ${difficulty} level.`,
          },
          {
            id: "msg_2",
            from_user: "ai",
            text: `Of course! I'd be happy to help you with ${subject}. Let's start with the fundamentals.`,
          },
        ],
        metadata: {
          subject: subject,
          difficulty: difficulty,
        },
      },
    };

    setCurrentChat(demoChat);

    const displayMessages = demoChat.chat_data.messages.map((msg) => ({
      id: msg.id,
      from: msg.from_user === "user" ? "user" : "ai",
      text: msg.text,
    }));

    setMessages(displayMessages);
    // Don't automatically generate exam - let user request it manually
    // await createDemoExam();
  };

  // Load chat from URL parameter
  useEffect(() => {
    const loadChatFromUrl = async () => {
      if (chatId && userId) {
        try {
          console.log("Loading chat with ID:", chatId);
          setChatLoading(true);
          const chatData = await apiService.getChat(chatId);
          
          console.log("Loaded chat data:", chatData);
          
          if (chatData) {
            setCurrentChat({
              chat_id: chatData.id,
              title: chatData.topic,
              subject: chatData.topic,
              chat_data: {
                messages: chatData.messages || [],
                metadata: {
                  subject: chatData.topic,
                  difficulty: chatData.difficulty
                }
              }
            });
            
            // Convert messages to display format
            const displayMessages = (chatData.messages || []).map((msg, idx) => ({
              id: msg.id || `msg_${idx}`,
              from: msg.from_user === "user" || msg.role === "user" ? "user" : "ai",
              text: msg.text || msg.content || "",
            }));
            
            console.log("Display messages:", displayMessages);
            setMessages(displayMessages);
          }
        } catch (error) {
          console.error("Failed to load chat:", error);
        } finally {
          setChatLoading(false);
        }
      }
    };

    loadChatFromUrl();
  }, [chatId, userId]);

  // Load initial content when component mounts
  useEffect(() => {
    const loadChatExams = async () => {
      try {
        setExamLoading(true);

        if (currentChat) {
          const exams = await apiService.getChatExams(currentChat.chat_id);
          const inProgressExam = exams.find(
            (exam) => exam.status === "in_progress"
          );

          if (inProgressExam) {
            setCurrentExam(inProgressExam);
            setExamStarted(true);
            setShowExamPanel(true); // Show panel when loading existing exam
            // Load existing answers
            const existingAnswers = {};
            inProgressExam.exam_data.user_answers.forEach((answer) => {
              existingAnswers[answer.question_id] = answer.answer;
            });
            setAnswers(existingAnswers);
          }
        }
      } catch (error) {
        console.error("Failed to load chat exams:", error);
      } finally {
        setExamLoading(false);
      }
    };

    loadChatExams();
  }, [userId, currentChat]);

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
              options: [
                "Practice and repetition",
                "Memorization only",
                "Avoiding challenges",
                "Passive listening",
              ],
              correct_answer: "Practice and repetition",
              explanation:
                "Active practice and repetition help reinforce learning and build understanding.",
            },
            {
              id: "q2",
              type: "mcq",
              question: "Which approach is most effective for problem-solving?",
              options: [
                "Guessing randomly",
                "Breaking down complex problems",
                "Avoiding difficult questions",
                "Rushing through",
              ],
              correct_answer: "Breaking down complex problems",
              explanation:
                "Breaking complex problems into smaller, manageable parts makes them easier to solve.",
            },
          ],
          user_answers: [],
          results: {},
        },
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
          exam_data: demoExamData.exam_data,
        });
      }

      setExamStarted(true);
      setShowExamPanel(true); // Show panel when demo exam is created
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error) {
      console.error("Failed to create demo exam:", error);
    }
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const cancelNewChat = () => {
    setNewChatSubject("");
    setShowNewChatModal(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      from: "user",
      text: input.trim(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setSelectedFiles([]); // Clear selected files
    setIsLoading(true);

    try {
      // Get AI response with chat_id for persistence
      const result = await apiService.sendMessage(
        currentInput, 
        userId, 
        null, 
        currentChat?.chat_id
      );

      // Update chat_id if this was a new conversation
      if (result.chat_id && !currentChat?.chat_id) {
        setCurrentChat((prev) => ({
          ...prev,
          chat_id: result.chat_id,
        }));
      }

      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        from: "ai",
        text: result.response,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to get AI response:", error);

      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        from: "ai",
        text: "Sorry, I'm having trouble connecting to the AI service. Please try again later.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy message to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show brief success feedback
        alert("✓ Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard");
      });
  };

  // Save AI response as note or unsave if already saved
  const saveAsNote = async (text, messageId) => {
    try {
      // Check if this message is already saved
      if (savedNotes[messageId]) {
        // Unsave - delete the note
        await apiService.deleteNote(savedNotes[messageId]);
        
        // Remove from savedNotes state
        setSavedNotes(prev => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        
        alert("✅ Note removed successfully!");
      } else {
        // Save new note
        const result = await apiService.saveNote(
          userId,
          text,
          currentChat?.chat_id || null,
          null, // pdf_name - can be added later if PDF upload is implemented
          [] // tags - can be added with a tag input UI
        );

        // Check if result contains note_id or id to confirm success
        if (result && (result.note_id || result.id)) {
          // Track the saved note
          setSavedNotes(prev => ({
            ...prev,
            [messageId]: result.note_id || result.id
          }));
          
          alert("✅ Note saved successfully!");
        } else {
          throw new Error("Invalid response from server");
        }
      }
    } catch (error) {
      console.error("Failed to save/unsave note:", error);
      alert("❌ Failed to save/unsave note. Please try again.");
    }
  };

  // Start editing a message
  const startEdit = (messageId, text) => {
    setEditingMessageId(messageId);
    setEditText(text);
  };

  // Save edited message
  const saveEdit = async () => {
    if (!editText.trim()) return;

    // Update the message in the list
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === editingMessageId ? { ...msg, text: editText.trim() } : msg
      )
    );

    // Get AI response for edited message
    setEditingMessageId(null);
    setEditText("");
    setIsLoading(true);

    try {
      const result = await apiService.sendMessage(
        editText.trim(), 
        userId, 
        null, 
        currentChat?.chat_id
      );

      // Update chat_id if needed
      if (result.chat_id && !currentChat?.chat_id) {
        setCurrentChat((prev) => ({
          ...prev,
          chat_id: result.chat_id,
        }));
      }

      const aiMessage = {
        id: Date.now(),
        from: "ai",
        text: result.response,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  // Remove selected file
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !answers[currentQuestion.id] || !currentExam)
      return;

    try {
      setExamSubmitting(true);

      // Submit answer to API
      if (currentExam.exam_id !== "demo-exam") {
        const response = await apiService.submitAnswer(
          currentExam.exam_id,
          currentQuestion.id,
          answers[currentQuestion.id]
        );

        // Show feedback if available
        if (response.is_correct !== null) {
          const feedbackMessage = {
            id: Date.now(),
            from: "ai",
            text: `${response.is_correct ? "✅ Correct!" : "❌ Incorrect."} ${
              response.explanation || ""
            }`,
          };
          setMessages((prev) => [...prev, feedbackMessage]);
        }
      } else {
        // For demo exam, just show a local message
        const feedbackMessage = {
          id: Date.now(),
          from: "ai",
          text: `Answer "${
            answers[currentQuestion.id]
          }" submitted for question ${currentQuestionIndex + 1}.`,
        };
        setMessages((prev) => [...prev, feedbackMessage]);
      }

      // Move to next question or complete exam
      if (currentQuestionIndex < currentExam.exam_data.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // All questions answered, complete the exam
        await completeExam();
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      const errorMessage = {
        id: Date.now(),
        from: "ai",
        text: "Failed to submit answer. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
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
          text: `🎉 Exam completed! Your score: ${response.results.score?.toFixed(
            1
          )}% (${response.results.correct_answers}/${
            response.results.total_questions
          } correct)`,
        };
        setMessages((prev) => [...prev, resultsMessage]);
      } else {
        const resultsMessage = {
          id: Date.now(),
          from: "ai",
          text: "🎉 Demo exam completed! Thank you for trying the exam feature.",
        };
        setMessages((prev) => [...prev, resultsMessage]);
      }

      setExamStarted(false);
      setCurrentExam(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error("Failed to complete exam:", error);
      const errorMessage = {
        id: Date.now(),
        from: "ai",
        text: "Failed to complete exam. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setExamSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentExam.exam_data.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
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
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Expandable Left Sidebar - ChatGPT Style with Red Theme */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-red-900 via-red-800 to-red-900 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-2 space-y-2 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className={`flex items-center w-full p-3 border border-red-700 hover:bg-red-800 rounded-lg transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
            title="New Chat"
          >
            <svg
              className="w-5 h-5 text-white flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {sidebarOpen && (
              <span className="text-sm text-white ml-3">
                New chat
              </span>
            )}
          </button>

          {/* Search in Chat */}
          {sidebarOpen ? (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search in chat..."
                className="w-full p-2.5 pl-10 bg-red-800/30 border border-red-700 rounded-lg text-sm text-white placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
              <svg
                className="w-4 h-4 text-red-300 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {searchResults.length > 0 && (
                    <span className="text-xs text-red-200 bg-red-800 px-2 py-0.5 rounded">
                      {searchResults.length}
                    </span>
                  )}
                  <button
                    onClick={() => handleSearch("")}
                    className="text-red-300 hover:text-white"
                    title="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-full p-3 hover:bg-red-800 rounded-lg transition-colors"
              title="Search in Chat"
            >
              <svg
                className="w-5 h-5 text-red-300 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={() => onNavigate && onNavigate("history")}
            className={`flex items-center w-full p-3 hover:bg-red-800 rounded-lg transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
            title="History"
          >
            <svg
              className="w-5 h-5 text-red-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {sidebarOpen && (
              <span className="text-sm text-white ml-3">
                History
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Middle Section */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {/* Future content can go here */}
          </div>
        </div>

        {/* Fixed Bottom Section */}
        <div className="border-t border-red-700 p-2 space-y-1 flex-shrink-0">
          {/* My Notes */}
          <button
            onClick={() => onNavigate && onNavigate("notes")}
            className={`flex items-center w-full p-3 hover:bg-red-800 rounded-lg transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
            title="My Notes"
          >
            <svg
              className="w-5 h-5 text-red-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {sidebarOpen && (
              <span className="text-sm text-red-100 ml-3">
                My Notes
              </span>
            )}
          </button>

          {/* Dashboard */}
          <button
            onClick={() => onNavigate && onNavigate("dashboard")}
            className={`flex items-center w-full p-3 hover:bg-red-800 rounded-lg transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
            title="Dashboard"
          >
            <svg
              className="w-5 h-5 text-red-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {sidebarOpen && (
              <span className="text-sm text-red-100 ml-3">
                Dashboard
              </span>
            )}
          </button>

          {/* Toggle Sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center w-full p-3 hover:bg-red-800 rounded-lg transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <svg
              className="w-5 h-5 text-red-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  sidebarOpen
                    ? "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    : "M13 5l7 7-7 7M5 5l7 7-7 7"
                }
              />
            </svg>
            {sidebarOpen && (
              <span className="text-sm text-red-100 ml-3">
                Close sidebar
              </span>
            )}
          </button>

          {/* User Profile */}
          {user && (
            <button className={`flex items-center w-full p-3 hover:bg-red-800 rounded-lg overflow-hidden transition-colors ${
              sidebarOpen ? "justify-start" : "justify-center"
            }`}>
              <Avatar
                src={null}
                alt={`${
                  user.name || user.email?.split("@")[0] || "User"
                }'s avatar`}
                size="w-7 h-7"
                fallbackText={(user.name ||
                  user.email?.split("@")[0] ||
                  "U")[0].toUpperCase()}
              />
              {sidebarOpen && (
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name || user.email?.split("@")[0]}
                  </p>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Center Panel - AI Chat */}
      <div
        className="bg-white flex flex-col shadow-lg"
        style={{
          width: showExamPanel
            ? `calc(100% - ${
                sidebarOpen ? "256px" : "64px"
              } - ${examPanelWidth}px)`
            : `calc(100% - ${sidebarOpen ? "256px" : "64px"})`,
          marginLeft: sidebarOpen ? "256px" : "64px",
        }}
      >
        {/* Chat Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              AI Learning Assistant
            </h2>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {/* Search Results Info */}
            {searchQuery && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                {searchResults.length > 0 ? (
                  <p className="text-yellow-800">
                    Found <strong>{searchResults.length}</strong> message{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"
                  </p>
                ) : (
                  <p className="text-yellow-800">No messages found matching "{searchQuery}"</p>
                )}
              </div>
            )}

            {messages
              .filter((msg) => !searchQuery || searchResults.includes(msg.id))
              .map(({ id, from, text }) => (
              <div
                key={id}
                className={`flex ${
                  from === "user" ? "justify-end" : "justify-start"
                } ${searchResults.includes(id) ? 'ring-2 ring-yellow-400 rounded-2xl' : ''}`}
              >
                <div className="flex flex-col gap-2 max-w-[80%]">
                  {editingMessageId === id ? (
                    // Edit mode
                    <div className="w-full">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-red-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 text-sm resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={saveEdit}
                          className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                        >
                          Save & Resend
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal message display
                    <>
                      <div
                        className={`px-5 py-3 rounded-2xl shadow-sm ${
                          from === "user"
                            ? "bg-gradient-to-r from-red-600 to-red-700 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {from === "ai" ? (
                          // Formatted AI response with sections
                          <div className="text-sm leading-relaxed space-y-4">
                            {parseContent(text).map((section, sIdx) => (
                              <div key={sIdx} className="space-y-2.5">
                                {section.title && (
                                  <div>
                                    <h3
                                      className={`font-bold ${
                                        section.level === 1
                                          ? "text-lg text-red-700 mb-3 pb-2 border-b-2 border-red-200"
                                          : section.level === 2
                                          ? "text-base text-red-600 mb-2"
                                          : "text-sm text-gray-800 mb-1.5"
                                      }`}
                                    >
                                      {section.title}
                                    </h3>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  {section.content.map((item, iIdx) => {
                                    if (item.type === "bullet") {
                                      return (
                                        <div
                                          key={iIdx}
                                          className="flex gap-3 items-start pl-1"
                                        >
                                          <span className="text-red-500 mt-1.5 text-sm font-bold">
                                            •
                                          </span>
                                          <span className="flex-1 text-gray-800 leading-relaxed">
                                            {renderFormattedText(item.text)}
                                          </span>
                                        </div>
                                      );
                                    }
                                    if (item.type === "bold") {
                                      return (
                                        <p
                                          key={iIdx}
                                          className="font-bold text-gray-900 text-[15px]"
                                        >
                                          {renderFormattedText(item.text)}
                                        </p>
                                      );
                                    }
                                    if (item.type === "space") {
                                      return <div key={iIdx} className="h-3" />;
                                    }
                                    return (
                                      <p
                                        key={iIdx}
                                        className="text-gray-800 leading-relaxed"
                                      >
                                        {searchQuery 
                                          ? highlightSearchText(item.text, searchQuery)
                                          : renderFormattedText(item.text)
                                        }
                                      </p>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Simple user message
                          <p className="text-sm leading-relaxed">
                            {searchQuery ? highlightSearchText(text, searchQuery) : text}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div
                        className={`flex gap-2 px-2 ${
                          from === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <button
                          onClick={() => copyToClipboard(text)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors group"
                          title="Copy"
                        >
                          <svg
                            className="w-4 h-4 text-gray-500 group-hover:text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>

                        {from === "ai" && (
                          <button
                            onClick={() => saveAsNote(text, id)}
                            className={`p-1.5 rounded-lg transition-colors group ${
                              savedNotes[id] ? "bg-red-100" : "hover:bg-red-100"
                            }`}
                            title={savedNotes[id] ? "Remove from Notes" : "Save as Note"}
                          >
                            <svg
                              className={`w-4 h-4 transition-colors ${
                                savedNotes[id]
                                  ? "text-red-600 fill-red-600"
                                  : "text-red-500 group-hover:text-red-700"
                              }`}
                              fill={savedNotes[id] ? "currentColor" : "none"}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              />
                            </svg>
                          </button>
                        )}

                        {from === "user" && (
                          <button
                            onClick={() => startEdit(id, text)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors group"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4 text-gray-500 group-hover:text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-5 py-3 rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse">🤖</div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 bg-white p-6">
          <div className="max-w-3xl mx-auto">
            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-sm"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <span className="text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-3 items-end"
            >
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isLoading ? "AI is thinking..." : "Type your message..."
                  }
                  disabled={isLoading}
                  className="w-full pl-5 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-sm disabled:opacity-50 bg-white shadow-sm"
                />

                {/* File upload button inside input */}
                <label
                  htmlFor="file-upload"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Add photos or files"
                >
                  <svg
                    className="w-5 h-5 text-gray-500 hover:text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Resize Handle and Exam Panel - Only show when exam is generated */}
      {showExamPanel && (
        <>
          {/* Resize Handle */}
          <div
            className="w-1 bg-red-200 cursor-col-resize hover:bg-red-400 transition-colors relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-3 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-full w-full bg-red-500 rounded-full" />
            </div>
          </div>

          {/* Right Panel - Exam Section */}
          <div
            className="bg-white border-l border-red-100 flex flex-col shadow-lg"
            style={{ width: `${examPanelWidth}px` }}
          >
            {/* Exam Header */}
            <div className="px-6 py-6 bg-gradient-to-r from-red-600 to-red-700 border-b border-red-800">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                  {currentExam?.title || "Learning Tools"}
                </h2>
                <div className="flex gap-2">
                  <button
                    className="p-2 hover:bg-red-800 rounded-lg transition-colors"
                    onClick={() => createNewChat("Mathematics", "intermediate")}
                    disabled={chatLoading}
                    title="Generate Math Chat"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                      />
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-red-800 rounded-lg transition-colors"
                    onClick={() => createNewChat("Science", "intermediate")}
                    disabled={chatLoading}
                    title="Generate Science Chat"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-red-800 rounded-lg transition-colors"
                    onClick={loadChatExams}
                    disabled={examLoading || chatLoading}
                    title="Refresh Content"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {currentExam && (
                <div className="mt-2 text-sm text-red-100">
                  Subject: {currentExam.subject} | Question{" "}
                  {currentQuestionIndex + 1} of{" "}
                  {currentExam.exam_data.questions.length}
                </div>
              )}
              {currentChat && (
                <div className="mt-1 text-xs text-red-200">
                  Chat: {currentChat.title}
                </div>
              )}
            </div>

            {/* Exam Content */}
            <div className="flex-1 p-6 bg-gradient-to-b from-red-50/30 to-white overflow-y-auto">
              {examLoading || chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className="text-gray-700">
                      {chatLoading
                        ? "Generating educational content..."
                        : "Loading exam..."}
                    </p>
                  </div>
                </div>
              ) : !examStarted || !currentExam ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <p className="text-gray-600 mb-4">No active content</p>
                    <div className="space-y-2">
                      <button
                        onClick={() =>
                          createNewChat("Mathematics", "intermediate")
                        }
                        className="block w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Generate Math Content
                      </button>
                      <button
                        onClick={() => createNewChat("Science", "intermediate")}
                        className="block w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg"
                      >
                        Generate Science Content
                      </button>
                      <button
                        onClick={() => createNewChat("History", "intermediate")}
                        className="block w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg"
                      >
                        Generate History Content
                      </button>
                      <button
                        onClick={createDemoExam}
                        className="block w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg"
                      >
                        Start Demo Exam
                      </button>
                    </div>
                  </div>
                </div>
              ) : currentQuestion ? (
                <div className="space-y-6">
                  {/* Question Header */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-red-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Question {currentQuestionIndex + 1}:
                    </h3>
                    <p className="text-gray-800 text-lg mb-6 leading-relaxed">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">
                      Options:
                    </h4>
                    {currentQuestion.options?.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center space-x-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion.id] === option
                            ? "border-red-600 bg-red-50 shadow-md"
                            : "border-gray-200 hover:border-red-300 hover:bg-red-50/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={answers[currentQuestion.id] === option}
                          onChange={() => handleAnswerChange(option)}
                          className="w-5 h-5 text-red-600 border-2 border-gray-300 focus:ring-red-500 focus:ring-2"
                        />
                        <span className="text-gray-800 text-base font-medium">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-6">
                    <button
                      onClick={previousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="px-6 py-2.5 text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                      {currentQuestionIndex + 1} /{" "}
                      {currentExam.exam_data.questions.length}
                    </span>
                    <button
                      onClick={nextQuestion}
                      disabled={
                        currentQuestionIndex ===
                        currentExam.exam_data.questions.length - 1
                      }
                      className="px-6 py-2.5 text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No questions available</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            {examStarted && currentExam && currentQuestion && (
              <div className="p-6 border-t border-red-100 bg-gradient-to-r from-red-50/50 to-white">
                <button
                  onClick={submitAnswer}
                  disabled={!answers[currentQuestion.id] || examSubmitting}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {examSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : currentQuestionIndex ===
                    currentExam.exam_data.questions.length - 1 ? (
                    "Complete Exam"
                  ) : (
                    "Submit Answer"
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border-2 border-red-100">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Start New Chat
              </h3>
              <p className="text-sm text-gray-600">
                What subject would you like to discuss?
              </p>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={newChatSubject}
                onChange={(e) => setNewChatSubject(e.target.value)}
                placeholder="e.g., Mathematics, Physics, Programming..."
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/30 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newChatSubject.trim()) {
                    createNewChat(newChatSubject, "intermediate");
                    cancelNewChat();
                  } else if (e.key === "Escape") {
                    cancelNewChat();
                  }
                }}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelNewChat}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newChatSubject.trim()) {
                    createNewChat(newChatSubject, "intermediate");
                    cancelNewChat();
                  }
                }}
                disabled={!newChatSubject.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
