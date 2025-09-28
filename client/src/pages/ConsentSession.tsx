import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createConsentSession, getConsentSession } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { QRCode } from "@/components/QRCode";
import type { ConsentSession as ConsentSessionType } from "@shared/schema";

type ConsentStatus = "generating" | "waiting" | "granted" | "denied" | "error";

export const ConsentSession = (): JSX.Element => {
  const [status, setStatus] = useState<ConsentStatus>("generating");
  const [session, setSession] = useState<ConsentSessionType | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate unique QR code ID
  const generateQrCodeId = () => {
    return `ciq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Create consent session mutation
  const createSessionMutation = useMutation({
    mutationFn: createConsentSession,
    onSuccess: (newSession) => {
      setSession(newSession);
      setStatus("waiting");
      toast({ title: "Session created!", description: "QR code is ready for your partner." });
    },
    onError: (error: Error) => {
      console.error("Failed to create session:", error);
      setStatus("error");
      toast({ 
        title: "Session creation failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Poll for session status updates
  const { data: sessionData } = useQuery({
    queryKey: ['consent-session', session?.id],
    queryFn: () => session ? getConsentSession(session.id) : null,
    enabled: !!session?.id && status === "waiting",
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Handle session status updates
  useEffect(() => {
    if (sessionData && sessionData.consentStatus !== "pending") {
      if (sessionData.consentStatus === "granted") {
        setStatus("granted");
      } else if (sessionData.consentStatus === "denied") {
        setStatus("denied");
      }
      setSession(sessionData);
    }
  }, [sessionData]);

  const createSession = async () => {
    const qrCodeId = generateQrCodeId();
    
    // Create session data - using placeholder participant info
    // In a real app, this might come from user input or app state
    const sessionData = {
      qrCodeId,
      participantName: "Partner", // This would be dynamic in real app
      participantAge: 25, // This would be dynamic in real app  
      consentStatus: "pending" as const,
      deleteAfterDays: 90,
    };

    createSessionMutation.mutate(sessionData);
  };

  // Initialize session
  useEffect(() => {
    createSession();
  }, []);

  const handleGenerateNewCode = () => {
    setStatus("generating");
    setSession(null);
    setTimeout(() => createSession(), 500); // Small delay for UX
  };

  const handleClose = () => {
    setLocation("/dashboard");
  };

  const handleRequestCheckIn = () => {
    // Create a new session for another check-in
    setStatus("generating");
    setSession(null);
    setTimeout(() => createSession(), 500);
  };

  // Error Screen  
  if (status === "error") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-red-600">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Error</h2>
          <p className="text-gray-600 mb-6">
            Unable to create consent session. Please try again.
          </p>

          <Button
            onClick={handleGenerateNewCode}
            className="w-full mb-4 bg-[#4ade80] hover:bg-[#22c55e] text-white py-3 rounded-full"
            data-testid="button-retry"
          >
            Try Again
          </Button>

          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full py-3 rounded-full"
            data-testid="button-close-error"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

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
                  Your partner can scan the QR code below to provide consent.
                  We'll update you with their response here.
                </p>
                {session && (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p><strong>Session ID:</strong> {session.id.slice(0, 8)}...</p>
                    <p><strong>QR Code:</strong> {session.qrCodeId}</p>
                    <p><strong>Status:</strong> {session.consentStatus}</p>
                  </div>
                )}
              </div>
            ) : (
              // QR Code Screen
              <div className="space-y-6">
                <div className="w-40 h-40 mx-auto flex items-center justify-center">
                  <QRCode 
                    value={session ? `${window.location.origin}/consent/form/${session.qrCodeId}` : ""}
                    size={160}
                    className="mx-auto"
                  />
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                  {createSessionMutation.isPending ? "Creating Session..." : "Start New"}
                </h2>
                <p className="text-gray-600">
                  {createSessionMutation.isPending 
                    ? "Setting up your consent session..."
                    : "Have your partner scan this QR code to streamline the process of getting to consent."
                  }
                </p>
                {session && (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p><strong>Partner URL:</strong></p>
                    <p className="text-xs break-all">{window.location.origin}/consent/form/{session.qrCodeId}</p>
                  </div>
                )}

                <Button
                  onClick={handleGenerateNewCode}
                  disabled={createSessionMutation.isPending}
                  variant="outline"
                  className="w-full py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                  data-testid="button-generate-code"
                >
                  {createSessionMutation.isPending ? "⏳ Creating..." : "🔄 Generate New Code"}
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
            We've received a response from your partner. We've 
            also received a summary of the interaction and 
            their explicit consent.
          </p>
          
          <div className="bg-green-50 p-4 rounded-xl mb-6">
            <p className="text-green-800 font-semibold">"Yes, I consent"</p>
            {sessionData && (
              <p className="text-xs text-gray-500 mt-2">
                Granted: {new Date(sessionData.consentGrantedTime || '').toLocaleString()}
              </p>
            )}
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
          We've received a response from your partner. We've 
          received a summary of the interaction and 
          noted a decline.
        </p>
        
        <div className="bg-red-50 p-4 rounded-xl mb-6">
          <p className="text-red-800 font-semibold">"No, I don't consent"</p>
          {sessionData && sessionData.consentStatus === "denied" && (
            <p className="text-xs text-gray-500 mt-2">
              Response received: {new Date().toLocaleString()}
            </p>
          )}
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