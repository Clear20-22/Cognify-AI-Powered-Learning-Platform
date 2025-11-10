import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import ChatPage from './components/ChatPage';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import './index.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading, signInAnonymously } = useAuth();

  const handleGetStarted = async () => {
    if (!user && !loading) {
      // Sign in anonymously for demo
      await signInAnonymously();
    }
    setCurrentPage('chat');
  };

  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setCurrentPage('chat');
  };

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
      {currentPage === 'landing' ? (
        <LandingPage 
          onGetStarted={handleGetStarted}
          onSignIn={handleSignIn}
        />
      ) : (
        <ChatPage />
      )}
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
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
