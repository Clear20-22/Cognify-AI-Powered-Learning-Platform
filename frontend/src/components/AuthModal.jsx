import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  XMarkIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

function AuthModal({ onClose, onSuccess, initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { signUp, signIn } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const validateForm = () => {
    if (mode === "signup") {
      if (!formData.fullName.trim()) {
        setError("Please enter your full name");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!formData.password.trim()) {
      setError("Please enter a password");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      let result;
      if (mode === "signup") {
        result = await signUp(
          formData.email,
          formData.password,
          formData.fullName
        );

        if (result.error) {
          setError(result.error.message);
        } else {
          // Successfully signed up - DON'T auto sign in, show sign in page
          setSuccessMessage(
            "Account created successfully! Please sign in with your credentials."
          );
          setMode("signin");
          // Clear the password fields but keep email
          setFormData({
            ...formData,
            password: "",
            confirmPassword: "",
          });
        }
      } else {
        result = await signIn(formData.email, formData.password);

        if (result.error) {
          setError(result.error.message);
        } else {
          // Successfully signed in - call onSuccess to navigate to chat page
          if (onSuccess) {
            onSuccess();
          } else if (onClose) {
            onClose();
          }
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      // Show more detailed error message
      const errorMessage =
        err.message || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider) => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement social auth when ready
      setError(`${provider} authentication coming soon!`);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setSuccessMessage(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gradient-to-br from-red-50 via-white to-gray-50 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="grid md:grid-cols-2 flex-1 overflow-hidden">
          {/* Left Side - Illustration/Branding */}
          <div className="hidden md:block bg-gradient-to-br from-red-600 to-red-800 p-12 relative overflow-hidden">
            {/* Abstract Background Graphics */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-10 w-60 h-60 bg-red-300 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-orange-300 rounded-full blur-2xl"></div>
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                    <SparklesIcon className="w-7 h-7 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Cognify AI</h2>
                </div>

                <h3 className="text-4xl font-bold text-white mb-6 leading-tight">
                  {mode === "signup"
                    ? "Start Your Learning Journey"
                    : "Welcome Back!"}
                </h3>
                <p className="text-red-100 text-lg mb-8">
                  {mode === "signup"
                    ? "Join thousands of students transforming their education with AI-powered learning."
                    : "Continue your personalized learning experience with intelligent study tools."}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      AI-Powered Learning
                    </h4>
                    <p className="text-red-100 text-sm">
                      Personalized content adapted to your pace
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Track Your Progress
                    </h4>
                    <p className="text-red-100 text-sm">
                      Detailed analytics and performance insights
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      24/7 Availability
                    </h4>
                    <p className="text-red-100 text-sm">
                      Learn anytime, anywhere you want
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="p-8 md:p-12 relative overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-red-100 rounded-lg transition-colors z-10"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600" />
            </button>

            <div className="max-w-md mx-auto">
              {/* Mobile Logo */}
              <div className="md:hidden flex items-center justify-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Cognify AI
                </h2>
              </div>

              <div className="mb-8">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">
                  {mode === "signup" ? "Create Account" : "Sign In"}
                </h3>
                <p className="text-gray-600">
                  {mode === "signup"
                    ? "Fill in your details to get started"
                    : "Enter your credentials to continue"}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-600 text-sm font-medium">
                    {successMessage}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : mode === "signup" ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleSocialAuth("google")}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      Google
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialAuth("github")}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span className="text-sm font-medium">GitHub</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  {mode === "signup"
                    ? "Already have an account?"
                    : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-red-600 hover:text-red-700 font-semibold hover:underline"
                  >
                    {mode === "signup" ? "Sign In" : "Sign Up"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
