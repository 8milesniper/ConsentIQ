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
import type { ConsentSession as ConsentSessionType } from "@shared/schema";

const consentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  isOver18: z.literal(true, { errorMap: () => ({ message: "You must be over 18 to continue" }) }),
});

type ConsentFormData = z.infer<typeof consentFormSchema>;

export const ConsentForm = (): JSX.Element => {
  const { qrCodeId } = useParams<{ qrCodeId?: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [session, setSession] = useState<ConsentSessionType | null>(null);
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
      phone: "",
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
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              {/* Profile avatar placeholder */}
              <div className="w-16 h-16 bg-gray-400 rounded-full bg-cover bg-center"></div>
            </div>
            <h2 className="text-xl font-semibold mb-2">You have received a consent request</h2>
            <div className="inline-block bg-[#4ade80] text-white px-4 py-2 rounded-full font-medium">
              ConsentIQ User
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

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel>A friend's phone number (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1 415 345 678" 
                          className="border-0 border-b border-gray-300 rounded-none bg-transparent focus:border-[#4ade80] focus-visible:ring-0"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500 mt-1">
                        We'll ask if you'd like someone you trust to check up on you.
                      </p>
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
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 text-white">
          <button 
            onClick={() => setCurrentStep(0)}
            className="w-10 h-10 border border-white rounded-full flex items-center justify-center"
            data-testid="button-back-to-form"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">Video Consent</h1>
          <div className="text-sm">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div>
        </div>

        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden">
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
        </div>

        {/* Controls */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-white text-xl font-semibold mb-2">Record Your Consent</h2>
            <p className="text-gray-300 text-sm">
              Please record a clear video stating your consent decision
            </p>
          </div>

          <div className="flex justify-center">
            {!isRecording ? (
              <div className="text-center">
                <Button
                  onClick={startRecording}
                  className="w-24 h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center mb-2"
                  data-testid="button-start-recording"
                >
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </Button>
                <p className="text-white text-sm font-medium">Tap to Record</p>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  onClick={stopRecording}
                  className="w-24 h-24 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center animate-pulse mb-2 ring-4 ring-red-300"
                  data-testid="button-stop-recording"
                >
                  <div className="w-8 h-8 bg-white"></div>
                </Button>
                <p className="text-red-400 text-sm font-bold animate-pulse">🔴 RECORDING - Tap to Stop</p>
              </div>
            )}
          </div>
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 ${
          session?.consentStatus === "granted" ? "bg-green-500" : "bg-red-500"
        }`}>
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-white">
            {session?.consentStatus === "granted" ? (
              <path
                fill="currentColor"
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              />
            ) : (
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            )}
          </svg>
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {session?.consentStatus === "granted" ? "Consent Granted" : "Response Recorded"}
        </h2>
        
        <p className="text-gray-600 mb-4">
          Your response has been recorded and sent securely.
        </p>
        
        {session && (
          <div className="bg-gray-50 p-4 rounded-lg mb-8 text-sm text-left">
            <p><strong>Session:</strong> {session.id.slice(0, 8)}...</p>
            <p><strong>Status:</strong> {session.consentStatus}</p>
            <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          <p>This window can now be closed.</p>
        </div>
      </div>
    </div>
  );
};