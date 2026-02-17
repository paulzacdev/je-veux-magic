import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Vérifiez votre e-mail pour confirmer votre inscription.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">✝</p>
          <h1 className="font-serif text-3xl font-bold text-primary">Évangile Vécu</h1>
          <p className="text-sm text-muted-foreground mt-1">Diocèse Pierre Claverie</p>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-xl">
              {isLogin ? 'Connexion' : 'Inscription'}
            </CardTitle>
            <CardDescription>
              {isLogin ? 'Accédez à votre espace spirituel' : 'Créez votre compte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  placeholder="Nom affiché"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                />
              )}
              <Input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '...' : isLogin ? 'Se connecter' : 'Créer un compte'}
              </Button>
            </form>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
