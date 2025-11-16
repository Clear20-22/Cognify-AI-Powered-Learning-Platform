import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext({});
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session from localStorage
    const getInitialSession = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("access_token");
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, fullName) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          error: { message: data.detail || "Sign up failed" },
        };
      }

      // Create user object from response
      const userData = {
        id: data.user_id,
        email: data.email,
        name: data.full_name,
      };

      // Don't store user and token - let them sign in manually
      // This creates the account but doesn't log them in
      return { user: userData, error: null };
    } catch (error) {
      console.error("Error signing up:", error);
      return {
        user: null,
        error: {
          message:
            error.message ||
            "Network error. Please check if backend is running.",
        },
      };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          error: { message: data.detail || "Sign in failed" },
        };
      }

      // Create user object from response
      const userData = {
        id: data.user_id,
        email: data.email,
        name: data.full_name,
      };

      // Store user and token
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("access_token", data.access_token);

      return { user: userData, error: null };
    } catch (error) {
      console.error("Error signing in:", error);
      return {
        user: null,
        error: {
          message:
            error.message ||
            "Network error. Please check if backend is running.",
        },
      };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      return { error: null };
    } catch (error) {
      console.error("Error in signOut:", error);
      return { error };
    }
  };

  // Get authorization header
  const getAuthHeader = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Sign in anonymously for demo mode
  const signInAnonymously = async () => {
    try {
      const demoUser = {
        id: "demo-" + Date.now(),
        email: "demo@cognify.ai",
        name: "Demo User",
      };

      setUser(demoUser);
      localStorage.setItem("user", JSON.stringify(demoUser));
      localStorage.setItem("access_token", "demo-token");

      return { user: demoUser, error: null };
    } catch (error) {
      console.error("Error in demo sign in:", error);
      return {
        user: null,
        error: { message: "Demo sign in failed" },
      };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInAnonymously,
    getAuthHeader,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for getting current user ID
export function useUserId() {
  const { user } = useAuth();

  // Get user ID from authenticated user
  if (user?.id) {
    return user.id;
  }

  // Fallback to localStorage
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      return JSON.parse(storedUser).id;
    } catch (error) {
      console.error("Error parsing stored user:", error);
    }
  }

  return null;
}
