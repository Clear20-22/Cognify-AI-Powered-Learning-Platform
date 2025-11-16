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
} from "@heroicons/react/24/outline";

function Documents({ onNavigate }) {
  const { user, signOut } = useAuth();
  const userId = useUserId();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
      const result = await apiService.deleteDocument(docId);
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
      const result = await apiService.processDocument(docId, action);
      if (result.success) {
        alert(`✅ Document processed successfully!`);
        // Show results in a modal or navigate to notes/chat
        console.log("Processing result:", result.result);
      }
    } catch (error) {
      console.error("Failed to process document:", error);
      alert("❌ Failed to process document. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                My Documents
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate && onNavigate("dashboard")}
                className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate && onNavigate("chat")}
                className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                Chat
              </button>
              <button
                onClick={() => onNavigate && onNavigate("notes")}
                className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                Notes
              </button>
              <button
                onClick={() => onNavigate && onNavigate("history")}
                className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                History
              </button>

              <div className="flex items-center space-x-3 border-l border-gray-300 pl-4">
                <Avatar
                  src={null}
                  alt={user?.name || "User"}
                  size="w-9 h-9"
                  fallbackText={(user?.name ||
                    user?.email?.split("@")[0] ||
                    "U")[0].toUpperCase()}
                />
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleProcess(doc.id, "generate_notes")}
                        disabled={processing === doc.id}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        📝 Notes
                      </button>
                      <button
                        onClick={() => handleProcess(doc.id, "generate_quiz")}
                        disabled={processing === doc.id}
                        className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        📊 Quiz
                      </button>
                      <button
                        onClick={() => handleProcess(doc.id, "summarize")}
                        disabled={processing === doc.id}
                        className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        ✨ Summary
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
  );
}

export default Documents;
