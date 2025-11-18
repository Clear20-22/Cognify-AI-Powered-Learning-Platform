import React, { useState, useEffect } from "react";
import { useAuth, useUserId } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService";
import Avatar from "./Avatar";
import {
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  SparklesIcon,
  HomeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function Performance({ onNavigate }) {
  const { user, signOut } = useAuth();
  const userId = useUserId();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({
    overview: {
      totalChats: 0,
      totalNotes: 0,
      totalExams: 0,
      completedExams: 0,
      averageScore: 0,
      studyStreak: 0,
      totalStudyTime: 0,
      thisWeekTime: 0,
    },
    recentScores: [],
    topicBreakdown: [],
    studyPatterns: {
      mostActiveDay: "Monday",
      mostActiveTime: "Evening",
      averageSessionLength: 0,
    },
    achievements: [],
    weakAreas: [],
    strongAreas: [],
  });

  useEffect(() => {
    const loadPerformanceData = async () => {
      if (!userId) return;

      try {
        setLoading(true);

        // Fetch all data
        const [chatsData, notesData, examsData] = await Promise.all([
          apiService.getUserChats(userId).catch(() => ({ chats: [] })),
          apiService.getUserNotes(userId).catch(() => ({ notes: [] })),
          apiService.getUserExams(userId).catch(() => ({ exams: [] })),
        ]);

        const chats = chatsData.chats || [];
        const notes = notesData.notes || [];
        const exams = examsData.exams || [];

        // Calculate overview metrics
        const completedExams = exams.filter(e => e.status === 'completed' || e.score !== undefined);
        const totalScore = completedExams.reduce((sum, exam) => sum + (exam.score || 0), 0);
        const avgScore = completedExams.length > 0 ? Math.round(totalScore / completedExams.length) : 0;
        const totalStudyTime = chats.length * 30 + exams.length * 45; // Estimated in minutes
        const thisWeekTime = totalStudyTime * 0.3; // Simplified estimate

        // Recent exam scores (last 5)
        const recentScores = completedExams
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
          .map(exam => ({
            title: exam.title || exam.topic || "Assessment",
            score: exam.score || 0,
            date: new Date(exam.created_at).toLocaleDateString(),
          }));

        // Topic breakdown (count by subject/topic)
        const topicCounts = {};
        chats.forEach(chat => {
          const topic = chat.topic || "General";
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
        exams.forEach(exam => {
          const topic = exam.topic || exam.title || "General";
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        const topicBreakdown = Object.entries(topicCounts)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Calculate achievements
        const achievements = [];
        if (chats.length >= 5) achievements.push({ icon: "💬", title: "Conversationalist", desc: `${chats.length} chats completed` });
        if (completedExams.length >= 3) achievements.push({ icon: "📝", title: "Test Taker", desc: `${completedExams.length} exams completed` });
        if (avgScore >= 80) achievements.push({ icon: "⭐", title: "High Achiever", desc: `${avgScore}% average score` });
        if (notes.length >= 10) achievements.push({ icon: "📚", title: "Note Master", desc: `${notes.length} notes saved` });
        if (chats.length >= 1) achievements.push({ icon: "🔥", title: "Getting Started", desc: "Started learning journey" });

        // Identify weak and strong areas based on exam performance
        const topicScores = {};
        completedExams.forEach(exam => {
          const topic = exam.topic || exam.title || "General";
          if (!topicScores[topic]) topicScores[topic] = [];
          topicScores[topic].push(exam.score || 0);
        });

        const topicAverages = Object.entries(topicScores).map(([topic, scores]) => ({
          topic,
          average: scores.reduce((a, b) => a + b, 0) / scores.length,
          count: scores.length,
        }));

        const weakAreas = topicAverages.filter(t => t.average < 70).sort((a, b) => a.average - b.average).slice(0, 3);
        const strongAreas = topicAverages.filter(t => t.average >= 80).sort((a, b) => b.average - a.average).slice(0, 3);

        setPerformanceData({
          overview: {
            totalChats: chats.length,
            totalNotes: notes.length,
            totalExams: exams.length,
            completedExams: completedExams.length,
            averageScore: avgScore,
            studyStreak: 7, // TODO: Calculate actual streak
            totalStudyTime: Math.round(totalStudyTime / 60 * 10) / 10, // Convert to hours
            thisWeekTime: Math.round(thisWeekTime / 60 * 10) / 10,
          },
          recentScores,
          topicBreakdown,
          studyPatterns: {
            mostActiveDay: "Monday",
            mostActiveTime: "Evening",
            averageSessionLength: Math.round(totalStudyTime / (chats.length + exams.length) || 0),
          },
          achievements,
          weakAreas,
          strongAreas,
        });

      } catch (error) {
        console.error("Failed to load performance data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, [userId]);

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) {
      onNavigate("landing");
    }
  };

  const StatCard = ({ icon: Icon, label, value, subtitle, color, trend }) => (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

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
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                Cognify AI
              </h1>
            </div>
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
              <DocumentTextIcon className="w-5 h-5" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate("documents")}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <BookOpenIcon className="w-5 h-5" />
              <span>Documents</span>
            </button>

            <button
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 bg-red-50 rounded-xl"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>Performance</span>
            </button>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar
                src={null}
                alt={user?.name || "User"}
                size="w-10 h-10"
                fallbackText={(user?.name || user?.email || "U")[0].toUpperCase()}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {sidebarOpen ? (
                  <XMarkIcon className="w-6 h-6 text-gray-600" />
                ) : (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Track Performance</h2>
                <p className="text-sm text-gray-600">Monitor your learning progress and achievements</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading performance data...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={TrophyIcon}
                  label="Average Score"
                  value={`${performanceData.overview.averageScore}%`}
                  subtitle={`${performanceData.overview.completedExams} exams completed`}
                  color="from-yellow-500 to-orange-500"
                  trend={5}
                />
                <StatCard
                  icon={FireIcon}
                  label="Study Streak"
                  value={`${performanceData.overview.studyStreak} days`}
                  subtitle="Keep it going!"
                  color="from-red-500 to-pink-500"
                />
                <StatCard
                  icon={ClockIcon}
                  label="Total Study Time"
                  value={`${performanceData.overview.totalStudyTime}h`}
                  subtitle={`${performanceData.overview.thisWeekTime}h this week`}
                  color="from-blue-500 to-indigo-500"
                  trend={12}
                />
                <StatCard
                  icon={BookOpenIcon}
                  label="Learning Activities"
                  value={performanceData.overview.totalChats + performanceData.overview.totalExams}
                  subtitle={`${performanceData.overview.totalNotes} notes saved`}
                  color="from-green-500 to-emerald-500"
                  trend={8}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Exam Scores */}
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <AcademicCapIcon className="w-5 h-5 mr-2 text-red-600" />
                    Recent Exam Performance
                  </h3>
                  {performanceData.recentScores.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AcademicCapIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No exam data yet</p>
                      <p className="text-sm">Take exams to track your performance</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {performanceData.recentScores.map((score, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{score.title}</p>
                            <p className="text-xs text-gray-500">{score.date}</p>
                          </div>
                          <div className={`text-2xl font-bold ${score.score >= 80 ? 'text-green-600' : score.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {score.score}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Study Patterns */}
                <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-md text-white">
                  <h3 className="text-lg font-bold mb-4 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Study Patterns
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-purple-200 text-sm mb-1">Most Active Day</p>
                      <p className="text-xl font-bold">{performanceData.studyPatterns.mostActiveDay}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-purple-200 text-sm mb-1">Preferred Time</p>
                      <p className="text-xl font-bold">{performanceData.studyPatterns.mostActiveTime}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-purple-200 text-sm mb-1">Avg. Session</p>
                      <p className="text-xl font-bold">{performanceData.studyPatterns.averageSessionLength} min</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Topic Breakdown & Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Topic Breakdown */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Topic Breakdown</h3>
                  {performanceData.topicBreakdown.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No topics tracked yet</p>
                  ) : (
                    <div className="space-y-3">
                      {performanceData.topicBreakdown.map((topic, idx) => {
                        const maxCount = Math.max(...performanceData.topicBreakdown.map(t => t.count));
                        const percentage = (topic.count / maxCount) * 100;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">{topic.topic}</span>
                              <span className="text-gray-500">{topic.count} activities</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Strong & Weak Areas */}
                <div className="space-y-4">
                  {/* Strong Areas */}
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                      <span className="text-green-600 mr-2">💪</span>
                      Strong Areas
                    </h3>
                    {performanceData.strongAreas.length === 0 ? (
                      <p className="text-sm text-gray-500">Complete more exams to identify strengths</p>
                    ) : (
                      <div className="space-y-2">
                        {performanceData.strongAreas.map((area, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">{area.topic}</span>
                            <span className="text-sm font-bold text-green-600">{Math.round(area.average)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Weak Areas */}
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                      <span className="text-orange-600 mr-2">📈</span>
                      Areas for Improvement
                    </h3>
                    {performanceData.weakAreas.length === 0 ? (
                      <p className="text-sm text-gray-500">Great job! No weak areas identified</p>
                    ) : (
                      <div className="space-y-2">
                        {performanceData.weakAreas.map((area, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">{area.topic}</span>
                            <span className="text-sm font-bold text-orange-600">{Math.round(area.average)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2 text-yellow-500" />
                  Achievements
                </h3>
                {performanceData.achievements.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Start learning to unlock achievements!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {performanceData.achievements.map((achievement, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-2">{achievement.icon}</div>
                        <p className="font-bold text-gray-800 text-sm mb-1">{achievement.title}</p>
                        <p className="text-xs text-gray-600">{achievement.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Performance;
