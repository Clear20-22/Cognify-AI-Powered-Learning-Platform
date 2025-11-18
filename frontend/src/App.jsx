import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import ChatPage from "./components/ChatPage";
import Dashboard from "./components/Dashboard";
import Notes from "./components/Notes";
import Documents from "./components/Documents";
import History from "./components/History";
import Performance from "./components/Performance";
import AuthModal from "./components/AuthModal";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import "./index.css";

function AppContent() {
  const { user, loading, signInAnonymously } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGetStarted = async () => {
    if (!user && !loading) {
      // Sign in anonymously for demo
      await signInAnonymously();
    }
    navigate("/dashboard");
  };

  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate("/dashboard");
  };

  const handleNavigate = (page) => {
    navigate(`/${page}`);
  };

  // Automatically redirect to dashboard when user logs in
  React.useEffect(() => {
    if (user && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [user, location.pathname, navigate]);

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
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              onGetStarted={handleGetStarted}
              showAuthModal={showAuthModal}
              setShowAuthModal={setShowAuthModal}
              onAuthSuccess={handleAuthSuccess}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/chat"
          element={
            user ? (
              <ChatPage onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            user ? (
              <ChatPage onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/notes"
          element={
            user ? (
              <Notes onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/documents"
          element={
            user ? (
              <Documents onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/history"
          element={
            user ? (
              <History onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/performance"
          element={
            user ? (
              <Performance onNavigate={handleNavigate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
