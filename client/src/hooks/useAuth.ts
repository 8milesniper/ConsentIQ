import { useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Validate session on mount by checking HTTP-only cookie
    validateSession();
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

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
    setAuthData,
  };
};