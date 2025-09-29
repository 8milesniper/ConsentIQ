import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getConsentSessionByQR, updateConsentSessionStatus, generateUploadUrl, createVideoAsset } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { ConsentSession as ConsentSessionType, SafeUser } from "@shared/schema";

// Extended type for sessions that include initiator information
type ConsentSessionWithInitiator = ConsentSessionType & {
  initiator?: SafeUser;
};

const consentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isOver18: z.literal(true, { errorMap: () => ({ message: "You must be over 18 to continue" }) }),
});

type ConsentFormData = z.infer<typeof consentFormSchema>;

export const ConsentForm = (): JSX.Element => {
  const { qrCodeId } = useParams<{ qrCodeId?: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [session, setSession] = useState<ConsentSessionWithInitiator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [compatibilityError, setCompatibilityError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ConsentFormData>({
    resolver: zodResolver(consentFormSchema),
    defaultValues: {
      name: "",
      isOver18: false as any,
    },
  });

  // Fetch consent session by QR code
  const { data: sessionData, isLoading: isLoadingSession, error: sessionError } = useQuery({
    queryKey: ['consent-session-qr', qrCodeId],
    queryFn: () => qrCodeId ? getConsentSessionByQR(qrCodeId) : null,
    enabled: !!qrCodeId,
  });

  // Update consent status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, videoAssetId }: { status: "granted" | "denied", videoAssetId?: string }) => 
      session ? updateConsentSessionStatus(session.id, status, videoAssetId) : Promise.reject(new Error("No session")),
    onSuccess: (updatedSession) => {
      setSession(updatedSession);
      queryClient.invalidateQueries({ queryKey: ['consent-session', updatedSession.id] });
      setCurrentStep(3); // Move to completion step
      toast({ 
        title: "Response recorded", 
        description: updatedSession.consentStatus === "granted" ? "Consent granted" : "Consent declined" 
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update consent status:", error);
      toast({ 
        title: "Failed to record response", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Check browser compatibility
  useEffect(() => {
    const checkCompatibility = () => {
      if (!navigator.mediaDevices) {
        setCompatibilityError("Camera access not supported in this browser");
        setBrowserSupported(false);
        return;
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        setCompatibilityError("Camera access not available");
        setBrowserSupported(false);
        return;
      }
      
      if (!window.MediaRecorder) {
        setCompatibilityError("Video recording not supported in this browser");
        setBrowserSupported(false);
        return;
      }
      
      // Check for supported video formats
      const supportedFormats = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const supportedFormat = supportedFormats.find(format => MediaRecorder.isTypeSupported(format));
      
      if (!supportedFormat) {
        setCompatibilityError("No supported video recording formats available");
        setBrowserSupported(false);
        return;
      }
      
      setBrowserSupported(true);
      setCompatibilityError(null);
    };
    
    checkCompatibility();
  }, []);

  // Set session when data loads
  useEffect(() => {
    if (sessionData) {
      setSession(sessionData);
      // If consent already given, skip to completion
      if (sessionData.consentStatus === "granted" || sessionData.consentStatus === "denied") {
        setCurrentStep(3); // Skip to completion step
      }
    }
  }, [sessionData]);

  // Initialize camera when component mounts
  useEffect(() => {
    if (currentStep === 1) {
      initializeCamera();
    }
    
    // Cleanup when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStep]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 480 },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to record consent video.",
        variant: "destructive"
      });
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !browserSupported) return;

    try {
      // Choose best supported format
      const supportedFormats = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const mimeType = supportedFormats.find(format => MediaRecorder.isTypeSupported(format)) || 'video/webm';
      
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setVideoBlob(blob);
        setCurrentStep(2); // Move to review step
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);

    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "Recording failed",
        description: "Unable to start video recording.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const onSubmit = (data: ConsentFormData) => {
    console.log("Form data:", data);
    setCurrentStep(1); // Move to video recording step
  };

  const handleGrantConsent = async () => {
    if (!videoBlob || !session) {
      toast({ 
        title: "Missing data", 
        description: "Video recording or session data is missing", 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Strip codec parameters from MIME type and determine correct file extension
      const baseMimeType = videoBlob.type.split(';')[0]; // Remove ;codecs=... part
      const fileExtension = baseMimeType === 'video/mp4' ? 'mp4' : 'webm';
      const filename = `consent-video-${Date.now()}.${fileExtension}`;
      
      // Generate upload URL for video
      const { uploadUrl, storageKey } = await generateUploadUrl(filename, baseMimeType);
      
      // Upload video blob (mock upload for development)
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: videoBlob,
        headers: {
          'Content-Type': videoBlob.type,
        },
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        throw new Error('Video upload failed');
      }

      // Create video asset record
      const videoAsset = await createVideoAsset({
        filename,
        mimeType: baseMimeType, // Use stripped MIME type
        fileSize: videoBlob.size,
        storageKey,
        isEncrypted: true,
      });

      // Update consent status to granted with video asset
      updateStatusMutation.mutate({ status: "granted", videoAssetId: videoAsset.id });
    } catch (error) {
      console.error('Failed to grant consent:', error);
      toast({ 
        title: "Failed to record consent", 
        description: error instanceof Error ? error.message : "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenyConsent = async () => {
    if (!session) return;
    
    setIsSubmitting(true);
    try {
      updateStatusMutation.mutate({ status: "denied" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while fetching session  
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#4ade80] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading consent session...</p>
        </div>
      </div>
    );
  }

  // Show browser compatibility error
  if (!browserSupported && compatibilityError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-orange-600">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Browser Not Supported</h2>
          <p className="text-gray-600 mb-6">{compatibilityError}</p>
          <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Recommended browsers:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Chrome 47+</li>
              <li>• Firefox 29+</li>
              <li>• Safari 14.1+</li>
              <li>• Edge 79+</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500">
            Please use a modern browser to complete consent verification.
          </p>
        </div>
      </div>
    );
  }

  // Show error if session not found
  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-red-600">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h2>
          <p className="text-gray-600 mb-6">
            {sessionError ? (sessionError as Error).message : "This consent session is invalid or has expired."}
          </p>
          <p className="text-sm text-gray-500">QR Code: {qrCodeId || "Missing"}</p>
        </div>
      </div>
    );
  }

  // Step 0: Form Input
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-[#4ade80] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 text-white">
          <div className="w-10 h-10"></div>
          <h1 className="text-xl font-semibold">Form</h1>
          <div className="w-10 h-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-t-3xl p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {/* Initiator's actual profile picture */}
              {session?.initiator?.profilePicture ? (
                <img 
                  src={session.initiator.profilePicture} 
                  alt={session.initiator.fullName || "User"} 
                  className="w-full h-full object-cover"
                  data-testid="img-initiator-profile"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {session?.initiator?.fullName?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">You have received a consent request</h2>
            <div className="inline-block bg-[#4ade80] text-white px-4 py-2 rounded-full font-medium">
              {session?.initiator?.fullName || "ConsentIQ User"}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Step 1.</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your name" 
                          className="border-0 border-b border-gray-300 rounded-none bg-transparent focus:border-[#4ade80] focus-visible:ring-0"
                          {...field}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <div className="flex items-center justify-between mt-8">
                  <span className="text-lg">Are you over 18?</span>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={!form.watch("isOver18") ? "default" : "outline"}
                      className={`w-16 h-12 rounded-full ${
                        !form.watch("isOver18") 
                          ? "bg-red-500 text-white" 
                          : "border-red-500 text-red-500"
                      }`}
                      onClick={() => form.setValue("isOver18", false as any)}
                      data-testid="button-no-over-18"
                    >
                      No
                    </Button>
                    <Button
                      type="button"
                      variant={form.watch("isOver18") ? "default" : "outline"}
                      className={`w-16 h-12 rounded-full ${
                        form.watch("isOver18") 
                          ? "bg-[#4ade80] text-white" 
                          : "border-[#4ade80] text-[#4ade80]"
                      }`}
                      onClick={() => form.setValue("isOver18", true)}
                      data-testid="button-yes-over-18"
                    >
                      Yes
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-semibold py-3 rounded-xl mt-8"
                data-testid="button-continue"
              >
                Continue
              </Button>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  // Step 1: Video Recording
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-slate-800 flex flex-col items-center text-center px-6">
        {/* Camera Icon */}
        <div className="mt-16 mb-8">
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-white">
            <path
              fill="currentColor"
              d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-8">Saying Yes?</h1>

        {/* Video Preview */}
        <div className="relative w-80 h-80 bg-black rounded-3xl overflow-hidden mb-8">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            data-testid="video-preview"
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-bold">🔴 REC</span>
            </div>
          )}
        </div>

        {/* Record Button */}
        {!isRecording ? (
          <Button
            onClick={startRecording}
            className="w-full max-w-sm bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-4 rounded-2xl mb-6 flex items-center justify-center gap-3"
            data-testid="button-start-recording"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path
                fill="currentColor"
                d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
              />
            </svg>
            Click to Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            className="w-full max-w-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl mb-6 animate-pulse"
            data-testid="button-stop-recording"
          >
            🔴 Stop Recording
          </Button>
        )}

        {/* Instructions */}
        <div className="text-white text-center max-w-sm">
          <p className="text-lg font-medium mb-3">State your name and your positive consent.</p>
          <p className="text-sm text-gray-300">
            This video is private, stored securely, never shared. The other person will receive a confirmation text.
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Review and Consent
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <button 
            onClick={() => setCurrentStep(1)}
            className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center"
            data-testid="button-back-to-recording"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">Review & Consent</h1>
          <div className="w-10 h-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Final Step</h2>
            <p className="text-gray-600 mb-6">
              Your video has been recorded. Please confirm your consent decision.
            </p>

            {videoBlob && (
              <div className="bg-gray-100 p-4 rounded-xl mb-6">
                <p className="text-sm text-gray-600">
                  Video recorded: {Math.round(videoBlob.size / 1024)}KB
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGrantConsent}
              disabled={isSubmitting || updateStatusMutation.isPending}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-semibold py-3 rounded-xl mb-4 disabled:opacity-50"
              data-testid="button-grant-consent"
            >
              {isSubmitting || updateStatusMutation.isPending ? "⏳ Recording consent..." : "✓ Yes, I consent"}
            </Button>

            <Button
              onClick={handleDenyConsent}
              disabled={isSubmitting || updateStatusMutation.isPending}
              variant="outline"
              className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl disabled:opacity-50"
              data-testid="button-deny-consent"
            >
              {isSubmitting || updateStatusMutation.isPending ? "⏳ Recording response..." : "✗ No, I don't consent"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Completion
  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full">
        {/* Card Container */}
        <div className="bg-slate-700 rounded-3xl p-8 text-center border border-slate-600">
          {/* Green Checkmark Icon */}
          <div className="w-16 h-16 bg-[#22c55e] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
              <path
                fill="currentColor"
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-4">Consent Recorded</h2>
          
          {/* Subtitle */}
          <p className="text-gray-300 leading-relaxed">
            Your consent has been successfully recorded and verified.
          </p>
        </div>
      </div>
    </div>
  );
};