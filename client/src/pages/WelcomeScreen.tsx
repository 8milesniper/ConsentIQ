import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export const WelcomeScreen = (): JSX.Element => {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  // Auto-advance through loading screens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Loading screens (steps 0-2)
  if (currentStep <= 2) {
    const logos = [
      { size: "w-24 h-24", opacity: "opacity-100" }, // Large heart
      { size: "w-16 h-16", opacity: "opacity-90" },  // Medium heart  
      { size: "w-20 h-20", opacity: "opacity-95" },  // ConsentIQ with logo
    ];

    const currentLogo = logos[currentStep];

    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div className={`${currentLogo.size} ${currentLogo.opacity} transition-all duration-500 ease-in-out mb-8`}>
            {currentStep === 2 ? (
              // ConsentIQ logo with text
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#4ade80] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
                    <path
                      fill="currentColor"
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-black">ConsentIQ</span>
              </div>
            ) : (
              // Heart icon only
              <div className="bg-[#4ade80] rounded-full flex items-center justify-center w-full h-full">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-white">
                  <path
                    fill="currentColor"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard (step 3)
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23000\"/><circle cx=\"20\" cy=\"20\" r=\"2\" fill=\"%23333\"/><circle cx=\"80\" cy=\"30\" r=\"1.5\" fill=\"%23333\"/><circle cx=\"60\" cy=\"70\" r=\"1\" fill=\"%23333\"/></svg>')"
      }}
    >
      {/* Header */}
      <div className="absolute top-12 right-6 text-white">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#4ade80] rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
              <path
                fill="currentColor"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </div>
          <span className="font-semibold">ConsentIQ</span>
        </div>
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