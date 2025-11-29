import React, { useState, useEffect } from "react";
import { useAuth, useUserId } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService.js";
import Avatar from "./Avatar";
import {
  SparklesIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  BookOpenIcon,
  AcademicCapIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

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

function Documents({ onNavigate }) {
  const { user, signOut } = useAuth();
  const userId = useUserId();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [viewDocument, setViewDocument] = useState(null);
  const [viewPdfModal, setViewPdfModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const result = await apiService.getUserDocuments(userId);
        if (result.success) {
          setDocuments(result.documents);
        }
      } catch (error) {
        console.error("Failed to load documents:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [userId]);

  // Debug: Log quiz state when it changes
  useEffect(() => {
    if (showResultModal && resultData?.action === "generate_quiz") {
      console.log("Quiz Modal State:", {
        quizSubmitted,
        quizAnswersCount: Object.keys(quizAnswers).length,
        hasScore: !!quizScore,
        questionsCount: resultData?.content?.questions?.length
      });
    }
  }, [showResultModal, quizSubmitted, quizAnswers, quizScore, resultData]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Please upload only PDF or PPTX files");
        return;
      }

      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert("File size must be less than 50MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const result = await apiService.uploadDocument(userId, selectedFile);
      if (result.success) {
        alert(`✅ ${selectedFile.name} uploaded successfully!`);
        setSelectedFile(null);
        // Reload documents
        const docs = await apiService.getUserDocuments(userId);
        if (docs.success) {
          setDocuments(docs.documents);
        }
      }
    } catch (error) {
      console.error("Failed to upload document:", error);
      alert("❌ Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      const result = await apiService.deleteDocument(docId, userId);
      if (result.success) {
        setDocuments(documents.filter((d) => d.id !== docId));
        setDeleteConfirm(null);
        alert("✅ Document deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("❌ Failed to delete document. Please try again.");
    }
  };

  const handleProcess = async (docId, action) => {
    try {
      setProcessing(docId);
      setProcessingAction(action);
      setProcessingAction(action);
      
      // For quiz action, first check if there's a previous attempt
      if (action === "generate_quiz") {
        const attemptResult = await apiService.getLatestQuizAttempt(docId, userId);
        console.log("Quiz attempt result:", attemptResult);
        
        if (attemptResult.success && attemptResult.attempt) {
          console.log("Loading previous quiz attempt:", {
            attemptId: attemptResult.attempt.id,
            questionsCount: attemptResult.attempt.questions?.length,
            userAnswersCount: Object.keys(attemptResult.attempt.user_answers || {}).length,
            score: attemptResult.attempt.score
          });
          
          // Show previous attempt
          // Load previous answers and show as submitted
          const userAnswersObj = {};
          Object.keys(attemptResult.attempt.user_answers).forEach(key => {
            userAnswersObj[parseInt(key)] = attemptResult.attempt.user_answers[key];
          });
          
          console.log("Converted user answers:", userAnswersObj);
          
          // Set all state before showing modal
          setQuizAnswers(userAnswersObj);
          setQuizSubmitted(true);
          setQuizScore(attemptResult.attempt.score);
          
          setResultData({
            title: "📊 Quiz - Previous Attempt",
            action: action,
            content: {
              questions: attemptResult.attempt.questions
            },
            documentId: docId
          });
          setShowResultModal(true);
          setProcessing(null);
          return;
        }
      }
      
      const result = await apiService.processDocument(docId, userId, action);
      if (result.success) {
        // Show results in modal
        const actionTitles = {
          generate_notes: "📝 Study Notes",
          summarize: "✨ Summary",
          generate_quiz: "📊 Quiz",
        };
        setResultData({
          title: actionTitles[action] || "Results",
          action: action,
          content: result.result,
          documentId: docId
        });
        setShowResultModal(true);
        // Reset quiz state when opening a new quiz
        if (action === "generate_quiz") {
          setQuizAnswers({});
          setQuizSubmitted(false);
          setQuizScore(null);
        }
      }
    } catch (error) {
      console.error("Failed to process document:", error);
      alert("❌ Failed to process document. Please try again.");
    } finally {
      setProcessing(null);
      setProcessingAction(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  const handleQuizAnswerSelect = (questionIndex, answer) => {
    if (quizSubmitted) return; // Don't allow changes after submission
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleQuizSubmit = async () => {
    if (!resultData?.content?.questions || !resultData?.documentId) return;
    
    const questions = resultData.content.questions;
    let correct = 0;
    
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) {
        correct++;
      }
    });
    
    const score = {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
    
    setQuizScore(score);
    setQuizSubmitted(true);
    
    // Save quiz attempt to backend
    try {
      await apiService.submitQuiz(resultData.documentId, userId, questions, quizAnswers);
    } catch (error) {
      console.error("Failed to save quiz attempt:", error);
      // Don't show error to user, just log it
    }
  };

  const handleQuizRetry = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    // Update title to show it's a new attempt
    if (resultData) {
      setResultData({
        ...resultData,
        title: "📊 Quiz - New Attempt"
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case "processing":
        return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Ready";
      case "processing":
        return "Processing...";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
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
              className={`w-full flex items-center px-4 py-3 bg-red-700 text-white rounded-xl font-medium ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Documents"
            >
              <BookOpenIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Documents</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("practicetest")}
              className={`w-full flex items-center px-4 py-3 text-red-100 hover:bg-red-700 rounded-xl font-medium transition-colors ${
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
                  My Documents
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
        {/* Upload Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <DocumentArrowUpIcon className="w-7 h-7 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              Upload Document
            </h2>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.pptx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center space-y-3"
              >
                <DocumentArrowUpIcon className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="text-lg font-semibold text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF or PPTX files up to 50MB
                  </p>
                </div>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <ClipboardDocumentListIcon className="w-7 h-7 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              Your Documents ({documents.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No documents yet</p>
              <p className="text-gray-500 text-sm">
                Upload your first PDF or PPTX to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <DocumentTextIcon className="w-8 h-8 text-red-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {doc.filename}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatFileSize(doc.file_size)}
                          </span>
                          {doc.page_count && (
                            <span className="text-sm text-gray-500">
                              • {doc.page_count} pages
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            • {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(doc.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    {getStatusIcon(doc.processing_status)}
                    <span className="text-sm font-medium text-gray-700">
                      {getStatusText(doc.processing_status)}
                    </span>
                  </div>

                  {doc.processing_status === "completed" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() =>
                            handleProcess(doc.id, "generate_notes")
                          }
                          disabled={processing === doc.id}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            processing === doc.id && processingAction === "generate_notes"
                              ? "bg-blue-200 text-blue-800 opacity-75"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                          }`}
                        >
                          📝 Notes
                        </button>
                        <button
                          onClick={() => handleProcess(doc.id, "generate_quiz")}
                          disabled={processing === doc.id}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            processing === doc.id && processingAction === "generate_quiz"
                              ? "bg-green-200 text-green-800 opacity-75"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          📊 Quiz
                        </button>
                        <button
                          onClick={() => handleProcess(doc.id, "summarize")}
                          disabled={processing === doc.id}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            processing === doc.id && processingAction === "summarize"
                              ? "bg-purple-200 text-purple-800 opacity-75"
                              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                          }`}
                        >
                          ✨ Summary
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => setViewPdfModal(doc)}
                          className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center space-x-2"
                        >
                          <DocumentArrowUpIcon className="w-4 h-4" />
                          <span>View PDF</span>
                        </button>
                        <button
                          onClick={() => setViewDocument(doc)}
                          className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>View Text</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && resultData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-5xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {resultData.action === "generate_notes" && (
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                {resultData.action === "summarize" && (
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-purple-600" />
                  </div>
                )}
                {resultData.action === "generate_quiz" && (
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-6 h-6 text-green-600" />
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-800">
                  {resultData.title}
                </h3>
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="prose max-w-none">
              {resultData.action === "generate_notes" &&
                resultData.content.notes &&
                (() => {
                  const sections = parseContent(resultData.content.notes);
                  return (
                    <div className="space-y-6">
                      {sections.map((section, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl p-6 border ${
                            section.level === 1
                              ? "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200"
                              : section.level === 2
                              ? "bg-blue-50 border-blue-100"
                              : "bg-blue-50/50 border-blue-100"
                          }`}
                        >
                          {section.title && (
                            <h4
                              className={`font-bold text-blue-900 mb-4 flex items-center ${
                                section.level === 1
                                  ? "text-2xl"
                                  : section.level === 2
                                  ? "text-xl"
                                  : "text-lg"
                              }`}
                            >
                              <span
                                className={`bg-blue-600 rounded-full mr-3 ${
                                  section.level === 1
                                    ? "w-1.5 h-8"
                                    : section.level === 2
                                    ? "w-1 h-6"
                                    : "w-0.5 h-5"
                                }`}
                              ></span>
                              {section.title}
                            </h4>
                          )}
                          <div className="space-y-3">
                            {section.content.map((item, i) => {
                              if (item.type === "bullet") {
                                return (
                                  <div
                                    key={i}
                                    className="flex items-start space-x-3"
                                  >
                                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0"></span>
                                    <p className="text-gray-800 leading-relaxed">
                                      {renderFormattedText(item.text)}
                                    </p>
                                  </div>
                                );
                              }
                              if (
                                item.type === "bold" ||
                                item.type === "text"
                              ) {
                                return (
                                  <p
                                    key={i}
                                    className="text-gray-800 leading-relaxed"
                                  >
                                    {renderFormattedText(item.text)}
                                  </p>
                                );
                              }
                              if (item.type === "space") {
                                return <div key={i} className="h-2"></div>;
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

              {resultData.action === "summarize" &&
                resultData.content.summary &&
                (() => {
                  const sections = parseContent(resultData.content.summary);
                  return (
                    <div className="space-y-6">
                      {sections.map((section, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl p-6 border ${
                            section.level === 1
                              ? "bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200"
                              : section.level === 2
                              ? "bg-purple-50 border-purple-100"
                              : "bg-purple-50/50 border-purple-100"
                          }`}
                        >
                          {section.title && (
                            <h4
                              className={`font-bold text-purple-900 mb-4 flex items-center ${
                                section.level === 1
                                  ? "text-2xl"
                                  : section.level === 2
                                  ? "text-xl"
                                  : "text-lg"
                              }`}
                            >
                              <span
                                className={`bg-purple-600 rounded-full mr-3 ${
                                  section.level === 1
                                    ? "w-1.5 h-8"
                                    : section.level === 2
                                    ? "w-1 h-6"
                                    : "w-0.5 h-5"
                                }`}
                              ></span>
                              {section.title}
                            </h4>
                          )}
                          <div className="space-y-3">
                            {section.content.map((item, i) => {
                              if (item.type === "bullet") {
                                return (
                                  <div
                                    key={i}
                                    className="flex items-start space-x-3"
                                  >
                                    <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></span>
                                    <p className="text-gray-800 leading-relaxed">
                                      {renderFormattedText(item.text)}
                                    </p>
                                  </div>
                                );
                              }
                              if (
                                item.type === "bold" ||
                                item.type === "text"
                              ) {
                                return (
                                  <p
                                    key={i}
                                    className="text-gray-800 leading-relaxed"
                                  >
                                    {renderFormattedText(item.text)}
                                  </p>
                                );
                              }
                              if (item.type === "space") {
                                return <div key={i} className="h-2"></div>;
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

              {resultData.action === "generate_quiz" &&
                resultData.content.questions &&
                resultData.content.questions.length > 0 && (
                <div className="space-y-6">
                  {/* Quiz Score Card - Show after submission */}
                  {quizSubmitted && quizScore && (
                    <div className={`rounded-xl p-6 border-2 text-center ${
                      quizScore.percentage >= 80 
                        ? "bg-gradient-to-br from-green-100 to-green-50 border-green-500"
                        : quizScore.percentage >= 60
                        ? "bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-500"
                        : "bg-gradient-to-br from-red-100 to-red-50 border-red-500"
                    }`}>
                      <div className="text-6xl mb-4">
                        {quizScore.percentage >= 80 ? "🎉" : quizScore.percentage >= 60 ? "👍" : "📚"}
                      </div>
                      <h3 className="text-3xl font-bold mb-2">
                        {quizScore.correct} / {quizScore.total}
                      </h3>
                      <p className="text-xl font-semibold mb-4">
                        Score: {quizScore.percentage}%
                      </p>
                      <p className="text-gray-700 mb-4">
                        {quizScore.percentage >= 80 
                          ? "Excellent work! You've mastered this material!"
                          : quizScore.percentage >= 60
                          ? "Good job! Review the explanations below to improve."
                          : "Keep studying! Review the material and try again."}
                      </p>
                      <button
                        onClick={handleQuizRetry}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                      >
                        🔄 Retry Quiz
                      </button>
                    </div>
                  )}

                  {/* Quiz Questions */}
                  {resultData.content.questions.map((q, idx) => {
                    const userAnswer = quizAnswers[idx];
                    const isAnswered = userAnswer !== undefined;
                    
                    return (
                      <div
                        key={idx}
                        className="rounded-xl p-6 border bg-gradient-to-br from-green-100 to-green-50 border-green-200"
                      >
                        <h4 className="font-bold text-green-900 mb-4 flex items-center text-lg">
                          <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">
                            {idx + 1}
                          </span>
                          {q.question}
                        </h4>
                        <div className="space-y-2 mb-4">
                          {q.options?.map((option, optIdx) => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const isCorrect = q.correct === letter;
                            const isSelected = userAnswer === letter;
                            const showResult = quizSubmitted;
                            
                            let bgColor = "bg-white border border-green-200";
                            if (showResult) {
                              if (isCorrect) {
                                bgColor = "bg-green-200 border-2 border-green-600";
                              } else if (isSelected && !isCorrect) {
                                bgColor = "bg-red-200 border-2 border-red-600";
                              }
                            } else if (isSelected) {
                              bgColor = "bg-green-100 border-2 border-green-500";
                            }
                            
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleQuizAnswerSelect(idx, letter)}
                                disabled={quizSubmitted}
                                className={`w-full text-left p-3 rounded-lg transition-all ${bgColor} ${
                                  !quizSubmitted ? "hover:bg-green-50 hover:border-green-400 cursor-pointer" : "cursor-default"
                                }`}
                              >
                                <span className="font-semibold text-green-900">
                                  {letter})
                                </span>{" "}
                                <span className="text-gray-800">{option}</span>
                                {showResult && isCorrect && (
                                  <span className="ml-2 text-green-700 font-semibold">
                                    ✓ Correct
                                  </span>
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <span className="ml-2 text-red-700 font-semibold">
                                    ✗ Wrong
                                  </span>
                                )}
                                {!showResult && isSelected && (
                                  <span className="ml-2 text-green-700 font-semibold">
                                    ✓ Selected
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && q.explanation && (
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <p className="text-sm font-semibold text-green-900 mb-1">
                              💡 Explanation:
                            </p>
                            <p className="text-sm text-gray-700">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {resultData.action === "generate_quiz" &&
                (!resultData.content.questions ||
                  resultData.content.questions.length === 0) && (
                <div className="bg-green-50 rounded-xl p-6 border border-green-100 text-center">
                  <ChartBarIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-800 text-lg">
                    No quiz questions were generated. Please try again.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
              {resultData.action === "generate_quiz" && !quizSubmitted ? (
                <>
                  <button
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length !== resultData.content.questions?.length}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>
                      Submit Quiz ({Object.keys(quizAnswers).length}/{resultData.content.questions?.length || 0})
                    </span>
                  </button>
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {(resultData.action === "generate_notes" || resultData.action === "summarize") && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          resultData.content.notes || resultData.content.summary || ""
                        );
                        alert("✅ Copied to clipboard!");
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                      <span>Copy to Clipboard</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {viewDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {viewDocument.filename}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatFileSize(viewDocument.file_size)} •{" "}
                  {viewDocument.page_count} pages
                </p>
              </div>
              <button
                onClick={() => setViewDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              {viewDocument.extracted_text ? (
                <div className="whitespace-pre-wrap text-gray-800 font-mono text-sm leading-relaxed">
                  {viewDocument.extracted_text}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Text extraction in progress...
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  if (viewDocument.extracted_text) {
                    navigator.clipboard.writeText(viewDocument.extracted_text);
                    alert("✅ Text copied to clipboard!");
                  }
                }}
                disabled={!viewDocument.extracted_text}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                📋 Copy Text
              </button>
              <button
                onClick={() => setViewDocument(null)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewPdfModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full h-full max-w-7xl max-h-[95vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {viewPdfModal.filename}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatFileSize(viewPdfModal.file_size)} •{" "}
                  {viewPdfModal.page_count} pages
                </p>
              </div>
              <button
                onClick={() => setViewPdfModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {(() => {
                console.log('🔍 PDF Modal - userId:', userId, 'viewPdfModal.id:', viewPdfModal.id);
                const pdfUrl = apiService.getDocumentFileUrl(viewPdfModal.id, userId);
                console.log('📎 PDF URL:', pdfUrl);
                return null;
              })()}
              {!userId ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading user information...</p>
                </div>
              ) : viewPdfModal.file_type === "pdf" ? (
                <iframe
                  src={apiService.getDocumentFileUrl(viewPdfModal.id, userId)}
                  className="w-full h-full"
                  title={viewPdfModal.filename}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <DocumentTextIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      PPTX files cannot be previewed directly.
                    </p>
                    <a
                      href={apiService.getDocumentFileUrl(viewPdfModal.id, userId)}
                      download={viewPdfModal.filename}
                      className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                      Download File
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Delete Document?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot
              be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Documents;
