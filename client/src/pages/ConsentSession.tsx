import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type ConsentStatus = "generating" | "waiting" | "granted" | "denied";

export const ConsentSession = (): JSX.Element => {
  const [status, setStatus] = useState<ConsentStatus>("generating");
  const [qrCode, setQrCode] = useState<string>("");
  const [, setLocation] = useLocation();

  // Mock QR code generation and session creation
  const generateQrCode = () => {
    const mockQrId = `consent-${Date.now()}`;
    setQrCode(mockQrId);
    return mockQrId;
  };

  const createSession = () => {
    // Mock session creation - in production this would call the API
    const qrId = generateQrCode();
    setStatus("waiting");
    
    // Mock status changes for demo (3 seconds wait, then random result)
    setTimeout(() => {
      const isGranted = Math.random() > 0.5; // 50/50 chance for demo
      setStatus(isGranted ? "granted" : "denied");
    }, 3000);
  };

  // Initialize session
  useEffect(() => {
    createSession();
  }, []);

  const handleGenerateNewCode = () => {
    setStatus("generating");
    setTimeout(() => createSession(), 500); // Small delay for UX
  };

  const handleClose = () => {
    setLocation("/");
  };

  const handleRequestCheckIn = () => {
    // Reset to waiting status
    setStatus("waiting");
    setTimeout(() => {
      const isGranted = Math.random() > 0.5;
      setStatus(isGranted ? "granted" : "denied");
    }, 2000);
  };

  // QR Code Generation / Waiting Screen
  if (status === "generating" || status === "waiting") {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23000\"/><circle cx=\"20\" cy=\"20\" r=\"2\" fill=\"%23333\"/><circle cx=\"80\" cy=\"30\" r=\"1.5\" fill=\"%23333\"/><circle cx=\"60\" cy=\"70\" r=\"1\" fill=\"%23333\"/></svg>')"
        }}
      >
        {/* Header */}
        <div className="absolute top-12 left-6 text-white">
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
              <span className="text-sm">←</span>
            </div>
          </button>
        </div>

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
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            
            {status === "waiting" ? (
              // Waiting Screen
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="animate-pulse w-8 h-8 bg-gray-400 rounded-full"></div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Waiting on Response</h2>
                <p className="text-gray-600">
                  We've sent a request to Sophie. We will update 
                  you with their response here.
                </p>
              </div>
            ) : (
              // QR Code Screen
              <div className="space-y-6">
                <div className="w-40 h-40 mx-auto bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center">
                  {/* Mock QR Code */}
                  <div className="w-32 h-32 bg-gray-900 relative">
                    <div className="absolute inset-2 bg-white"></div>
                    <div className="absolute inset-4 bg-gray-900 grid grid-cols-8 gap-px p-1">
                      {[...Array(64)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`${Math.random() > 0.5 ? 'bg-black' : 'bg-white'} aspect-square`} 
                        />
                      ))}
                    </div>
                    {/* QR corners */}
                    <div className="absolute top-1 left-1 w-6 h-6 border-2 border-black"></div>
                    <div className="absolute top-1 right-1 w-6 h-6 border-2 border-black"></div>
                    <div className="absolute bottom-1 left-1 w-6 h-6 border-2 border-black"></div>
                    {/* Center logo */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#4ade80] rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                        <path
                          fill="currentColor"
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900">Start New</h2>
                <p className="text-gray-600">
                  Have your partner scan this QR code to streamline 
                  the process of getting to consent.
                </p>

                <Button
                  onClick={handleGenerateNewCode}
                  variant="outline"
                  className="w-full py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                  data-testid="button-generate-code"
                >
                  🔄 Generate New Code
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (status === "granted") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-green-600">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Good News</h2>
          <p className="text-gray-600 mb-2">
            We've received a response from Sophie. We've 
            also received a summary of the interaction and 
            their explicit consent.
          </p>
          
          <div className="bg-green-50 p-4 rounded-xl mb-6">
            <p className="text-green-800 font-semibold">"Yes, I consent"</p>
          </div>

          <Button
            onClick={handleRequestCheckIn}
            variant="outline"
            className="w-full mb-4 py-3 rounded-full"
            data-testid="button-request-checkin"
          >
            Request another check in
          </Button>

          <Button
            onClick={handleClose}
            className="w-full bg-black text-white py-3 rounded-full hover:bg-gray-800"
            data-testid="button-close"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Denial Screen
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 text-red-600">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Consent</h2>
        <p className="text-gray-600 mb-2">
          We've received a response from Sophie. We've 
          received a summary of the interaction and 
          noted a decline.
        </p>
        
        <div className="bg-red-50 p-4 rounded-xl mb-6">
          <p className="text-red-800 font-semibold">"No, I don't consent"</p>
        </div>

        <Button
          onClick={handleRequestCheckIn}
          variant="outline"
          className="w-full mb-4 py-3 rounded-full"
          data-testid="button-request-checkin"
        >
          Request another check in
        </Button>

        <Button
          onClick={handleClose}
          className="w-full bg-black text-white py-3 rounded-full hover:bg-gray-800"
          data-testid="button-close"
        >
          Close
        </Button>
      </div>
    </div>
  );
};