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
  Bars3Icon,
} from "@heroicons/react/24/outline";

function Performance({ onNavigate }) {
  const { user, signOut } = useAuth();
  const userId = useUserId();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showAllScores, setShowAllScores] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showAllStrongAreas, setShowAllStrongAreas] = useState(false);
  const [showAllWeakAreas, setShowAllWeakAreas] = useState(false);
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
    activityData: [],
    totalActivities: 0,
    activeDays: 0,
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
        const completedExams = exams.filter(e => 
          (e.status === 'completed' || e.submitted === true) && 
          e.score !== undefined && 
          e.score !== null
        );
        const totalScore = completedExams.reduce((sum, exam) => sum + (exam.score || 0), 0);
        const avgScore = completedExams.length > 0 ? Math.round(totalScore / completedExams.length) : 0;
        const totalStudyTime = chats.length * 30 + exams.length * 45; // Estimated in minutes
        const thisWeekTime = totalStudyTime * 0.3; // Simplified estimate

        // Recent exam scores (last 5 completed exams only)
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

        // Calculate activity data for GitHub-style graph
        const activityMap = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset to start of today
        
        // Calculate start date (52 weeks ago from today)
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 364);
        
        // Initialize days from start to today only
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0];
          activityMap[dateKey] = 0;
        }

        // Count activities per day
        [...exams, ...chats, ...notes].forEach(item => {
          const dateKey = new Date(item.created_at).toISOString().split('T')[0];
          if (activityMap[dateKey] !== undefined) {
            activityMap[dateKey]++;
          }
        });

        const activityData = Object.entries(activityMap).map(([date, count]) => ({
          date,
          count,
        }));

        // Calculate streaks
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        for (let i = activityData.length - 1; i >= 0; i--) {
          if (activityData[i].count > 0) {
            tempStreak++;
            if (i === activityData.length - 1 || currentStreak > 0) {
              currentStreak = tempStreak;
            }
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            if (i === activityData.length - 1) {
              currentStreak = 0;
            }
            tempStreak = 0;
          }
        }

        const totalActivities = activityData.reduce((sum, d) => sum + d.count, 0);
        const activeDays = activityData.filter(d => d.count > 0).length;

        setPerformanceData({
          overview: {
            totalChats: chats.length,
            totalNotes: notes.length,
            totalExams: exams.length,
            completedExams: completedExams.length,
            averageScore: avgScore,
            studyStreak: currentStreak,
            longestStreak: longestStreak,
            totalStudyTime: Math.round(totalStudyTime / 60 * 10) / 10, // Convert to hours
            thisWeekTime: Math.round(thisWeekTime / 60 * 10) / 10,
          },
          recentScores,
          topicBreakdown,
          activityData,
          totalActivities,
          activeDays,
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-50 transform transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          sidebarOpen ? "w-64" : "lg:w-16"
        }`}
      >
        <div className={sidebarOpen ? "p-6" : "p-2"}>
          <div className={`mb-8 ${sidebarOpen ? 'flex items-center justify-between' : ''}`}>
            <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
              <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && <span className="text-xl font-bold text-red-800">Cognify AI</span>}
            </div>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => onNavigate && onNavigate("dashboard")}
              className={`w-full flex items-center hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
              }`}
              title="Dashboard"
            >
              <HomeIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("chat")}
              className={`w-full flex items-center hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
              }`}
              title="Chat"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Chat</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("notes")}
              className={`w-full flex items-center hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
              }`}
              title="Notes"
            >
              <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Notes</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("documents")}
              className={`w-full flex items-center hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
              }`}
              title="Documents"
            >
              <BookOpenIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Documents</span>}
            </button>
            <button
              onClick={() => onNavigate && onNavigate("practicetest")}
              className={`w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
              title="Practice Tests"
            >
              <AcademicCapIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Practice Tests</span>}
            </button>
            <button
              className={`w-full flex items-center bg-red-50 text-red-600 rounded-xl font-medium ${
                sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
              }`}
              title="Performance"
            >
              <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Performance</span>}
            </button>
          </nav>

          {/* Toggle Button */}
          <div className={`absolute bottom-6 left-0 right-0 ${sidebarOpen ? "px-6" : "px-2"}`}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden lg:flex w-full items-center hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors ${
                sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
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

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        {/* Header */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bars3Icon className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Performance</h2>
                  <p className="text-sm text-gray-600">Monitor your learning progress and achievements</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="p-6">
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

              {/* Activity Graph */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {performanceData.totalActivities} activities in the last year
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Less</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-gray-100 rounded-sm border border-gray-200"></div>
                      <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                      <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                      <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
                    </div>
                    <span>More</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="flex gap-1">
                      {/* Day labels */}
                      <div className="flex flex-col gap-1 text-xs text-gray-500 pr-2">
                        <div className="h-3"></div>
                        <div className="h-3">Mon</div>
                        <div className="h-3"></div>
                        <div className="h-3">Wed</div>
                        <div className="h-3"></div>
                        <div className="h-3">Fri</div>
                        <div className="h-3"></div>
                      </div>

                      {/* Activity grid */}
                      <div className="flex gap-1">
                        {(() => {
                          const weeks = [];
                          let currentWeek = [];
                          
                          performanceData.activityData.forEach((day, index) => {
                            const date = new Date(day.date);
                            const dayOfWeek = date.getDay();
                            
                            if (index === 0) {
                              for (let i = 0; i < dayOfWeek; i++) {
                                currentWeek.push(null);
                              }
                            }
                            
                            currentWeek.push(day);
                            
                            if (dayOfWeek === 6 || index === performanceData.activityData.length - 1) {
                              weeks.push([...currentWeek]);
                              currentWeek = [];
                            }
                          });

                          const getActivityColor = (count) => {
                            if (count === 0) return 'bg-gray-100 border border-gray-200';
                            if (count === 1) return 'bg-green-200';
                            if (count <= 3) return 'bg-green-400';
                            if (count <= 6) return 'bg-green-600';
                            return 'bg-green-800';
                          };

                          const getActivityLevel = (count) => {
                            if (count === 0) return 'No activity';
                            if (count === 1) return '1 activity';
                            return `${count} activities`;
                          };
                          
                          return weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                              {week.map((day, dayIndex) => (
                                <div
                                  key={dayIndex}
                                  className={`w-3 h-3 rounded-sm ${day ? getActivityColor(day.count) : 'bg-transparent'} hover:ring-2 hover:ring-gray-400 cursor-pointer transition-all`}
                                  title={day ? `${day.date}: ${getActivityLevel(day.count)}` : ''}
                                ></div>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Month labels */}
                    <div className="flex mt-2 ml-14 text-xs text-gray-500">
                      {(() => {
                        const monthLabels = [];
                        const startDate = new Date(performanceData.activityData[0]?.date);
                        const endDate = new Date(performanceData.activityData[performanceData.activityData.length - 1]?.date);
                        
                        if (!startDate || !endDate) return null;
                        
                        let currentMonth = startDate.getMonth();
                        let weekCount = 0;
                        let lastLabelMonth = -1;
                        
                        performanceData.activityData.forEach((day, index) => {
                          const date = new Date(day.date);
                          const dayOfWeek = date.getDay();
                          const month = date.getMonth();
                          
                          // At the start of a new week
                          if (dayOfWeek === 0 || index === 0) {
                            // If it's a new month and we haven't labeled it yet in this position
                            if (month !== currentMonth && month !== lastLabelMonth) {
                              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              monthLabels.push(
                                <div key={weekCount} style={{ position: 'absolute', left: `${weekCount * 16}px` }}>
                                  {monthNames[month]}
                                </div>
                              );
                              lastLabelMonth = month;
                            }
                            currentMonth = month;
                            weekCount++;
                          }
                        });
                        
                        return <div style={{ position: 'relative', height: '16px' }}>{monthLabels}</div>;
                      })()}
                    </div>
                  </div>
                </div>
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
                    <>
                      <div className="space-y-3">
                        {performanceData.recentScores.slice(0, showAllScores ? performanceData.recentScores.length : 3).map((score, idx) => (
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
                      {performanceData.recentScores.length > 3 && (
                        <button
                          onClick={() => setShowAllScores(!showAllScores)}
                          className="w-full mt-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          {showAllScores ? 'Show Less' : `View All (${performanceData.recentScores.length})`}
                        </button>
                      )}
                    </>
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
                      <p className="text-purple-200 text-sm mb-1">Current Streak</p>
                      <p className="text-xl font-bold">{performanceData.overview.studyStreak} days 🔥</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-purple-200 text-sm mb-1">Longest Streak</p>
                      <p className="text-xl font-bold">{performanceData.overview.longestStreak} days</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-purple-200 text-sm mb-1">Active Days</p>
                      <p className="text-xl font-bold">{performanceData.activeDays} / 365</p>
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
                    <>
                      <div className="space-y-3">
                        {performanceData.topicBreakdown.slice(0, showAllTopics ? performanceData.topicBreakdown.length : 3).map((topic, idx) => {
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
                      {performanceData.topicBreakdown.length > 3 && (
                        <button
                          onClick={() => setShowAllTopics(!showAllTopics)}
                          className="w-full mt-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          {showAllTopics ? 'Show Less' : `View All (${performanceData.topicBreakdown.length})`}
                        </button>
                      )}
                    </>
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
                      <>
                        <div className="space-y-2">
                          {performanceData.strongAreas.slice(0, showAllStrongAreas ? performanceData.strongAreas.length : 3).map((area, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700">{area.topic}</span>
                              <span className="text-sm font-bold text-green-600">{Math.round(area.average)}%</span>
                            </div>
                          ))}
                        </div>
                        {performanceData.strongAreas.length > 3 && (
                          <button
                            onClick={() => setShowAllStrongAreas(!showAllStrongAreas)}
                            className="w-full mt-3 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg text-sm font-medium transition-colors"
                          >
                            {showAllStrongAreas ? 'Show Less' : `View All (${performanceData.strongAreas.length})`}
                          </button>
                        )}
                      </>
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
                      <>
                        <div className="space-y-2">
                          {performanceData.weakAreas.slice(0, showAllWeakAreas ? performanceData.weakAreas.length : 3).map((area, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700">{area.topic}</span>
                              <span className="text-sm font-bold text-orange-600">{Math.round(area.average)}%</span>
                            </div>
                          ))}
                        </div>
                        {performanceData.weakAreas.length > 3 && (
                          <button
                            onClick={() => setShowAllWeakAreas(!showAllWeakAreas)}
                            className="w-full mt-3 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium transition-colors"
                          >
                            {showAllWeakAreas ? 'Show Less' : `View All (${performanceData.weakAreas.length})`}
                          </button>
                        )}
                      </>
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
        </div>
      </main>
    </div>
  );
}

export default Performance;
