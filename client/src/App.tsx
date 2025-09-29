import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import { WelcomeScreen } from "@/pages/WelcomeScreen";
import { AuthScreen } from "@/pages/AuthScreen";
import { Dashboard } from "@/pages/Dashboard";
import { ConsentSession } from "@/pages/ConsentSession";
import { ConsentForm } from "@/pages/ConsentForm";
import { ElementLearnAndEngage } from "@/pages/ElementLearnAndEngage";

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
      <Route path="/consent/form/:qrCodeId?" component={ConsentForm} />
      
      {/* Protected routes (auth required) */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <AuthScreen />}
      </Route>
      <Route path="/auth">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <AuthScreen />}
      </Route>
      <Route path="/welcome">
        {isAuthenticated ? <WelcomeScreen /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/consent/new">
        {isAuthenticated ? <ConsentSession /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/learn">
        {isAuthenticated ? <ElementLearnAndEngage /> : <Redirect to="/auth" />}
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
