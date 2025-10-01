import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Subscribe() {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get plan from URL params
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    if (planParam === 'annual') {
      setPlan('annual');
    }

    const initCheckout = async () => {
      setIsRedirecting(true);
      
      try {
        const res = await apiRequest("POST", "/api/stripe/create-subscription", { 
          plan: planParam || 'monthly' 
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'API request failed');
        }

        const data = await res.json();

        // If already active, redirect to dashboard
        if (data.status === 'active') {
          toast({
            title: "Already Subscribed",
            description: "You already have an active subscription!",
          });
          setLocation('/dashboard');
          return;
        }

        // Get sessionId and redirect to Stripe Checkout
        if (data.sessionId) {
          const stripe = await stripePromise;
          if (!stripe) {
            throw new Error('Failed to load Stripe');
          }

          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });

          if (error) {
            throw error;
          }
        } else {
          throw new Error('No session ID received');
        }
      } catch (error: any) {
        console.error('Checkout initialization failed:', error);
        setIsRedirecting(false);
        
        toast({
          title: "Error",
          description: error.message || "Failed to initialize checkout. Please try again.",
          variant: "destructive",
        });
      }
    };

    initCheckout();
  }, [toast, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#4ade80]" />
        <p className="text-gray-400" data-testid="text-redirect-message">
          {isRedirecting 
            ? 'Redirecting to secure checkout...' 
            : 'Setting up your subscription...'}
        </p>
        <p className="text-gray-500 text-sm">
          {plan === 'monthly' ? 'Monthly Plan - $40/month' : 'Annual Plan - $400/year'}
        </p>
      </div>
    </div>
  );
}
