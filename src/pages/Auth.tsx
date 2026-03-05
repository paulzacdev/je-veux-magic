import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type AuthStep = 'form' | 'otp';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('form');
  const [otpCode, setOtpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!displayName.trim()) {
          toast.error('Veuillez entrer votre prénom ou nom.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
          },
        });
        if (error) throw error;
        toast.success('Un code de vérification a été envoyé à votre e-mail.');
        setStep('otp');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast.error(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });
      if (error) throw error;
      toast.success('✓ Compte vérifié ! Connexion en cours...');
    } catch (err: any) {
      console.error('OTP error:', err);
      toast.error(err.message || 'Code invalide. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      toast.success('Un nouveau code a été envoyé à votre e-mail.');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de renvoyer le code.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Vérification</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Entrez le code à 6 chiffres envoyé à
            </p>
            <p className="text-sm font-medium text-primary">{email}</p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="pt-6 space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOtp}
                className="w-full h-11"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Vérification...</>
                ) : 'Vérifier mon compte'}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep('form'); setOtpCode(''); }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Retour
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-primary hover:underline"
                >
                  Renvoyer le code
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="text-3xl">✝</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-primary">Évangile Vécu</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Diocèse Oran</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-6 space-y-5">
            <div className="flex rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
                  isLogin ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
                  !isLogin ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                }`}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Prénom / Nom</Label>
                  <Input
                    id="displayName"
                    placeholder="Marie, Pierre..."
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement...</>
                ) : isLogin ? 'Se connecter' : 'Créer mon compte'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Application réservée aux fidèles du Diocèse Oran
        </p>
      </div>
    </div>
  );
}
