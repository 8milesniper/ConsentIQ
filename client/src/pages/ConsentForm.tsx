import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const consentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"),
  isOver18: z.literal(true, { errorMap: () => ({ message: "You must be over 18 to continue" }) }),
});

type ConsentFormData = z.infer<typeof consentFormSchema>;

interface ConsentFormProps {
  qrCodeId?: string;
}

const ConsentFormComponent = ({ qrCodeId }: ConsentFormProps): JSX.Element => {
  const [step, setStep] = useState<"form" | "recording" | "safety">("form");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const [, setLocation] = useLocation();

  const form = useForm<ConsentFormData>({
    resolver: zodResolver(consentFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      isOver18: false as any, // Will be true when checked
    },
  });

  // Initialize camera when moving to recording step
  useEffect(() => {
    if (step === "recording" && !showPreview) {
      initializeCamera();
    }
    return () => {
      // Cleanup camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 720, height: 480 }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      // Fallback: show error message or redirect
    }
  };

  const startRecording = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setShowPreview(true);
        
        // Stop camera stream
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitConsent = () => {
    // In production, upload video and create session
    // For demo, just redirect with consent granted
    window.parent.postMessage({ type: 'CONSENT_GRANTED', videoUrl: recordedVideoUrl }, '*');
  };

  const denyConsent = () => {
    setStep("safety");
  };

  const handleEmergency = (action: string) => {
    // Handle emergency actions - text friend, call friend, emergency call
    console.log(`Emergency action: ${action}`);
    window.parent.postMessage({ type: 'CONSENT_DENIED', reason: 'emergency' }, '*');
  };

  const onSubmit = (data: ConsentFormData) => {
    console.log("Form data:", data);
    setStep("recording");
  };

  // Step 1: Form
  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#4ade80] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 text-white">
          <button 
            onClick={() => setLocation("/")}
            className="w-10 h-10 border border-white rounded-full flex items-center justify-center"
            data-testid="button-back"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">Form</h1>
          <div className="w-10 h-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-t-3xl p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              {/* Profile avatar placeholder */}
              <div className="w-16 h-16 bg-gray-400 rounded-full bg-cover bg-center" 
                   style={{backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"35\" r=\"20\" fill=\"%23666\"/><path d=\"M20 80 Q20 60 50 60 Q80 60 80 80\" fill=\"%23666\"/></svg>')"}}></div>
            </div>
            <h2 className="text-xl font-semibold mb-2">You have received a consent request from</h2>
            <div className="inline-block bg-[#4ade80] text-white px-4 py-2 rounded-full font-medium">
              Rob
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
                          placeholder="Sophie" 
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
                          placeholder="+61 415 345 678" 
                          className="border-0 border-b border-gray-300 rounded-none bg-transparent focus:border-[#4ade80] focus-visible:ring-0"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500 mt-1">
                        We'll ask you whether you'd like to get someone you trust to check up on you.
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
                          : "border-gray-300"
                      }`}
                      onClick={() => form.setValue("isOver18", false as any)}
                      data-testid="button-no-age"
                    >
                      No
                    </Button>
                    <Button
                      type="button"
                      variant={form.watch("isOver18") ? "default" : "outline"}
                      className={`w-16 h-12 rounded-full ${
                        form.watch("isOver18") 
                          ? "bg-[#4ade80] text-white" 
                          : "border-gray-300"
                      }`}
                      onClick={() => form.setValue("isOver18", true)}
                      data-testid="button-yes-age"
                    >
                      Yes
                    </Button>
                  </div>
                </div>
                
                {form.formState.errors.isOver18 && (
                  <p className="text-red-500 text-sm mt-2">{form.formState.errors.isOver18.message}</p>
                )}
              </div>

              <Button 
                type="submit"
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-4 rounded-full text-lg"
                data-testid="button-continue"
              >
                Continue →
              </Button>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  // Step 2: Video Recording
  if (step === "recording") {
    return (
      <div className="min-h-screen bg-[#4ade80] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 text-white">
          <button 
            onClick={() => setStep("form")}
            className="w-10 h-10 border border-white rounded-full flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">Form</h1>
          <div className="w-10 h-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-t-3xl p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Step 1.</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <span>✅ Sophie</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <span>✅ +61 415 345 678</span>  
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
              <span>✅ {'>'}18 y.o</span>
            </div>

            <h3 className="text-lg font-semibold mb-4">Step 2.</h3>
            <p className="text-gray-600 mb-6">Positive consent</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {showPreview ? (
              /* Video Preview */
              <div className="w-full max-w-sm">
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full rounded-2xl mb-6"
                  data-testid="video-preview"
                />
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowPreview(false);
                      setRecordedVideoUrl("");
                      initializeCamera();
                    }}
                    variant="outline"
                    className="flex-1 py-3"
                    data-testid="button-re-record"
                  >
                    Re-record
                  </Button>
                  <Button
                    onClick={submitConsent}
                    className="flex-1 bg-[#4ade80] text-white py-3"
                    data-testid="button-submit-consent"
                  >
                    Submit Consent
                  </Button>
                </div>
              </div>
            ) : (
              /* Recording Interface */
              <div className="w-full max-w-sm">
                <div className="relative bg-black rounded-2xl overflow-hidden mb-6">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-64 object-cover"
                    data-testid="video-camera"
                  />
                  {isRecording && (
                    <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Saying Yes?</h3>
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full ${
                      isRecording ? "bg-red-500" : "bg-[#4ade80]"
                    } text-white flex items-center justify-center mb-4`}
                    data-testid="button-record"
                  >
                    {isRecording ? "⏹" : "🎥"}
                  </Button>
                  <p className="text-gray-600 text-sm">
                    {isRecording 
                      ? "Press and Hold To Record Video..." 
                      : "State your name and your positive consent. This video will be recorded with Rob."
                    }
                  </p>
                </div>

                <Button
                  onClick={denyConsent}
                  variant="outline"
                  className="w-full py-3 text-red-600 border-red-600"
                  data-testid="button-deny-consent"
                >
                  I do not consent
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Safety/Exit Screen
  return (
    <div className="min-h-screen bg-[#4ade80] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 text-white">
        <button 
          onClick={() => setStep("recording")}
          className="w-10 h-10 border border-white rounded-full flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">You've said NO</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl p-6">
        <div className="text-center mb-8">
          <p className="text-gray-600 mb-6">
            You're no longer giving your consent, 
            so you may choose to talk or ask them.
          </p>
          
          <h3 className="text-lg font-semibold mb-6">
            Experiencing some discomfort?
          </h3>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => handleEmergency("text-friend")}
            variant="outline"
            className="w-full flex items-center gap-3 py-4 text-left"
            data-testid="button-text-friend"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              💬
            </div>
            <span>Text a Friend</span>
          </Button>

          <Button
            onClick={() => handleEmergency("call-friend")}
            variant="outline"
            className="w-full flex items-center gap-3 py-4 text-left"
            data-testid="button-call-friend"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              📞
            </div>
            <span>Call a Friend</span>
          </Button>

          <div className="text-center my-6">
            <p className="text-gray-600 mb-4">Are you starting to feel unsafe?</p>
          </div>

          <Button
            onClick={() => handleEmergency("emergency-call")}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 flex items-center justify-center gap-2"
            data-testid="button-emergency"
          >
            <span className="text-2xl">⚠️</span>
            Emergency!
          </Button>
        </div>
      </div>
    </div>
  );
};

// Route wrapper component
export const ConsentForm = (): JSX.Element => {
  const [, params] = useRoute("/consent/form/:qrCodeId?");
  return <ConsentFormComponent qrCodeId={params?.qrCodeId} />;
};