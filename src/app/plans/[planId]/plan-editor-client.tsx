'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Plan = Database['public']['Tables']['plans']['Row'];

interface PlanEditorClientProps {
  planId: string;
  editor: ReactNode;
}

export default function PlanEditorClient({ planId, editor }: PlanEditorClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/auth');
      return;
    }

    let isActive = true;

    const verifyAccess = async () => {
      try {
        const { data: planRecord, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .maybeSingle();

        if (planError) throw planError;

        if (!planRecord) {
          if (!isActive) return;
          setError('This plan no longer exists.');
          return;
        }

        if (planRecord.owner_id !== user.id) {
          const { error: joinError } = await supabase
            .from('plan_members')
            .upsert(
              {
                plan_id: planId,
                user_id: user.id,
                role: 'editor',
              },
              {
                onConflict: 'plan_id,user_id',
                ignoreDuplicates: true,
              },
            );

          if (joinError) throw joinError;
        }

        if (!isActive) return;
        setPlan(planRecord);
      } catch (accessError) {
        if (!isActive) return;
        setError(accessError instanceof Error ? accessError.message : 'Unable to load this plan.');
      } finally {
        if (isActive) {
          setCheckingAccess(false);
        }
      }
    };

    verifyAccess();

    return () => {
      isActive = false;
    };
  }, [authLoading, planId, router, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (checkingAccess) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Loading plan workspace…</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-foreground">Unable to open plan</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {error ?? 'We could not load this plan. It may have been archived or deleted.'}
        </p>
        <Link
          href="/plans"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </Link>
      </div>
    );
  }

  return <>{editor}</>;
}
