import React, { useState, useEffect } from "react";
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
  const [numQuestions, setNumQuestions] = useState(5);
  const [creating, setCreating] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState(null);

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

  useEffect(() => {
    loadExams();
  }, [userId]);

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
        num_questions: numQuestions
      });
      
      if (result) {
        alert("✅ Practice test created successfully!");
        setShowCreateModal(false);
        setSelectedSubject("");
        setSelectedDifficulty("intermediate");
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
        setUserAnswers({});
      }
    } catch (error) {
      console.error("Failed to load exam:", error);
      alert("❌ Failed to load exam. Please try again.");
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
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
      const result = await apiService.submitExam({
        exam_id: activeExam.id || activeExam._id,
        answers: userAnswers
      });
      
      if (result.success) {
        setActiveExam(null);
        setUserAnswers({});
        // Show results immediately
        const examData = await apiService.getExam(activeExam.id || activeExam._id);
        setExamResults(examData);
        setShowResults(true);
        loadExams(); // Refresh the exam list
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
      if (!window.confirm("Are you sure you want to exit? Your progress will not be saved.")) {
        return;
      }
    }
    setActiveExam(null);
    setUserAnswers({});
    setCurrentQuestion(0);
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
          <div className="border-t border-red-700 pt-4 space-y-2">
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

            {/* User Profile */}
            {user && (
              <button className={`w-full flex items-center py-3 hover:bg-red-700 rounded-xl transition-colors ${
                sidebarOpen ? "px-4 space-x-3" : "justify-center"
              }`}>
                <div className="flex-shrink-0">
                  <Avatar
                    src={null}
                    alt={`${user.name || user.email?.split("@")[0] || "User"}'s avatar`}
                    size="w-7 h-7"
                    fallbackText={(user.name || user.email?.split("@")[0] || "U")[0].toUpperCase()}
                  />
                </div>
                {sidebarOpen && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || user.email?.split("@")[0]}
                    </p>
                  </div>
                )}
              </button>
            )}
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
                  Your Practice Tests ({exams.length})
                </h2>
              </div>
            </div>

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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => {
                  // Determine actual status - only completed if score exists (not undefined/null) or explicitly submitted
                  const hasScore = exam.score !== undefined && exam.score !== null;
                  const actualStatus = exam.submitted || hasScore ? "completed" : (exam.status || "pending");
                  
                  return (
                  <div
                    key={exam.id || exam.exam_id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
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

                    <button
                      onClick={() => handleContinueTest(exam)}
                      className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      {actualStatus === "completed" ? "Review Answers" : "Continue Test"}
                    </button>
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
    </div>
  );
}

export default PracticeTest;
