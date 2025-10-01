import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";
import { ReactNode } from "react";

interface RequireSubscriptionProps {
  children: ReactNode;
}

export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log("=== RequireSubscription Check ===");
  console.log("isLoading:", isLoading);
  console.log("isAuthenticated:", isAuthenticated);
  console.log("user:", user);
  console.log("subscriptionStatus:", user?.subscriptionStatus);

  // Show loading while checking auth status OR while user data is loading
  // This prevents the race condition where isLoading is false but user is not fully populated
  if (isLoading || (!user && isAuthenticated)) {
    console.log("Showing loading state");
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to register
  if (!isAuthenticated || !user) {
    console.log("Not authenticated, redirecting to /register");
    return <Redirect to="/register" />;
  }

  // Authenticated but no active subscription - redirect to subscribe
  // Check explicitly for 'active' status (null, undefined, or any other value means no subscription)
  if (user.subscriptionStatus !== 'active') {
    console.log("No active subscription, redirecting to /subscribe");
    return <Redirect to="/subscribe" />;
  }

  console.log("Active subscription confirmed, rendering protected content");
  // Has active subscription - render children
  return <>{children}</>;
}
