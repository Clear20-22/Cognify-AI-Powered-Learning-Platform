import React, { useState, useEffect } from "react";
import { useAuth, useUserId } from "../hooks/useAuth";
import { apiService } from "../services/apiService";
import Avatar from "./Avatar";
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  XMarkIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

function Notes({ onNavigate }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const userId = useUserId();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const loadNotes = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const result = await apiService.getUserNotes(userId);
        // API returns { user_id, total, notes: [...] }
        if (result && result.notes) {
          setNotes(result.notes);
        }
      } catch (error) {
        console.error("Failed to load notes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [userId]);

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const saveEdit = async (noteId) => {
    try {
      const result = await apiService.updateNote(noteId, {
        content: editContent,
      });
      // API returns the updated note directly
      if (result && result.id) {
        // Update local state
        setNotes(notes.map((n) => (n.id === noteId ? result : n)));
        setEditingNoteId(null);
        setEditContent("");
        alert("✅ Note updated successfully!");
      }
    } catch (error) {
      console.error("Failed to update note:", error);
      alert("❌ Failed to update note. Please try again.");
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await apiService.deleteNote(noteId);
      // Delete returns 204 No Content, so if no error is thrown, it succeeded
      // Remove from local state
      setNotes(notes.filter((n) => n.id !== noteId));
      setDeleteConfirm(null);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      alert("✅ Note deleted successfully!");
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("❌ Failed to delete note. Please try again.");
    }
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

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const filteredNotes = notes.filter((note) =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              className={`w-full flex items-center px-4 py-3 bg-red-700 text-white rounded-xl font-medium ${
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
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bars3Icon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  My Notes
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
        </header>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            My Saved Notes
          </h2>
          <p className="text-gray-600">
            Important AI responses you've saved for later review
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
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
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your notes...</p>
            </div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-20 h-20 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? "No notes found" : "No saved notes yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Start saving important AI responses by clicking the bookmark icon"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onNavigate && onNavigate("chat")}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl"
              >
                Go to AI Chat
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {editingNoteId === note.id ? (
                  // Edit Mode
                  <div className="p-6">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none mb-4"
                      rows={8}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(note.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="p-6">
                      <p className="text-sm text-gray-800 leading-relaxed line-clamp-6 mb-4">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(note.created_at)}</span>
                        {note.chat_id && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                              />
                            </svg>
                            From chat
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => setSelectedNote(note)}
                        className="flex-1 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                      >
                        View Full
                      </button>
                      <button
                        onClick={() => startEdit(note)}
                        className="px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Edit"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(note.id)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Note Modal */}
      {selectedNote && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Saved Note
              </h3>
              <button
                onClick={() => setSelectedNote(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
            <div className="p-6 overflow-y-auto max-h-96">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selectedNote.content}
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Saved {formatDate(selectedNote.created_at)}</span>
                {selectedNote.chat_id && (
                  <span className="flex items-center gap-1">
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
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                    Linked to chat
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Note?
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteNote(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
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

export default Notes;
