import React from "react";
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ChartBarIcon,
  AcademicCapIcon,
  TrophyIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { UserCircleIcon, ShieldCheckIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth.jsx";

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  onNavigate,
  currentPage = "dashboard",
  theme = "white",
}) {
  const navItems = [
    { id: "dashboard", icon: ChartBarIcon, label: "Dashboard" },
    { id: "chat", icon: ChatBubbleLeftRightIcon, label: "Chat" },
    { id: "notes", icon: DocumentTextIcon, label: "Notes" },
    { id: "documents", icon: BookOpenIcon, label: "Documents" },
    { id: "practicetest", icon: AcademicCapIcon, label: "Practice Tests" },
    { id: "performance", icon: TrophyIcon, label: "Performance" },
    { id: "history", icon: ClockIcon, label: "History" },
  ];

  // Account pages, shown by role (FR-AUTH-07). Demo sessions have no account.
  const { hasRole, isDemo } = useAuth();
  if (!isDemo) {
    navItems.push({ id: "assignments", icon: ClipboardDocumentListIcon, label: "Assignments" });
    navItems.push({ id: "profile", icon: UserCircleIcon, label: "Profile" });
  }
  if (hasRole("admin")) {
    navItems.push({ id: "admin", icon: ShieldCheckIcon, label: "Admin" });
  }

  // Theme configurations
  const themes = {
    white: {
      bg: "bg-white",
      logo: "bg-gradient-to-br from-red-600 to-red-800",
      logoIcon: "text-white",
      logoText: "text-red-800",
      activeButton: "bg-red-50 text-red-600",
      inactiveButton: "hover:bg-gray-100 text-gray-700",
      toggleButton: "hover:bg-gray-100 text-gray-700",
      closeButton: "hover:bg-gray-100 text-gray-600",
    },
    red: {
      bg: "bg-gradient-to-b from-red-900 via-red-800 to-red-900",
      logo: "bg-white",
      logoIcon: "text-red-600",
      logoText: "text-white",
      activeButton: "bg-red-700 text-white",
      inactiveButton: "hover:bg-red-700 text-red-100",
      toggleButton: "hover:bg-red-700 text-red-100",
      closeButton: "hover:bg-red-700 text-white",
    },
  };

  const currentTheme = themes[theme] || themes.white;

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full ${
          currentTheme.bg
        } shadow-xl z-50 transform transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "w-64" : "lg:w-16"}`}
      >
        <div className={sidebarOpen ? "p-6" : "p-2"}>
          {/* Logo Section */}
          <div
            className={`mb-8 ${
              sidebarOpen ? "flex items-center justify-between" : ""
            }`}
          >
            <div
              className={`flex items-center ${
                sidebarOpen ? "space-x-3" : "justify-center"
              }`}
            >
              <div
                className={`w-10 h-10 flex-shrink-0 ${currentTheme.logo} rounded-xl flex items-center justify-center`}
              >
                <SparklesIcon className={`w-6 h-6 ${currentTheme.logoIcon}`} />
              </div>
              {sidebarOpen && (
                <span className={`text-xl font-bold ${currentTheme.logoText}`}>
                  Cognify AI
                </span>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className={`lg:hidden p-2 ${currentTheme.closeButton} rounded-lg flex-shrink-0`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate && onNavigate(item.id)}
                  className={`w-full flex items-center rounded-xl font-medium transition-colors ${
                    sidebarOpen ? "px-4 py-3 space-x-3" : "p-3 justify-center"
                  } ${
                    isActive
                      ? currentTheme.activeButton
                      : currentTheme.inactiveButton
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Toggle Button (Desktop Only) */}
          <div
            className={`absolute bottom-6 left-0 right-0 ${
              sidebarOpen ? "px-6" : "px-2"
            }`}
          >
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden lg:flex w-full items-center ${
                currentTheme.toggleButton
              } rounded-xl font-medium transition-colors ${
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
                  d={
                    sidebarOpen
                      ? "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      : "M13 5l7 7-7 7M5 5l7 7-7 7"
                  }
                />
              </svg>
              {sidebarOpen && <span>Close sidebar</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
