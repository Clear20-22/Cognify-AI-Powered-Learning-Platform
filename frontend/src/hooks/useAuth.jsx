import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session from localStorage
    const getInitialSession = () => {
      try {
        const storedUser = localStorage.getItem("demo_user");
        if (storedUser) {
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

  // Sign in anonymously for demo purposes
  const signInAnonymously = async () => {
    try {
      // Create a mock user for demo
      const mockUser = {
        id: crypto.randomUUID(),
        email: "demo@example.com",
        user_metadata: {
          display_name: "Demo User",
        },
      };

      setUser(mockUser);
      localStorage.setItem("demo_user", JSON.stringify(mockUser));

      return { user: mockUser, error: null };
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      return { user: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setUser(null);
      localStorage.removeItem("demo_user");
      return { error: null };
    } catch (error) {
      console.error("Error in signOut:", error);
      return { error };
    }
  };

  // Sign in with email (simple localStorage-based auth)
  const signInWithEmail = async (email, password) => {
    try {
      // Simple mock authentication
      const mockUser = {
        id: crypto.randomUUID(),
        email: email,
        user_metadata: {
          display_name: email.split("@")[0],
        },
      };

      setUser(mockUser);
      localStorage.setItem("demo_user", JSON.stringify(mockUser));

      return { user: mockUser, error: null };
    } catch (error) {
      console.error("Error signing in with email:", error);
      return { user: null, error };
    }
  };

  const value = {
    user,
    loading,
    signInAnonymously,
    signInWithEmail,
    signOut,
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

  // Try to get from auth, fallback to localStorage demo user
  if (user?.id) {
    return user.id;
  }

  const demoUser = localStorage.getItem("demo_user");
  if (demoUser) {
    return JSON.parse(demoUser).id;
  }

  // Generate and store a demo user ID
  const demoUserId = crypto.randomUUID();
  const mockUser = {
    id: demoUserId,
    email: "demo@example.com",
    user_metadata: {
      display_name: "Demo User",
    },
  };
  localStorage.setItem("demo_user", JSON.stringify(mockUser));
  return demoUserId;
}
