import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { WelcomeScreen } from "@/pages/WelcomeScreen";
import { ConsentSession } from "@/pages/ConsentSession";
import { ConsentForm } from "@/pages/ConsentForm";
import { ElementLearnAndEngage } from "@/pages/ElementLearnAndEngage";

function Router() {
  return (
    <Switch>
      {/* ConsentIQ main app flow */}
      <Route path="/" component={WelcomeScreen} />
      <Route path="/consent/new" component={ConsentSession} />
      <Route path="/consent/form/:qrCodeId?" component={ConsentForm} />
      <Route path="/learn" component={ElementLearnAndEngage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
