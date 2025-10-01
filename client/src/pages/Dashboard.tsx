import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";

export const Dashboard = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Subscription check is handled by RequireSubscription guard in App.tsx - no redirect needed here

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  // Calculate days until account deletion
  const getDaysUntilDeletion = () => {
    if (!user?.accountDeletionDate) return null;
    const deletionDate = new Date(user.accountDeletionDate);
    const now = new Date();
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDeletion = getDaysUntilDeletion();

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23000\"/><circle cx=\"20\" cy=\"20\" r=\"2\" fill=\"%23333\"/><circle cx=\"80\" cy=\"30\" r=\"1.5\" fill=\"%23333\"/><circle cx=\"60\" cy=\"70\" r=\"1\" fill=\"%23333\"/></svg>')"
      }}
    >
      {/* Account Deletion Warning Banner */}
      {daysUntilDeletion !== null && daysUntilDeletion > 0 && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <Alert className="bg-red-900/90 border-red-800 text-white rounded-none" data-testid="alert-deletion-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {user?.subscriptionStatus === 'past_due' ? (
                  <>⚠️ Payment failed. Fix your payment within <strong>{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</strong> or your account will be deleted.</>
                ) : (
                  <>⚠️ Your subscription has been cancelled. Your account and all data will be deleted in <strong>{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</strong>.</>
                )}
              </span>
              <Button 
                onClick={() => setLocation("/subscribe")}
                className="bg-white text-red-900 hover:bg-gray-100 ml-4"
                size="sm"
                data-testid="button-resubscribe"
              >
                {user?.subscriptionStatus === 'past_due' ? 'Fix Payment' : 'Resubscribe Now'}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Header */}
      <div className={`absolute ${daysUntilDeletion !== null && daysUntilDeletion > 0 ? 'top-24' : 'top-12'} right-6 text-white`}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-sm text-gray-300 hover:text-white"
            data-testid="button-logout"
          >
            Logout
          </button>
          <div className="flex items-center gap-2">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-[#4ade80] rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
                  <path
                    fill="currentColor"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
              </div>
            )}
            <span className="font-semibold">ConsentIQ</span>
          </div>
        </div>
      </div>

      <div className="absolute top-16 left-6 text-white">
        <p className="text-sm opacity-75">Welcome back, {user?.fullName || user?.username}!</p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="max-w-md w-full">
          <h1 className="text-white text-4xl font-bold mb-4">
            Starting something romantic?
          </h1>
          
          <p className="text-gray-300 text-lg mb-12 px-4">
            Start a new session with your partner to begin 
            recording your positive consent.
          </p>

          <Button
            onClick={() => setLocation("/consent/new")}
            className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-semibold py-4 px-8 rounded-full text-lg transition-colors duration-200"
            data-testid="button-start-new"
          >
            <span className="mr-2">+</span>
            Start New
          </Button>

          {/* Upgrade Plan Button - only show if no active subscription */}
          {user?.subscriptionStatus !== 'active' && (
            <Button
              onClick={() => setLocation("/subscribe")}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-full text-lg transition-colors duration-200"
              data-testid="button-upgrade-plan"
            >
              Upgrade Plan
            </Button>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-white rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center gap-8">
              <button 
                className="flex flex-col items-center gap-1"
                data-testid="nav-home"
              >
                <div className="w-6 h-6 text-[#4ade80]">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-[#4ade80]">Home</span>
              </button>
              
              <button 
                className="flex flex-col items-center gap-1"
                onClick={() => setLocation("/learn")}
                data-testid="nav-learn"
              >
                <div className="w-6 h-6 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-400">Learn</span>
              </button>
              
              <button 
                className="flex flex-col items-center gap-1"
                data-testid="nav-profile"
              >
                <div className="w-6 h-6 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-400">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};