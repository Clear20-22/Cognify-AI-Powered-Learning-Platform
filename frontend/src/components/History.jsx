import { useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import Avatar from "./Avatar";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [historyData] = useState({
    questions: [
      {
        id: 1,
        title:
          "What is machine learning and how does it differ from traditional programming?",
        date: "2024-01-15",
      },
      {
        id: 2,
        title: "Explain the concept of neural networks in deep learning",
        date: "2024-01-14",
      },
      {
        id: 3,
        title:
          "What are the key differences between supervised and unsupervised learning?",
        date: "2024-01-13",
      },
      {
        id: 4,
        title: "How do you implement a binary search algorithm in Python?",
        date: "2024-01-12",
      },
      {
        id: 5,
        title: "What is the time complexity of quicksort algorithm?",
        date: "2024-01-11",
      },
    ],
    exams: [
      {
        id: 1,
        title: "Python Fundamentals Quiz",
        score: "85%",
        date: "2024-01-15",
      },
      {
        id: 2,
        title: "Data Structures and Algorithms Test",
        score: "92%",
        date: "2024-01-13",
      },
      {
        id: 3,
        title: "Machine Learning Basics",
        score: "78%",
        date: "2024-01-10",
      },
      {
        id: 4,
        title: "JavaScript ES6 Features",
        score: "88%",
        date: "2024-01-08",
      },
    ],
  });

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              Cognify AI
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => onNavigate && onNavigate("dashboard")}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate("chat")}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span>AI Chat</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate("notes")}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <BookOpenIcon className="w-5 h-5" />
              <span>Notes</span>
            </button>

            <button className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 bg-red-50 rounded-xl">
              <ClockIcon className="w-5 h-5" />
              <span>History</span>
            </button>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar
                src={null}
                alt={user?.name || "User"}
                size="w-10 h-10"
                fallbackText={(user?.name ||
                  user?.email ||
                  "U")[0].toUpperCase()}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Activity History
              </h2>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Chat History */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Recent Questions
                </h3>
              </div>
              <div className="space-y-3">
                {historyData.questions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-gray-900 flex-1">{question.title}</p>
                      <span className="text-xs text-gray-500 ml-4">
                        {question.date}
                      </span>
                    </div>
                  </div>
                ))}
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
                {historyData.exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {exam.title}
                    </h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-600 font-medium">
                        {exam.score}
                      </span>
                      <span className="text-gray-500">{exam.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default History;
