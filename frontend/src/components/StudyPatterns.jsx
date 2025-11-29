import React, { useState, useEffect } from "react";
import { useAuth, useUserId } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  FireIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

function StudyPatterns({ onNavigate }) {
  const { user } = useAuth();
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalActivities: 0,
    averagePerDay: 0,
    mostActiveDay: "Monday",
    mostActiveTime: "Evening",
  });

  useEffect(() => {
    if (userId) {
      loadActivityData();
    }
  }, [userId]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      const [exams, chats, notes] = await Promise.all([
        apiService.getUserExams(userId),
        apiService.getUserChats(userId),
        apiService.getUserNotes(userId),
      ]);

      // Combine all activities and group by date
      const activityMap = {};
      const now = new Date();
      
      // Initialize last 365 days
      for (let i = 364; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        activityMap[dateKey] = { count: 0, activities: [] };
      }

      // Add exam activities
      exams.forEach(exam => {
        const dateKey = new Date(exam.created_at).toISOString().split('T')[0];
        if (activityMap[dateKey]) {
          activityMap[dateKey].count++;
          activityMap[dateKey].activities.push({ type: 'exam', data: exam });
        }
      });

      // Add chat activities
      chats.forEach(chat => {
        const dateKey = new Date(chat.created_at).toISOString().split('T')[0];
        if (activityMap[dateKey]) {
          activityMap[dateKey].count++;
          activityMap[dateKey].activities.push({ type: 'chat', data: chat });
        }
      });

      // Add note activities
      notes.forEach(note => {
        const dateKey = new Date(note.created_at).toISOString().split('T')[0];
        if (activityMap[dateKey]) {
          activityMap[dateKey].count++;
          activityMap[dateKey].activities.push({ type: 'note', data: note });
        }
      });

      // Convert to array
      const activityArray = Object.entries(activityMap).map(([date, data]) => ({
        date,
        count: data.count,
        activities: data.activities,
      }));

      // Calculate stats
      const activeDays = activityArray.filter(d => d.count > 0).length;
      const totalActivities = activityArray.reduce((sum, d) => sum + d.count, 0);
      
      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      for (let i = activityArray.length - 1; i >= 0; i--) {
        if (activityArray[i].count > 0) {
          tempStreak++;
          if (i === activityArray.length - 1 || currentStreak > 0) {
            currentStreak = tempStreak;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          if (i === activityArray.length - 1) {
            currentStreak = 0;
          }
          tempStreak = 0;
        }
      }

      // Calculate day of week stats
      const dayStats = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      activityArray.forEach(item => {
        const date = new Date(item.date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        dayStats[dayName] += item.count;
      });
      const mostActiveDay = Object.entries(dayStats).reduce((a, b) => b[1] > a[1] ? b : a)[0];

      setActivityData(activityArray);
      setStats({
        totalDays: activeDays,
        currentStreak,
        longestStreak,
        totalActivities,
        averagePerDay: activeDays > 0 ? (totalActivities / activeDays).toFixed(1) : 0,
        mostActiveDay: mostActiveDay === 'Mon' ? 'Monday' : mostActiveDay === 'Tue' ? 'Tuesday' : mostActiveDay === 'Wed' ? 'Wednesday' : mostActiveDay === 'Thu' ? 'Thursday' : mostActiveDay === 'Fri' ? 'Friday' : mostActiveDay === 'Sat' ? 'Saturday' : 'Sunday',
        mostActiveTime: "Evening", // Simplified - would need time data to calculate
      });

      setLoading(false);
    } catch (error) {
      console.error("Failed to load activity data:", error);
      setLoading(false);
    }
  };

  const getActivityColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count <= 3) return 'bg-green-400';
    if (count <= 6) return 'bg-green-600';
    return 'bg-green-800';
  };

  const getActivityLevel = (count) => {
    if (count === 0) return 'No activity';
    if (count === 1) return '1 activity';
    if (count <= 3) return `${count} activities`;
    if (count <= 6) return `${count} activities`;
    return `${count}+ activities`;
  };

  // Group activities by weeks for display
  const getWeeksData = () => {
    const weeks = [];
    let currentWeek = [];
    
    activityData.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday
      
      if (index === 0) {
        // Pad the first week with empty cells
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(null);
        }
      }
      
      currentWeek.push(day);
      
      if (dayOfWeek === 6 || index === activityData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const weeks = getWeeksData();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('performance')}
            className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Performance
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Study Patterns</h1>
          <p className="text-gray-600">Track your daily learning activity over the past year</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Activities</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalActivities}</p>
                  </div>
                  <BookOpenIcon className="w-10 h-10 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Streak</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.currentStreak} days</p>
                  </div>
                  <FireIcon className="w-10 h-10 text-orange-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Longest Streak</p>
                    <p className="text-3xl font-bold text-green-600">{stats.longestStreak} days</p>
                  </div>
                  <FireIcon className="w-10 h-10 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Days</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalDays}</p>
                  </div>
                  <CalendarIcon className="w-10 h-10 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Activity Graph */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 mb-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {stats.totalActivities} activities in the last year
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
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
                      {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                          {week.map((day, dayIndex) => (
                            <div
                              key={dayIndex}
                              className={`w-3 h-3 rounded-sm ${day ? getActivityColor(day.count) : 'bg-transparent'} hover:ring-2 hover:ring-gray-400 cursor-pointer transition-all`}
                              title={day ? `${day.date}: ${getActivityLevel(day.count)}` : ''}
                            ></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Month labels */}
                  <div className="flex gap-1 mt-2 ml-14">
                    {months.map((month, index) => (
                      <div key={index} className="text-xs text-gray-500 w-12">
                        {month}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-md text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Study Habits
                </h3>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-purple-200 text-sm mb-1">Most Active Day</p>
                    <p className="text-xl font-bold">{stats.mostActiveDay}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-purple-200 text-sm mb-1">Average Activities/Day</p>
                    <p className="text-xl font-bold">{stats.averagePerDay}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Consistency Score</span>
                    <span className="text-lg font-bold text-blue-600">
                      {Math.round((stats.totalDays / 365) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Peak Streak</span>
                    <span className="text-lg font-bold text-green-600">{stats.longestStreak} days</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">This Week</span>
                    <span className="text-lg font-bold text-orange-600">
                      {activityData.slice(-7).reduce((sum, d) => sum + d.count, 0)} activities
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StudyPatterns;
