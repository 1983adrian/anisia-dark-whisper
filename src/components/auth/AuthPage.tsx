import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import anisiaAvatar from '@/assets/anisia-avatar.png';

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Introdu adresa de email');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email de resetare trimis! Verifică inbox-ul.');
        setMode('login');
      }
      return;
    }

    if (!password) {
      toast.error('Introdu parola');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      toast.error('Parola trebuie să aibă minim 6 caractere');
      return;
    }

    setLoading(true);
    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email sau parolă incorectă. Încearcă din nou sau resetează parola.');
      } else {
        toast.error(error.message);
      }
    } else if (mode === 'register') {
      toast.success('Cont creat cu succes! Te-am logat automat.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden anisia-glow">
              <img src={anisiaAvatar} alt="Ira" className="w-full h-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            Ira <Sparkles className="h-5 w-5 text-primary" />
          </CardTitle>
          <CardDescription>
            {mode === 'login' && 'Conectează-te pentru a continua'}
            {mode === 'register' && 'Creează un cont nou'}
            {mode === 'forgot' && 'Resetează-ți parola'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@exemplu.com"
                className="bg-input border-border"
                disabled={loading}
              />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-input border-border"
                  disabled={loading}
                />
              </div>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'login' && 'Conectează-te'}
              {mode === 'register' && 'Creează cont'}
              {mode === 'forgot' && 'Trimite email de resetare'}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary hover:underline block w-full"
                >
                  Ai uitat parola?
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Nu ai cont? Înregistrează-te
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Ai deja cont? Conectează-te
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Înapoi la login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
