import React, { useState, useEffect, useRef } from "react";
import { useAuth, useUserId } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService.js";
import Avatar from "./Avatar";
import {
  SparklesIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  DocumentTextIcon,
  XMarkIcon,
  Bars3Icon,
  PlayIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function PracticeTest({ onNavigate }) {
  const { user, signOut } = useAuth();
  const userId = useUserId();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("intermediate");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [numQuestions, setNumQuestions] = useState(5);
  const [creating, setCreating] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [sortBy, setSortBy] = useState("date"); // date, score, name
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExams, setSelectedExams] = useState([]);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showAchievementBadge, setShowAchievementBadge] = useState(false);
  const [achievementData, setAchievementData] = useState(null);
  const optionsMenuRef = useRef(null);

  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "History",
    "Geography",
    "English",
    "Economics",
    "Psychology",
  ];

  const difficulties = [
    { value: "beginner", label: "Beginner", color: "green" },
    { value: "intermediate", label: "Intermediate", color: "blue" },
    { value: "advanced", label: "Advanced", color: "red" },
  ];

  const languages = [
    "English",
    "Bangla",
    // More languages will be added soon...
  ];

  // Helper function to get actual exam status - MUST be before useEffect
  const getActualStatus = (exam) => {
    const hasScore = exam.score !== undefined && exam.score !== null;
    return exam.submitted || hasScore ? "completed" : (exam.status || "active");
  };

  useEffect(() => {
    loadExams();
  }, [userId]);

  // Check for examId in URL params and load exam results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('examId');
    
    if (examId && userId) {
      loadExamResults(examId);
    }
  }, [userId]);

  // Debug: Log exams when they load
  useEffect(() => {
    // Removed debug logging
  }, [exams]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target)) {
        setShowOptionsMenu(false);
      }
    };

    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);

  const loadExams = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const result = await apiService.getUserExams(userId);
      if (result && result.exams) {
        setExams(result.exams);
      }
    } catch (error) {
      console.error("Failed to load exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamResults = async (examId) => {
    try {
      const examData = await apiService.getExam(examId);
      if (examData) {
        setExamResults(examData);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Failed to load exam results:", error);
      alert("❌ Failed to load exam results. Please try again.");
    }
  };

  const handleCreateExam = async () => {
    if (!selectedSubject) {
      alert("Please select a subject");
      return;
    }

    try {
      setCreating(true);
      const result = await apiService.createExam({
        user_id: userId,
        topic: selectedSubject,
        difficulty: selectedDifficulty,
        num_questions: numQuestions,
        language: selectedLanguage
      });
      
      if (result) {
        alert("✅ Practice test created successfully!");
        setShowCreateModal(false);
        setSelectedSubject("");
        setSelectedDifficulty("intermediate");
        setSelectedLanguage("English");
        setNumQuestions(5);
        loadExams();
      }
    } catch (error) {
      console.error("Failed to create exam:", error);
      alert("❌ Failed to create practice test. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  const handleContinueTest = async (exam) => {
    try {
      // Fetch full exam details
      const examData = await apiService.getExam(exam.id || exam._id);
      console.log("Exam data received:", examData);
      console.log("Questions:", examData.questions);
      
      // If exam is completed, show results view
      if (examData.submitted || exam.status === "completed") {
        setExamResults(examData);
        setShowResults(true);
      } else {
        // Otherwise, show exam taking view
        setActiveExam(examData);
        setCurrentQuestion(0);
        // Restore saved answers if any
        setUserAnswers(examData.progress_answers || {});
      }
    } catch (error) {
      console.error("Failed to load exam:", error);
      alert("❌ Failed to load exam. Please try again.");
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setUserAnswers(prev => {
      const updated = {
        ...prev,
        [questionIndex]: answer
      };
      
      // Auto-save progress when user answers a question
      if (activeExam) {
        console.log("💾 Saving progress...", updated);
        apiService.saveExamProgress(activeExam.id || activeExam._id, updated)
          .then(() => console.log("✅ Progress saved successfully"))
          .catch(err => console.error("❌ Failed to save progress:", err));
      }
      
      return updated;
    });
  };

  const handleSubmitExam = async () => {
    if (!activeExam) return;

    // Check if all questions are answered
    const totalQuestions = activeExam.questions?.length || 0;
    const answeredCount = Object.keys(userAnswers).length;
    
    if (answeredCount < totalQuestions) {
      if (!window.confirm(`You have only answered ${answeredCount} out of ${totalQuestions} questions. Do you want to submit anyway?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      console.log('📤 Submitting exam:', activeExam.id || activeExam._id);
      console.log('📝 User answers:', userAnswers);
      
      const result = await apiService.submitExam({
        exam_id: activeExam.id || activeExam._id,
        answers: userAnswers
      });
      
      console.log('✅ Submit result:', result);
      
      if (result.success) {
        setActiveExam(null);
        setUserAnswers({});
        // Show results immediately
        const examData = await apiService.getExam(activeExam.id || activeExam._id);
        setExamResults(examData);
        setShowResults(true);
        
        // Refresh exam list
        await loadExams();
        
        // Check for achievements (wrapped in try-catch to not break the flow)
        try {
          const response = await apiService.getUserExams(userId);
          const allExams = response.exams || response || [];
          const completedCount = allExams.filter(e => getActualStatus(e) === "completed").length;
          
          console.log(`✅ Total completed exams: ${completedCount}`);
          console.log(`📊 Current exam score: ${examData.score}`);
          
          // Check for high score achievement first (80% or higher)
          if (examData.score >= 80) {
            setAchievementData({
              title: "🌟 Well Done!",
              message: `Excellent performance! You scored ${examData.score}% on this exam. Keep up the great work!`,
              icon: "🎯"
            });
            setShowAchievementBadge(true);
          }
          // Otherwise check milestone achievements (only exact milestones)
          else if (completedCount === 1) {
            setAchievementData({
              title: "🎉 First Exam Completed!",
              message: "Congratulations! You've completed your first practice test. Keep going!",
              icon: "🏆"
            });
            setShowAchievementBadge(true);
          } else if (completedCount === 5) {
            setAchievementData({
              title: "🌟 5 Exams Milestone!",
              message: "Amazing! You've completed 5 practice tests. You're on fire!",
              icon: "⭐"
            });
            setShowAchievementBadge(true);
          } else if (completedCount === 10) {
            setAchievementData({
              title: "💎 10 Exams Champion!",
              message: "Incredible! You've completed 10 practice tests. You're a true champion!",
              icon: "💎"
            });
            setShowAchievementBadge(true);
          } else if (completedCount === 20) {
            setAchievementData({
              title: "🔥 20 Exams Completed!",
              message: "Unstoppable! You've completed 20 practice tests. Keep pushing!",
              icon: "🔥"
            });
            setShowAchievementBadge(true);
          } else if (completedCount === 30) {
            setAchievementData({
              title: "⚡ 30 Exams Master!",
              message: "Phenomenal! You've completed 30 practice tests. You're a true master!",
              icon: "⚡"
            });
            setShowAchievementBadge(true);
          } else if (completedCount === 50) {
            setAchievementData({
              title: "👑 50 Exams Legend!",
              message: "Legendary! You've completed 50 practice tests. You're unstoppable!",
              icon: "👑"
            });
            setShowAchievementBadge(true);
          } else if (completedCount === 100) {
            setAchievementData({
              title: "🌟 100 Exams Elite!",
              message: "Elite status achieved! You've completed 100 practice tests. You're in a class of your own!",
              icon: "🌟"
            });
            setShowAchievementBadge(true);
          }
        } catch (achievementError) {
          console.error("Achievement check error (non-critical):", achievementError);
        }
      }
    } catch (error) {
      console.error("Failed to submit exam:", error);
      alert("❌ Failed to submit exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseExam = () => {
    if (Object.keys(userAnswers).length > 0) {
      if (!window.confirm("Your progress has been saved. You can continue this exam later from 'In Progress' filter. Do you want to exit?")) {
        return;
      }
    }
    setActiveExam(null);
    setUserAnswers({});
    setCurrentQuestion(0);
    loadExams(); // Refresh to show updated status
  };

  const handleDeleteSelected = async () => {
    if (selectedExams.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedExams.length} test(s)? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete each selected exam
      for (const examId of selectedExams) {
        await apiService.deleteExam(examId);
      }
      
      alert(`✅ Successfully deleted ${selectedExams.length} test(s)!`);
      setSelectedExams([]);
      setSelectionMode(false);
      loadExams();
    } catch (error) {
      console.error("Failed to delete exams:", error);
      alert("❌ Failed to delete some tests. Please try again.");
    }
  };

  const toggleExamSelection = (examId) => {
    setSelectedExams(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const handleLongPressStart = (examId) => {
    const timer = setTimeout(() => {
      // Enter selection mode and select this exam
      if (!selectionMode) {
        setSelectionMode(true);
      }
      toggleExamSelection(examId);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const getAnswerText = (answerLetter, options) => {
    if (!answerLetter || !options || options.length === 0) {
      return answerLetter || "Not answered";
    }
    try {
      const answerIdx = answerLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (answerIdx >= 0 && answerIdx < options.length) {
        return options[answerIdx];
      }
    } catch (e) {
      console.error("Error getting answer text:", e);
    }
    return answerLetter;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-semibold`}>
        {badge.label}
      </span>
    );
  };

  // Filter and sort exams based on search query and sort option
  const filteredExams = exams.filter((exam) => {
    const topic = (exam.topic || exam.title || "").toLowerCase();
    const difficulty = (exam.difficulty || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    
    // Check search query
    const matchesSearch = topic.includes(query) || difficulty.includes(query);
    
    // Check status filter
    const actualStatus = getActualStatus(exam);
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "completed") {
        matchesStatus = actualStatus === "completed";
      } else if (statusFilter === "unattempted") {
        matchesStatus = actualStatus === "active";
      } else if (statusFilter === "in_progress") {
        matchesStatus = actualStatus === "in_progress";
      }
    }
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort based on selected option
    if (sortBy === "date") {
      return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
    } else if (sortBy === "score") {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return scoreB - scoreA;
    } else if (sortBy === "name") {
      const nameA = (a.topic || a.title || "").toLowerCase();
      const nameB = (b.topic || b.title || "").toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-red-900 via-red-800 to-red-900 shadow-xl z-50 transform transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          sidebarOpen ? "w-64" : "lg:w-16"
        }`}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-6">
            {sidebarOpen ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-xl font-bold text-white">Cognify AI</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-2 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto">
                <SparklesIcon className="w-6 h-6 text-red-600" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            <button
              onClick={() => onNavigate && onNavigate("dashboard")}
              className={`w-full flex items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Dashboard"
            >
              <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("chat")}
              className={`w-full flex items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Chat"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Chat</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("notes")}
              className={`w-full flex items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Notes"
            >
              <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Notes</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("documents")}
              className={`w-full flex items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Documents"
            >
              <BookOpenIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Documents</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("practicetest")}
              className={`w-full flex items-center px-4 py-3 bg-red-700 text-white rounded-xl font-medium ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Practice Tests"
            >
              <AcademicCapIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Practice Tests</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("performance")}
              className={`w-full flex items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Performance"
            >
              <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Performance</span>}
            </button>
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-red-700 pt-4">
            {/* Toggle Sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden lg:flex w-full items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"}
                />
              </svg>
              {sidebarOpen && <span>Close sidebar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarOpen ? "lg:ml-64" : "lg:ml-16"
      }`}>
        {/* Top Navigation Bar */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bars3Icon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  Practice Tests
                </h1>
              </div>

              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Create New Test Section */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 shadow-lg mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Ready to Test Your Knowledge?</h2>
                <p className="text-red-100">Create an AI-generated practice test tailored to your needs</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors shadow-lg flex items-center space-x-2"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Create New Test</span>
              </button>
            </div>
          </div>

          {/* Exams List */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <TrophyIcon className="w-7 h-7 text-red-600" />
                <h2 className="text-2xl font-bold text-gray-800">
                  Your Practice Tests ({filteredExams.length})
                </h2>
              </div>
            </div>

            {/* Search Bar */}
            {exams.length > 0 && (
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by topic or difficulty..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === "all"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      All Tests
                    </button>
                    <button
                      onClick={() => setStatusFilter("completed")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === "completed"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => setStatusFilter("unattempted")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === "unattempted"
                          ? "bg-yellow-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Unattempted
                    </button>
                    <button
                      onClick={() => setStatusFilter("in_progress")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === "in_progress"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      In Progress
                    </button>
                  </div>
                  
                  {/* Three-dot menu */}
                  <div className="relative" ref={optionsMenuRef}>
                    <button
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {showOptionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          {/* Sort By button */}
                          <button
                            onClick={() => setShowSortSubmenu(!showSortSubmenu)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <span>Sort By</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                showSortSubmenu ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          
                          {/* Sort submenu */}
                          {showSortSubmenu && (
                            <div className="bg-gray-50 border-l-2 border-red-500">
                              <button
                                onClick={() => {
                                  setSortBy("date");
                                  setShowOptionsMenu(false);
                                  setShowSortSubmenu(false);
                                }}
                                className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                  sortBy === "date" ? "text-red-600 font-medium" : "text-gray-700"
                                }`}
                              >
                                Date Created
                              </button>
                              <button
                                onClick={() => {
                                  setSortBy("score");
                                  setShowOptionsMenu(false);
                                  setShowSortSubmenu(false);
                                }}
                                className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                  sortBy === "score" ? "text-red-600 font-medium" : "text-gray-700"
                                }`}
                              >
                                Score (High to Low)
                              </button>
                              <button
                                onClick={() => {
                                  setSortBy("name");
                                  setShowOptionsMenu(false);
                                  setShowSortSubmenu(false);
                                }}
                                className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                  sortBy === "name" ? "text-red-600 font-medium" : "text-gray-700"
                                }`}
                              >
                                Name (A-Z)
                              </button>
                            </div>
                          )}
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {/* View History option */}
                          <button
                            onClick={() => {
                              onNavigate("history");
                              setShowOptionsMenu(false);
                              setShowSortSubmenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            View History
                          </button>
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {/* Select option */}
                          <button
                            onClick={() => {
                              setSelectionMode(!selectionMode);
                              setSelectedExams([]);
                              setShowOptionsMenu(false);
                              setShowSortSubmenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            {selectionMode ? "Cancel Selection" : "Select Tests"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selection mode actions */}
            {selectionMode && filteredExams.length > 0 && (
              <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedExams.length} test(s) selected
                  </span>
                  {selectedExams.length > 0 && (
                    <button
                      onClick={() => setSelectedExams([])}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedExams.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete Selected</span>
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading tests...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12">
                <AcademicCapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No practice tests yet</p>
                <p className="text-gray-500 text-sm mb-6">
                  Create your first practice test to get started
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Create Test
                </button>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No tests found</p>
                <p className="text-gray-500 text-sm mb-6">
                  Try adjusting your search query or filter
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam) => {
                  // Determine actual status using the helper function
                  const actualStatus = getActualStatus(exam);
                  const hasScore = exam.score !== undefined && exam.score !== null;
                  
                  return (
                  <div
                    key={exam.id || exam.exam_id}
                    className={`border rounded-xl p-6 hover:shadow-md transition-all ${
                      selectionMode ? "cursor-default" : "cursor-pointer"
                    } ${
                      selectedExams.includes(exam.id || exam.exam_id)
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200"
                    }`}
                    onMouseDown={() => handleLongPressStart(exam.id || exam.exam_id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(exam.id || exam.exam_id)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    <div className="flex items-start justify-between mb-4">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedExams.includes(exam.id || exam.exam_id)}
                          onChange={() => toggleExamSelection(exam.id || exam.exam_id)}
                          className="mr-3 mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">
                          {exam.topic || exam.title || "Practice Test"}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <ClockIcon className="w-4 h-4" />
                          <span>{formatDate(exam.created_at || exam.date)}</span>
                        </div>
                      </div>
                      {getStatusBadge(actualStatus)}
                    </div>

                    {hasScore && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Score</span>
                          <span className="font-semibold text-gray-800">{exam.score}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                            style={{ width: `${exam.score}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {!selectionMode && (
                      <button
                        onClick={() => handleContinueTest(exam)}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                        {actualStatus === "completed" ? "Review Answers" : "Continue Test"}
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Create Practice Test</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="Enter any topic (e.g., Physics, History, Biology...)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setSelectedDifficulty(diff.value)}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        selectedDifficulty === diff.value
                          ? `bg-${diff.color}-100 text-${diff.color}-700 border-2 border-${diff.color}-500`
                          : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Questions: {numQuestions}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="5"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>10</span>
                  <span>15</span>
                  <span>20</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExam}
                disabled={creating || !selectedSubject}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Taking Modal */}
      {activeExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{activeExam.topic}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Question {currentQuestion + 1} of {activeExam.questions?.length || 0}
                </p>
              </div>
              <button
                onClick={handleCloseExam}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / (activeExam.questions?.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question */}
            {activeExam.questions && activeExam.questions[currentQuestion] && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  {/* Question Text */}
                  <div className="mb-6">
                    {activeExam.questions[currentQuestion].question ? (
                      <h4 className="text-xl font-bold text-gray-900 leading-relaxed">
                        {activeExam.questions[currentQuestion].question}
                      </h4>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          ⚠️ This exam was created with an older version. The question text is missing. 
                          Please create a new test for the best experience.
                        </p>
                        <p className="text-xs text-yellow-600 mt-2">
                          Choose the correct option from the choices below.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Options */}
                  <div className="space-y-3">
                    {activeExam.questions[currentQuestion].options?.map((option, idx) => {
                      const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
                      const isSelected = userAnswers[currentQuestion] === optionLetter;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerSelect(currentQuestion, optionLetter)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                              isSelected ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
                            }`}>
                              {optionLetter}
                            </span>
                            <span className="flex-1 text-gray-800 pt-1">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="text-sm text-gray-600">
                    {Object.keys(userAnswers).length} of {activeExam.questions?.length || 0} answered
                  </div>

                  {currentQuestion < (activeExam.questions?.length || 0) - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(currentQuestion + 1)}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitExam}
                      disabled={submitting}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Test"}
                    </button>
                  )}
                </div>

                {/* Question Navigator */}
                <div className="border-t pt-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Question Navigator</p>
                  <div className="grid grid-cols-10 gap-2">
                    {activeExam.questions?.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestion(idx)}
                        className={`aspect-square rounded-lg font-semibold transition-all ${
                          idx === currentQuestion
                            ? "bg-red-600 text-white"
                            : userAnswers[idx]
                            ? "bg-green-100 text-green-700 border-2 border-green-500"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && examResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Exam Results: {examResults.topic}</h3>
                <p className="text-sm text-gray-500 mt-1">{examResults.difficulty}</p>
              </div>
              <button
                onClick={() => {
                  setShowResults(false);
                  setExamResults(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Score Summary */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Your Score</p>
                  <p className="text-4xl font-bold text-red-600">{examResults.score?.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Questions</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {examResults.results?.filter(r => r.is_correct).length || 0}/{examResults.results?.length || 0}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${examResults.score || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Questions and Answers */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-800">Detailed Review</h4>
              {examResults.results?.map((result, idx) => {
                // Get the question from the original exam data to access options
                const question = examResults.questions?.[idx];
                const options = result.options || question?.options || [];
                
                return (
                <div key={idx} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h5 className="text-base font-semibold text-gray-800 flex-1">
                      Question {idx + 1}
                    </h5>
                    {result.is_correct ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4">{result.question}</p>
                  
                  {/* Show all options for reference */}
                  {options.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {options.map((option, optIdx) => (
                        <div key={optIdx} className="text-sm text-gray-600">
                          <span className="font-semibold">{String.fromCharCode(65 + optIdx)}:</span> {option}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className={`p-3 rounded-lg ${
                      result.your_answer === result.correct_answer
                        ? "bg-green-50 border-2 border-green-500"
                        : "bg-red-50 border-2 border-red-500"
                    }`}>
                      <p className="text-sm font-semibold mb-1">
                        {result.is_correct ? "✓ Your Answer (Correct)" : "✗ Your Answer (Incorrect)"}
                      </p>
                      <p className="text-gray-800">
                        {result.your_answer ? (
                          <>
                            <span className="font-semibold">{result.your_answer}:</span>{" "}
                            {result.your_answer_text || getAnswerText(result.your_answer, options)}
                          </>
                        ) : (
                          "Not answered"
                        )}
                      </p>
                    </div>
                    
                    {!result.is_correct && (
                      <div className="p-3 rounded-lg bg-green-50 border-2 border-green-500">
                        <p className="text-sm font-semibold mb-1 text-green-700">✓ Correct Answer</p>
                        <p className="text-gray-800">
                          <span className="font-semibold">{result.correct_answer}:</span>{" "}
                          {result.correct_answer_text || getAnswerText(result.correct_answer, options)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {result.explanation && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-700 mb-2">💡 Explanation</p>
                      <p className="text-gray-700 text-sm">{result.explanation}</p>
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setShowResults(false);
                  setExamResults(null);
                }}
                className="px-8 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Badge Modal */}
      {showAchievementBadge && achievementData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform scale-100">
            {/* Achievement Icon */}
            <div className="text-8xl mb-4">
              {achievementData.icon}
            </div>
            
            {/* Achievement Title */}
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              {achievementData.title}
            </h2>
            
            {/* Achievement Message */}
            <p className="text-gray-600 text-lg mb-6">
              {achievementData.message}
            </p>
            
            {/* Confetti Effect */}
            <div className="mb-6 text-4xl">
              🎊 🎉 🎊
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => {
                setShowAchievementBadge(false);
                setAchievementData(null);
              }}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Awesome! Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PracticeTest;
