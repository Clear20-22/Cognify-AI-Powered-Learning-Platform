import React, { useState, useEffect } from "react";
import { useAuth, useUserId } from "../hooks/useAuth";
import { apiService } from "../services/apiService";
import Avatar from "./Avatar";
import Sidebar from "./Sidebar";
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
  const [editTopic, setEditTopic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
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
    setEditTopic(note.topic || "");
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
    setEditTopic("");
  };

  const saveEdit = async (noteId) => {
    try {
      // An empty topic clears it on the server
      const result = await apiService.updateNote(noteId, {
        content: editContent,
        topic: editTopic,
      });
      // API returns the updated note directly
      if (result && result.id) {
        // Update local state
        setNotes(notes.map((n) => (n.id === noteId ? result : n)));
        setEditingNoteId(null);
        setEditContent("");
        setEditTopic("");
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

  const isDemo = apiService.isDemoSession();

  // Distinct topics for the filter, sorted alphabetically
  const topics = [
    ...new Map(
      notes
        .filter((note) => note.topic)
        .map((note) => [note.topic.toLowerCase(), note.topic])
    ).values(),
  ].sort((a, b) => a.localeCompare(b));

  // Keyword search over title, content, topic, and tags (FR-NOTE-03),
  // plus the topic filter (FR-NOTE-02)
  const query = searchQuery.trim().toLowerCase();
  const filteredNotes = notes.filter((note) => {
    if (
      topicFilter &&
      (note.topic || "").toLowerCase() !== topicFilter.toLowerCase()
    ) {
      return false;
    }
    if (!query) return true;
    return [note.title, note.content, note.topic, ...(note.tags || [])].some(
      (text) => (text || "").toLowerCase().includes(query)
    );
  });
  const isFiltering = Boolean(query || topicFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={onNavigate}
        currentPage="notes"
        theme="white"
      />

      {/* Main Content with Sidebar Offset */}
      <div
        className={`transition-all duration-300 min-h-screen ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">My Notes</h1>
          <div className="w-10"></div>
        </div>

        {/* Notes Content */}
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

          {/* Search Bar and Topic Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            {topics.length > 0 && (
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                aria-label="Filter by topic"
                className="sm:order-2 sm:w-56 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All topics</option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            )}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by title, content, topic, or tag..."
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
                {isDemo
                  ? "Notes need an account"
                  : isFiltering
                  ? "No notes found"
                  : "No saved notes yet"}
              </h3>
              <p className="text-gray-600 mb-6">
                {isDemo
                  ? "Notes are saved privately to your account. Sign up or sign in to save and view them."
                  : isFiltering
                  ? "Try a different search term or topic"
                  : "Start saving important AI responses by clicking the bookmark icon"}
              </p>
              {!isFiltering && !isDemo && (
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
                      <input
                        type="text"
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        placeholder="Topic (e.g. Machine Learning)"
                        maxLength={100}
                        aria-label="Topic"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm mb-3"
                      />
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
                        {(note.topic || note.tags?.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {note.topic && (
                              <button
                                type="button"
                                onClick={() => setTopicFilter(note.topic)}
                                title="Show notes with this topic"
                                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                {note.topic}
                              </button>
                            )}
                            {note.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedNote.title || "Saved Note"}
                  </h3>
                  {selectedNote.topic && (
                    <p className="text-sm text-red-700 font-medium">
                      {selectedNote.topic}
                    </p>
                  )}
                </div>
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
