import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// Google SVG icon
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('✓ Vérifiez votre e-mail pour confirmer votre inscription.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la connexion avec Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="text-3xl">✝</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-primary">Évangile Vécu</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Diocèse Oran</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-6 space-y-5">
            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 h-11 font-medium"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continuer avec Google
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">ou</span>
              <Separator className="flex-1" />
            </div>

            {/* Tab switch */}
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
              <Button type="submit" className="w-full h-11" disabled={loading || googleLoading}>
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
