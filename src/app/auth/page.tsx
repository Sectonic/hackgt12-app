'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useToast } from '@/app/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';

const PAGE_COPY = {
  signIn: {
    title: 'Welcome back',
    description: 'Sign in with your credentials to access your floor plans.',
    cta: 'Sign in',
    togglePrompt: "Don't have an account?",
    toggleCta: 'Create one',
  },
  signUp: {
    title: 'Create your account',
    description: 'Sign up to start designing with the LayOut editor.',
    cta: 'Sign up',
    togglePrompt: 'Already have an account?',
    toggleCta: 'Sign in',
  },
} as const;

type FormMode = keyof typeof PAGE_COPY;

export default function AuthPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const initialMode = (searchParams?.get('mode') === 'signup' ? 'signUp' : 'signIn') as FormMode;
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/plans');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!searchParams) return;
    const param = searchParams.get('mode');
    if (param === 'signup') {
      setMode('signUp');
    } else if (param === 'signin') {
      setMode('signIn');
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Signed in', description: 'Welcome back to LayOut.' });
        router.replace('/plans');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({
          title: 'Confirmation email sent',
          description: 'Check your inbox to confirm your account before signing in.',
        });
        setMode('signIn');
      }
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Unexpected error occurred.';
      toast({ title: 'Authentication failed', description, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const copy = PAGE_COPY[mode];
  const oppositeMode = mode === 'signIn' ? 'signUp' : 'signIn';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md border-border/70">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">{copy.title}</CardTitle>
          <CardDescription className="text-muted-foreground">{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                copy.cta
              )}
            </Button>
          </form>
          <div className="mt-6 flex flex-col gap-3 text-center text-sm text-muted-foreground">
            <div>
              {copy.togglePrompt}{' '}
              <button
                type="button"
                onClick={() => setMode(oppositeMode)}
                className="font-semibold text-primary hover:underline"
                disabled={submitting}
              >
                {PAGE_COPY[oppositeMode].toggleCta}
              </button>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
