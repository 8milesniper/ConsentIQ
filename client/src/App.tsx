import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RequireSubscription } from "@/components/RequireSubscription";

import LandingPage from "@/pages/LandingPage";
import { WelcomeScreen } from "@/pages/WelcomeScreen";
import { AuthScreen } from "@/pages/AuthScreen";
import { Dashboard } from "@/pages/Dashboard";
import { ConsentSession } from "@/pages/ConsentSession";
import { ConsentForm } from "@/pages/ConsentForm";
import { ElementLearnAndEngage } from "@/pages/ElementLearnAndEngage";
import Subscribe from "@/pages/Subscribe";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading ConsentIQ...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes (no auth required) */}
      <Route path="/" component={LandingPage} />
      <Route path="/consent/form/:qrCodeId?" component={ConsentForm} />
      <Route path="/success" component={PaymentSuccess} />
      <Route path="/cancel" component={PaymentCancel} />
      
      {/* Auth routes - AuthScreen handles post-auth redirects based on subscription status */}
      <Route path="/register" component={AuthScreen} />
      <Route path="/login" component={AuthScreen} />
      
      {/* Protected routes (auth required) */}
      <Route path="/subscribe">
        {isAuthenticated ? <Subscribe /> : <Redirect to="/register" />}
      </Route>
      <Route path="/welcome">
        {isAuthenticated ? <WelcomeScreen /> : <Redirect to="/register" />}
      </Route>
      <Route path="/dashboard">
        <RequireSubscription>
          <Dashboard />
        </RequireSubscription>
      </Route>
      <Route path="/consent/new">
        <RequireSubscription>
          <ConsentSession />
        </RequireSubscription>
      </Route>
      <Route path="/learn">
        <RequireSubscription>
          <ElementLearnAndEngage />
        </RequireSubscription>
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
