import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          setStatus('error');
          setErrorMessage('No payment session found');
          return;
        }

        const res = await apiRequest('POST', '/api/stripe/verify-payment', { sessionId });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Payment verification failed');
        }

        const data = await res.json();
        
        if (data.subscriptionStatus === 'active') {
          setStatus('success');
          queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
          
          setTimeout(() => {
            setLocation('/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setErrorMessage('Subscription not active yet. Please wait a moment and try again.');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Failed to verify payment');
      }
    };

    verifyPayment();
  }, [setLocation]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <Card className="bg-slate-800 border-slate-700 p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#4ade80]" data-testid="loader-verifying" />
            <h2 className="text-2xl font-bold text-white">Verifying Payment...</h2>
            <p className="text-gray-400">
              Please wait while we confirm your subscription
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <Card className="bg-slate-800 border-slate-700 p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-[#4ade80]" data-testid="icon-success" />
            <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
            <p className="text-gray-400">
              Your subscription is now active. Redirecting to your dashboard...
            </p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mt-4">
              <div className="bg-[#4ade80] h-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="bg-slate-800 border-slate-700 p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-16 w-16 text-red-500" data-testid="icon-error" />
          <h2 className="text-2xl font-bold text-white">Verification Issue</h2>
          <p className="text-gray-400" data-testid="text-error-message">
            {errorMessage}
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              data-testid="button-retry"
            >
              Try Again
            </Button>
            <Button
              onClick={() => setLocation('/subscribe')}
              className="bg-[#4ade80] hover:bg-[#22c55e] text-white"
              data-testid="button-back-subscribe"
            >
              Back to Plans
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
