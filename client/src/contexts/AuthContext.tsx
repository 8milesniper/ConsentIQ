import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  profilePicture?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionEndDate?: string | null;
  accountDeletionDate?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthData: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Validate session on mount by checking HTTP-only cookie
    const timer = setTimeout(() => {
      validateSession();
    }, 100); // Small delay to prevent rapid-fire requests
    return () => clearTimeout(timer);
  }, []);

  const validateSession = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: 'include', // Include HTTP-only cookies
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Session is invalid
        setUser(null);
      }
    } catch (error) {
      // Network error or session validation failed
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthData = (user: User) => {
    setUser(user);
    setIsLoading(false); // Ensure loading state is false
    // No token storage needed - handled by HTTP-only cookies
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });
    } catch (error) {
      // Logout endpoint failed, but clear local state anyway
      console.warn("Logout endpoint failed", error);
    } finally {
      setUser(null);
    }
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    setAuthData,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};