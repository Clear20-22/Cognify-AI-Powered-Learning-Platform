import { useState } from "react";
import AuthModal from "./AuthModal";
import { useAuth } from "../hooks/useAuth.jsx";
import { 
  BookOpenIcon, 
  DocumentTextIcon, 
  AcademicCapIcon, 
  SparklesIcon,
  ChartBarIcon,
  ClockIcon,
  LightBulbIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const { user } = useAuth();

  const openAuth = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
      {/* Abstract Background Graphics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-red-200 to-red-100 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-tr from-red-100 to-pink-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-bl from-orange-100 to-red-50 rounded-full blur-2xl"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-50 bg-white/80 backdrop-blur-md shadow-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left - Logo & Nav Links */}
            <div className="flex items-center space-x-12">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Cognify AI
                </h1>
              </div>
              
              <div className="hidden md:flex items-center space-x-8">
                <a href="#home" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                  Home
                </a>
                <a href="/dashboard" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                  Dashboard
                </a>
                <a href="#features" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                  Features
                </a>
                <a href="#about" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                  About Us
                </a>
              </div>
            </div>

            {/* Right - Auth Buttons */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700 font-medium">
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </span>
                  <button
                    onClick={() => window.location.href = "/dashboard"}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openAuth('signin')}
                    className="hidden sm:block px-6 py-2.5 text-red-600 font-semibold hover:text-red-700 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative z-10 px-6 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-red-100 rounded-full">
                <span className="text-red-700 font-semibold text-sm">🚀 Transform Your Learning Experience</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Master Any Subject with
                <span className="block bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  AI-Powered Learning
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Experience personalized education with intelligent study materials, practice questions, 
                and adaptive learning paths tailored just for you.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <button
                    onClick={() => window.location.href = "/chat"}
                    className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    Continue Learning →
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => openAuth('signup')}
                      className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                    >
                      Get Started Free →
                    </button>
                    <button
                      onClick={() => openAuth('signin')}
                      className="px-8 py-4 bg-white text-red-600 border-2 border-red-600 rounded-xl font-bold text-lg hover:bg-red-50 transition-all"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="w-6 h-6 text-red-600" />
                  <span className="text-gray-600 font-medium">10K+ Students</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="w-6 h-6 text-red-600" />
                  <span className="text-gray-600 font-medium">95% Success Rate</span>
                </div>
              </div>
            </div>

            {/* Right - Illustration */}
            <div className="relative">
              <div className="relative z-10 bg-gradient-to-br from-red-100 to-red-50 rounded-3xl p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                        <SparklesIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">AI Assistant</h4>
                        <p className="text-sm text-gray-500">Always Ready to Help</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">
                      "How can I help you learn today?"
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <LightBulbIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">Smart Learning</h4>
                        <p className="text-sm text-gray-500">Personalized for You</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold text-red-600">78%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full" style={{width: '78%'}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-md text-center transform hover:scale-105 transition-transform">
                      <BookOpenIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700">Study</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md text-center transform hover:scale-105 transition-transform">
                      <DocumentTextIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700">Practice</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md text-center transform hover:scale-105 transition-transform">
                      <AcademicCapIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700">Excel</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl opacity-20 blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-orange-400 to-red-500 rounded-full opacity-20 blur-xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-red-100 rounded-full mb-4">
              <span className="text-red-700 font-semibold text-sm">✨ Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="block bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                Succeed in Your Studies
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Access comprehensive learning resources powered by artificial intelligence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature Card 1 */}
            <div className="group bg-gradient-to-br from-white to-red-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-red-100">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <BookOpenIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Smart Syllabus</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-organized curriculum tailored to your learning pace and style with interactive content
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group bg-gradient-to-br from-white to-red-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-red-100">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Previous Papers</h3>
              <p className="text-gray-600 leading-relaxed">
                Access years of exam questions with detailed solutions and performance analytics
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group bg-gradient-to-br from-white to-red-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-red-100">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <AcademicCapIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Study PDFs</h3>
              <p className="text-gray-600 leading-relaxed">
                Curated study materials and notes optimized for quick learning and revision
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="group bg-gradient-to-br from-white to-red-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-red-100">
              <div className="w-16 h-16 bg-gradient-to-br from-red-700 to-red-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">AI Practice Tests</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate unlimited practice questions adapted to your knowledge level and weak areas
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="flex items-start space-x-4 p-6 bg-red-50 rounded-xl">
              <ClockIcon className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-800 mb-2">24/7 Availability</h4>
                <p className="text-gray-600 text-sm">Learn anytime, anywhere with instant AI assistance</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-6 bg-red-50 rounded-xl">
              <ChartBarIcon className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Progress Tracking</h4>
                <p className="text-gray-600 text-sm">Monitor your improvement with detailed analytics</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-6 bg-red-50 rounded-xl">
              <LightBulbIcon className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Adaptive Learning</h4>
                <p className="text-gray-600 text-sm">Content adjusts based on your performance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="relative z-10 px-6 py-20 bg-gradient-to-br from-red-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-red-100 rounded-full mb-4">
            <span className="text-red-700 font-semibold text-sm">👥 Our Team</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Meet the Team Behind
            <span className="block bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              Your Learning Success
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
            We're passionate developers and educators committed to revolutionizing education through AI technology
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">J</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Jubayer Ahmed Sojib</h3>
              <p className="text-red-600 font-semibold mb-4">Full Stack Developer</p>
              <div className="flex justify-center space-x-4">
                <a href="#" className="text-gray-600 hover:text-red-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">S</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Suraya Jannat Mim</h3>
              <p className="text-red-600 font-semibold mb-4">Frontend Developer</p>
              <div className="flex justify-center space-x-4">
                <a href="https://facebook.com/suraya.mim" className="text-gray-600 hover:text-red-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">A</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Md. Akram Khan</h3>
              <p className="text-red-600 font-semibold mb-4">Backend Developer</p>
              <div className="flex justify-center space-x-4">
                <a href="https://facebook.com/akram.khan" className="text-gray-600 hover:text-red-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-3xl p-12 md:p-16 text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students who are already experiencing the future of education
            </p>
            {!user && (
              <button
                onClick={() => openAuth('signup')}
                className="px-10 py-4 bg-white text-red-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Get Started Now - It's Free! →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Cognify AI</h3>
              </div>
              <p className="text-gray-400">
                Empowering students with AI-driven education for a brighter future.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-red-400 transition-colors">Features</a></li>
                <li><a href="/dashboard" className="hover:text-red-400 transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#about" className="hover:text-red-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Privacy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Cognify AI. Built with ❤️ for learners everywhere.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && !user && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}
    </div>
  );
}

export default LandingPage;
