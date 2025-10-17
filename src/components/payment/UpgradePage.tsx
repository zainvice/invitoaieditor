import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  CreditCard, 
  Loader2, 
  ArrowLeft,
  Zap,
  Infinity,
  Shield,
  MessageCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabaseClient';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const UpgradePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: import.meta.env.VITE_PREMIUM_PRICE || 999, // $9.99
          currency: 'usd',
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = await response.json();

      // Store payment record
      await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          stripe_payment_intent_id: paymentIntentId,
          amount: import.meta.env.VITE_PREMIUM_PRICE || 999,
          currency: 'usd',
          status: 'pending',
          credits_added: 0,
        });

      // Redirect to Stripe Checkout or use Elements
      const result = await stripe.confirmCardPayment(clientSecret);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Payment successful - update user to premium
      await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user.id);

      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'succeeded' })
        .eq('stripe_payment_intent_id', paymentIntentId);

      // Send WhatsApp notification
      await sendWhatsAppNotification(user.whatsapp_number, 'upgrade_success');

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (phoneNumber: string | undefined, type: string) => {
    if (!phoneNumber) return;

    try {
      await fetch('/api/send-whatsapp-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          type: type,
          data: {
            userName: user?.full_name || 'User',
          },
        }),
      });
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
    }
  };

  if (user?.is_premium) {
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're already Premium!</h2>
            <p className="text-muted-foreground mb-6">
              You have unlimited access to all features.
            </p>
            <Link to="/dashboard">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingExports = Math.max(0, (import.meta.env.VITE_MAX_FREE_EXPORTS || 3) - (user?.usage_count || 0));

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Upgrade to Premium</h1>
        <p className="text-xl text-muted-foreground">
          Unlock unlimited exports and premium features
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Free Plan</CardTitle>
              <Badge variant="secondary">Current</Badge>
            </div>
            <CardDescription>
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/forever</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>3 free exports</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Video & PDF editing</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Text annotations</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Basic support</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                You have <strong>{remainingExports}</strong> exports remaining
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="relative border-2 border-blue-500">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white">Most Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              Premium Plan
              <Zap className="h-6 w-6 text-yellow-500 ml-2" />
            </CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">$9.99</span>
              <span className="text-muted-foreground">/one-time</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Infinity className="h-5 w-5 text-blue-500 mr-3" />
                <span><strong>Unlimited exports</strong></span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Video & PDF editing</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Advanced text styling</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Higher quality exports</span>
              </div>
              <div className="flex items-center">
                <MessageCircle className="h-5 w-5 text-blue-500 mr-3" />
                <span>WhatsApp notifications</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-500 mr-3" />
                <span>Priority support</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Why Upgrade?</CardTitle>
          <CardDescription>
            See what you get with Premium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Infinity className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Unlimited Exports</h3>
              <p className="text-sm text-muted-foreground">
                Export as many videos and PDFs as you need without any limits
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">WhatsApp Integration</h3>
              <p className="text-sm text-muted-foreground">
                Get notifications and payment links directly on WhatsApp
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Get help faster with dedicated premium support
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};