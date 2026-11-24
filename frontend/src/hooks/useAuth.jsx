import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext({});
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// FastAPI returns `detail` as a string, or as a list of validation errors (422)
const getErrorMessage = (data, fallback) => {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail[0].msg?.replace(/^Value error, /, "") || fallback;
  }
  return fallback;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh role, name, and join date from the server, so sessions saved
    // before these fields existed (or before an admin changed the role) stay current
    const refreshProfile = async (token, storedUser) => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const refreshed = {
          ...storedUser,
          name: data.full_name,
          role: data.role,
          createdAt: data.created_at,
        };
        setUser(refreshed);
        localStorage.setItem("user", JSON.stringify(refreshed));
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    };

    // Get initial session from localStorage
    const getInitialSession = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("access_token");
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          if (token !== "demo-token") {
            refreshProfile(token, parsedUser);
          }
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();
  }, []);

  // Sign up with email, password, and role ("student" or "teacher")
  const signUp = async (email, password, fullName, role = "student") => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          user: null,
          error: { message: getErrorMessage(data, "Sign up failed") },
        };
      }

      // Create user object from response
      const userData = {
        id: data.user_id,
        email: data.email,
        name: data.full_name,
        role: data.role,
        createdAt: data.created_at,
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
          error: { message: getErrorMessage(data, "Sign in failed") },
        };
      }

      // Create user object from response
      const userData = {
        id: data.user_id,
        email: data.email,
        name: data.full_name,
        role: data.role,
        createdAt: data.created_at,
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

  // Update the signed-in user's own name (FR-AUTH-10)
  const updateProfile = async (fullName) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ full_name: fullName }),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          error: { message: getErrorMessage(data, "Could not update profile") },
        };
      }
      const updatedUser = { ...user, name: data.full_name };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return { error: null };
    } catch (error) {
      console.error("Error updating profile:", error);
      return { error: { message: "Network error. Please try again." } };
    }
  };

  // Change password after confirming the current one (FR-AUTH-10)
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          error: {
            message: getErrorMessage(data, "Could not change password"),
          },
        };
      }
      return { error: null };
    } catch (error) {
      console.error("Error changing password:", error);
      return { error: { message: "Network error. Please try again." } };
    }
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

  // Role helpers for hiding features the user cannot access (FR-AUTH-07).
  // The backend enforces access; this only controls what the UI shows.
  const role = user?.role || "student";
  const hasRole = (...roles) => roles.includes(role);
  // A demo session ("Get Started" without an account) has no account on the server
  const isDemo = Boolean(user?.id?.startsWith("demo-"));

  const value = {
    user,
    loading,
    role,
    hasRole,
    isDemo,
    signUp,
    signIn,
    signOut,
    signInAnonymously,
    getAuthHeader,
    updateProfile,
    changePassword,
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
