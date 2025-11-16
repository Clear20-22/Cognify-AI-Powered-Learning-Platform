import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import Avatar from "./Avatar";
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ClockIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

function Dashboard({ onNavigate }) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalChats: 0,
    totalNotes: 0,
    totalExams: 0,
    studyStreak: 0,
    hoursStudied: 0,
    averageScore: 0,
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: "chat",
      title: "Machine Learning Basics",
      time: "2 hours ago",
      icon: ChatBubbleLeftRightIcon,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: 2,
      type: "exam",
      title: "Data Structures Quiz",
      time: "5 hours ago",
      score: 85,
      icon: AcademicCapIcon,
      color: "from-green-500 to-green-600",
    },
    {
      id: 3,
      type: "note",
      title: "Python Functions",
      time: "1 day ago",
      icon: DocumentTextIcon,
      color: "from-purple-500 to-purple-600",
    },
  ]);

  useEffect(() => {
    // Load stats when component mounts
    const loadStats = async () => {
      // TODO: Replace with actual API calls
      setStats({
        totalChats: 12,
        totalNotes: 25,
        totalExams: 8,
        studyStreak: 7,
        hoursStudied: 24.5,
        averageScore: 87,
      });
    };

    if (user) {
      loadStats();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-green-600 text-sm">
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              <span>{trend}% from last week</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({
    icon: Icon,
    title,
    description,
    color,
    onClick,
  }) => (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 text-left w-full group"
    >
      <div
        className={`w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <div className="flex items-center text-red-600 font-semibold text-sm">
        <span>Get Started</span>
        <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );

  const ActivityItem = ({ activity }) => {
    const Icon = activity.icon;
    return (
      <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
        <div
          className={`w-10 h-10 bg-gradient-to-br ${activity.color} rounded-lg flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {activity.title}
          </p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
        {activity.score && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              {activity.score}%
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left - Logo & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Cognify AI
                </h1>
              </div>
            </div>

            {/* Right - User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={null}
                  alt={user?.name || "User"}
                  size="w-10 h-10"
                  fallbackText={(user?.name ||
                    user?.email?.split("@")[0] ||
                    "U")[0].toUpperCase()}
                />
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.name || user?.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-gray-500">Student</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-700 hover:text-red-600 font-medium transition-colors border border-gray-300 hover:border-red-600 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">Cognify</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => onNavigate && onNavigate("dashboard")}
              className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("chat")}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("notes")}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <DocumentTextIcon className="w-5 h-5" />
              <span>Notes</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("history")}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <ClockIcon className="w-5 h-5" />
              <span>History</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Welcome back,{" "}
              {user?.name?.split(" ")[0] ||
                user?.email?.split("@")[0] ||
                "Student"}
              ! 👋
            </h1>
            <p className="text-gray-600 text-lg">
              Here's what's happening with your learning today
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FireIcon}
              label="Study Streak"
              value={`${stats.studyStreak} days`}
              color="from-orange-500 to-red-500"
              trend={12}
            />
            <StatCard
              icon={ClockIcon}
              label="Hours Studied"
              value={stats.hoursStudied}
              color="from-blue-500 to-blue-600"
              trend={8}
            />
            <StatCard
              icon={TrophyIcon}
              label="Average Score"
              value={`${stats.averageScore}%`}
              color="from-yellow-500 to-yellow-600"
              trend={5}
            />
            <StatCard
              icon={ChatBubbleLeftRightIcon}
              label="Total Chats"
              value={stats.totalChats}
              color="from-purple-500 to-purple-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickActionCard
                icon={PlusIcon}
                title="Start New Chat"
                description="Begin a new learning conversation with AI"
                color="from-red-500 to-red-600"
                onClick={() => onNavigate && onNavigate("chat")}
              />
              <QuickActionCard
                icon={BookOpenIcon}
                title="Review Notes"
                description="Access your saved study materials"
                color="from-blue-500 to-blue-600"
                onClick={() => onNavigate && onNavigate("notes")}
              />
              <QuickActionCard
                icon={AcademicCapIcon}
                title="Take Practice Test"
                description="Test your knowledge with AI-generated exams"
                color="from-green-500 to-green-600"
                onClick={() => onNavigate && onNavigate("chat")}
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Recent Activity
                  </h2>
                  <button
                    onClick={() => onNavigate && onNavigate("history")}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  {recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>

            {/* Study Progress & Tips */}
            <div className="space-y-6">
              {/* Weekly Progress */}
              <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center space-x-3 mb-4">
                  <CalendarIcon className="w-6 h-6" />
                  <h3 className="text-lg font-bold">This Week</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Study Goal</span>
                      <span className="font-semibold">15h / 20h</span>
                    </div>
                    <div className="w-full bg-red-900/50 rounded-full h-3">
                      <div
                        className="bg-white h-3 rounded-full"
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-red-500/30">
                    <p className="text-red-100 text-sm">
                      🎯 You're doing great! Keep up the momentum to reach your
                      weekly goal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Study Tip */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Study Tip</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  💡 Take regular breaks using the Pomodoro technique: 25
                  minutes of focused study followed by a 5-minute break helps
                  improve retention and prevents burnout.
                </p>
              </div>

              {/* Achievements */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <TrophyIcon className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-bold text-gray-800">
                    Achievements
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        7-Day Streak
                      </p>
                      <p className="text-xs text-gray-500">
                        Keep learning daily!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📚</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Knowledge Seeker
                      </p>
                      <p className="text-xs text-gray-500">
                        10+ study sessions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
