import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface WhatsAppAuthProps {
  onBack: () => void;
}

export const WhatsAppAuth = ({ onBack }: WhatsAppAuthProps) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate OTP and store in database
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { error: dbError } = await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone_number: phoneNumber,
          otp_code: otpCode,
          otp_expires_at: expiresAt.toISOString(),
          is_verified: false,
        });

      if (dbError) throw dbError;

      // Send OTP via WhatsApp API (implement based on your chosen provider)
      await sendWhatsAppOTP(phoneNumber, otpCode);

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Verify OTP
      const { data: session, error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('otp_code', otp)
        .gt('otp_expires_at', new Date().toISOString())
        .single();

      if (sessionError || !session) {
        throw new Error('Invalid or expired OTP');
      }

      // Check if user exists with this phone number
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (existingProfile) {
        // Sign in existing user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: existingProfile.email,
          password: 'whatsapp-auth', // You might want to implement a different auth flow
        });

        if (signInError) throw signInError;
      } else {
        // Create new user account
        const tempEmail = `${phoneNumber.replace('+', '')}@whatsapp.temp`;
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: 'whatsapp-auth-' + Math.random().toString(36),
          options: {
            data: {
              full_name: `WhatsApp User ${phoneNumber}`,
              whatsapp_number: phoneNumber,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Update the whatsapp session with user_id
        if (authData.user) {
          await supabase
            .from('whatsapp_sessions')
            .update({
              user_id: authData.user.id,
              is_verified: true,
            })
            .eq('phone_number', phoneNumber);
        }
      }

      // Mark session as verified
      await supabase
        .from('whatsapp_sessions')
        .update({ is_verified: true })
        .eq('phone_number', phoneNumber);

    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppOTP = async (phoneNumber: string, otpCode: string) => {
    // This is a placeholder for WhatsApp API integration
    // You would implement this based on your chosen provider (Twilio, WhatsApp Business API, etc.)
    
    const message = `Your Multimedia Editor verification code is: ${otpCode}. This code expires in 10 minutes.`;
    
    // Example implementation with Twilio (you'd need to set up the backend endpoint)
    try {
      const response = await fetch('/api/send-whatsapp-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp message');
      }
    } catch (error) {
      // For demo purposes, we'll just log the OTP
      console.log(`WhatsApp OTP for ${phoneNumber}: ${otpCode}`);
      // In production, remove this and implement proper WhatsApp API integration
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-xl">WhatsApp Login</CardTitle>
              <CardDescription>
                {step === 'phone' 
                  ? 'Enter your WhatsApp number to receive an OTP'
                  : 'Enter the OTP sent to your WhatsApp'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={sendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send OTP
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Check your WhatsApp for the verification code
                </p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep('phone')}
              >
                Change Number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};