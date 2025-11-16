import React, { useState } from "react";
import LandingPage from "./components/LandingPage";
import ChatPage from "./components/ChatPage";
import Dashboard from "./components/Dashboard";
import Notes from "./components/Notes";
import History from "./components/History";
import AuthModal from "./components/AuthModal";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import "./index.css";

function AppContent() {
  const { user, loading, signInAnonymously } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState("landing");

  const handleGetStarted = async () => {
    if (!user && !loading) {
      // Sign in anonymously for demo
      await signInAnonymously();
    }
    setCurrentPage("dashboard");
  };

  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setCurrentPage("dashboard");
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // Automatically redirect to dashboard when user logs in
  React.useEffect(() => {
    if (user && currentPage === "landing") {
      setCurrentPage("dashboard");
    }
  }, [user, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentPage === "landing" && (
        <LandingPage
          onGetStarted={handleGetStarted}
          showAuthModal={showAuthModal}
          setShowAuthModal={setShowAuthModal}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {currentPage === "dashboard" && <Dashboard onNavigate={handleNavigate} />}

      {currentPage === "chat" && <ChatPage onNavigate={handleNavigate} />}

      {currentPage === "notes" && <Notes onNavigate={handleNavigate} />}

      {currentPage === "history" && <History onNavigate={handleNavigate} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
