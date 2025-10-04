import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="bg-slate-800 border-slate-700 p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="h-16 w-16 text-orange-500" data-testid="icon-cancelled" />
          <h2 className="text-2xl font-bold text-white">Payment Cancelled</h2>
          <p className="text-gray-400">
            Your payment was cancelled. No charges were made to your account.
          </p>
          <p className="text-gray-500 text-sm">
            You can try again anytime or contact support if you need assistance.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setLocation('/subscribe')}
              className="bg-[#4ade80] hover:bg-[#22c55e] text-white"
              data-testid="button-back-to-plans"
            >
              Back to Plans
            </Button>
            <Button
              onClick={() => setLocation('/dashboard')}
              variant="outline"
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              data-testid="button-dashboard"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
