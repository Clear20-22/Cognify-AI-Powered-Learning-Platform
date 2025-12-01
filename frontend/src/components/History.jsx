import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUserId } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService";
import Avatar from "./Avatar";
import Sidebar from "./Sidebar";
import {
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  ClockIcon,
  HomeIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

function History({ onNavigate }) {
  const { user, signOut } = useAuth();
  const userId = useUserId();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [exams, setExams] = useState([]);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllExams, setShowAllExams] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (!userId) return;

      try {
        setLoading(true);

        // Fetch user's chats
        const chatsData = await apiService.getUserChats(userId);
        setChats(chatsData.chats || []);

        // Fetch user's exams and filter for completed ones only
        const examsData = await apiService.getUserExams(userId);
        const allExams = examsData.exams || [];
        // Only show exams that have been completed (have a score)
        const completedExams = allExams.filter(
          (exam) => exam.score !== undefined && exam.score !== null
        );
        setExams(completedExams);
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [userId]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleChatClick = (chat) => {
    const chatId = chat.id || chat.chat_id;
    if (chatId) {
      navigate(`/chat/${chatId}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={onNavigate}
        currentPage="history"
        theme="white"
      />

      {/* Main Content */}
      <main
        className={`transition-all duration-300 min-h-screen ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <>
                {/* Chat History */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Recent Chats
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {chats.length === 0 ? (
                      <div className="p-8 bg-white border border-gray-200 rounded-xl text-center">
                        <p className="text-gray-500">
                          No chat history yet. Start a conversation to see it
                          here!
                        </p>
                      </div>
                    ) : (
                      <>
                        {(showAllChats ? chats : chats.slice(0, 3)).map(
                          (chat) => (
                            <div
                              key={chat.id || chat.chat_id}
                              className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                              onClick={() => handleChatClick(chat)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-gray-900 font-medium">
                                    {chat.topic || "Conversation"}
                                  </p>
                                  {chat.messages &&
                                    chat.messages.length > 0 && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                        {chat.messages[0].text ||
                                          chat.messages[0].content}
                                      </p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 ml-4">
                                  {formatDate(chat.created_at)}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                        {chats.length > 3 && (
                          <button
                            onClick={() => setShowAllChats(!showAllChats)}
                            className="w-full mt-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            {showAllChats
                              ? "Show Less"
                              : `View All Chats (${chats.length})`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Exam History */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <AcademicCapIcon className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Completed Exams
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.length === 0 ? (
                      <div className="col-span-2 p-8 bg-white border border-gray-200 rounded-xl text-center">
                        <p className="text-gray-500">
                          No exam history yet. Take an exam to see results here!
                        </p>
                      </div>
                    ) : (
                      <>
                        {(showAllExams ? exams : exams.slice(0, 3)).map(
                          (exam) => (
                            <div
                              key={exam.id || exam.exam_id}
                              onClick={() =>
                                navigate(
                                  `/practicetest?examId=${
                                    exam.id || exam.exam_id
                                  }`
                                )
                              }
                              className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {exam.title || exam.topic || "Exam"}
                                </h4>
                                {exam.score !== undefined && (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    {exam.score}%
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {formatDate(exam.created_at || exam.date)}
                              </p>
                            </div>
                          )
                        )}
                        {exams.length > 3 && (
                          <button
                            onClick={() => setShowAllExams(!showAllExams)}
                            className="col-span-1 md:col-span-2 mt-2 px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                          >
                            {showAllExams
                              ? "Show Less"
                              : `View All Exams (${exams.length})`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default History;
