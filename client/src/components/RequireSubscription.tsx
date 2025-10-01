import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";
import { ReactNode } from "react";

interface RequireSubscriptionProps {
  children: ReactNode;
}

export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth status OR while user data is loading
  // This prevents the race condition where isLoading is false but user is not fully populated
  if (isLoading || (!user && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to register
  if (!isAuthenticated || !user) {
    return <Redirect to="/register" />;
  }

  // Authenticated but no active subscription - redirect to subscribe
  // Check explicitly for 'active' status (null, undefined, or any other value means no subscription)
  if (user.subscriptionStatus !== 'active') {
    return <Redirect to="/subscribe" />;
  }

  // Has active subscription - render children
  return <>{children}</>;
}
