import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Subscribe() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSelectPlan = async (plan: 'monthly' | 'annual') => {
    setSelectedPlan(plan);
    setIsProcessing(true);
    
    try {
      const res = await apiRequest("POST", "/api/stripe/create-subscription", { plan });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create checkout session');
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

      // Redirect to Stripe Checkout
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
      console.error('Checkout failed:', error);
      setIsProcessing(false);
      setSelectedPlan(null);
      
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#4ade80]" />
          <p className="text-gray-400" data-testid="text-redirect-message">
            Redirecting to secure checkout...
          </p>
          <p className="text-gray-500 text-sm">
            {selectedPlan === 'monthly' ? 'Monthly Plan - $40/month' : 'Annual Plan - $400/year'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-300">
            Select the plan that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Monthly Plan */}
          <Card className="bg-slate-800 border-slate-700 p-8 hover:border-[#4ade80] transition">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Monthly</h3>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-5xl font-bold text-white">$40</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">Unlimited consent sessions</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">AI-powered speech verification</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">Secure encrypted storage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">Cancel anytime</span>
              </li>
            </ul>

            <Button 
              onClick={() => handleSelectPlan('monthly')}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-6 text-lg"
              data-testid="button-select-monthly"
            >
              Select Monthly Plan
            </Button>
          </Card>

          {/* Annual Plan */}
          <Card className="bg-gradient-to-br from-[#4ade80]/20 to-slate-800 border-2 border-[#4ade80] p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#4ade80] text-white px-4 py-1 rounded-full text-sm font-semibold">
              Save $80/year
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Annual</h3>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-5xl font-bold text-white">$400</span>
                <span className="text-gray-400">/year</span>
              </div>
              <p className="text-sm text-gray-400">Just $33.33/month</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">Everything in Monthly</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">2 months free ($80 savings)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">Priority support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">Best value for money</span>
              </li>
            </ul>

            <Button 
              onClick={() => handleSelectPlan('annual')}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-6 text-lg"
              data-testid="button-select-annual"
            >
              Select Annual Plan
            </Button>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            🔒 Secure payment processing by Stripe • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
