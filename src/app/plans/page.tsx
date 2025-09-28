'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Clock, FileText, Loader2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useToast } from '@/app/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import { useCedarStore } from 'cedar-os';
import { createInitialPlanSnapshot } from '@/app/plans/[planId]/types';

const EMPTY_STATE = {
  title: 'No plans yet',
  description: 'Create your first floor plan to get started.',
  cta: 'Create plan',
};

const SHARED_EMPTY_STATE = {
  title: 'Nothing shared with you',
  description: 'Plans shared with you will appear here.',
};

type Plan = Database['public']['Tables']['plans']['Row'];

type TabValue = 'my' | 'shared';

export default function PlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') === 'shared' ? 'shared' : 'my') as TabValue;

  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const setShowChat = useCedarStore((state) => state.setShowChat);

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [sharedPlans, setSharedPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const handleCreatePlan = useCallback(async () => {
    if (creatingPlan) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    setShowChat(true);
    setCreatingPlan(true);

    try {
      const now = new Date().toISOString();
      const { data: planRecord, error: planError } = await supabase
        .from('plans')
        .insert({
          owner_id: user.id,
          title: 'Untitled plan',
          updated_at: now,
        })
        .select('id')
        .single();

      if (planError) throw planError;
      if (!planRecord) throw new Error('Plan could not be created.');

      const initialSnapshot = createInitialPlanSnapshot();
      const { error: revisionError } = await supabase
        .from('plan_revisions')
        .insert({
          plan_id: planRecord.id,
          user_id: user.id,
          snapshot: initialSnapshot as Json,
        });

      if (revisionError) throw revisionError;

      router.push(`/plans/${planRecord.id}`);
    } catch (creationError) {
      const message =
        creationError instanceof Error ? creationError.message : 'Unable to create a new plan.';
      toast({
        variant: 'destructive',
        title: 'Could not create plan',
        description: message,
      });
    }
    setCreatingPlan(false);
  }, [creatingPlan, router, setShowChat, toast, user]);

  const fetchPlans = useCallback(async () => {
    if (!user) return;

    setPlansLoading(true);
    setPlansError(null);

    try {
      const { data: ownPlans, error: ownError } = await supabase
        .from('plans')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (ownError) throw ownError;
      setMyPlans(ownPlans ?? []);

      const { data: membershipRows, error: membershipError } = await supabase
        .from('plan_members')
        .select('plan_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const sharedIds = (membershipRows ?? [])
        .map((membership) => membership.plan_id)
        .filter((planId) => planId);

      if (sharedIds.length === 0) {
        setSharedPlans([]);
        return;
      }

      const ownerIds = new Set((ownPlans ?? []).map((plan) => plan.id));
      const idsToFetch = sharedIds.filter((planId) => !ownerIds.has(planId));

      if (idsToFetch.length === 0) {
        setSharedPlans([]);
        return;
      }

      const { data: sharedPlansData, error: sharedError } = await supabase
        .from('plans')
        .select('*')
        .in('id', idsToFetch)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (sharedError) throw sharedError;
      setSharedPlans(sharedPlansData ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load plans.';
      setPlansError(message);
      toast({
        variant: 'destructive',
        title: 'Could not fetch plans',
        description: message,
      });
    } finally {
      setPlansLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/auth');
      return;
    }

    fetchPlans();
  }, [authLoading, fetchPlans, router, user]);

  useEffect(() => {
    if (!searchParams) return;
    const tab = searchParams.get('tab');
    if (tab === 'shared') {
      setActiveTab('shared');
    }
  }, [searchParams]);

  const activePlans = useMemo(() => (activeTab === 'shared' ? sharedPlans : myPlans), [activeTab, myPlans, sharedPlans]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-b-transparent border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Floor plans</h1>
            <p className="text-sm text-muted-foreground">Keep track of your projects and shared workspaces.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchPlans}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary"
              disabled={plansLoading}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleCreatePlan}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={creatingPlan}
            >
              {creatingPlan ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {creatingPlan ? 'Creating…' : 'New plan'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/95 p-6 shadow-sm">
          <div className="flex w-full gap-2 rounded-xl bg-muted/60 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`flex-1 rounded-lg px-4 py-2 transition ${
                activeTab === 'my' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              My plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shared')}
              className={`flex-1 rounded-lg px-4 py-2 transition ${
                activeTab === 'shared' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              Shared with me
            </button>
          </div>

          <section className="mt-8">
            {plansLoading ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-48 animate-pulse rounded-2xl border border-border bg-muted/40"
                  />
                ))}
              </div>
            ) : plansError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
                {plansError}
              </div>
            ) : activePlans.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activePlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/plans/${plan.id}`}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-background p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
                          {plan.title}
                        </h3>
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Updated{' '}
                            {plan.updated_at
                              ? formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })
                              : 'just now'}
                          </span>
                        </p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-sm font-medium text-muted-foreground">
                      <span>{activeTab === 'shared' ? 'Shared' : 'Owner'}</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : activeTab === 'shared' ? (
              <EmptyState {...SHARED_EMPTY_STATE} />
            ) : (
              <EmptyState {...EMPTY_STATE} onCta={handleCreatePlan} ctaDisabled={creatingPlan} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  cta?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
};

function EmptyState({ title, description, cta, onCta, ctaDisabled }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {cta ? (
        <button
          type="button"
          onClick={onCta}
          disabled={ctaDisabled}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Plus className="h-4 w-4" />
          {cta}
        </button>
      ) : null}
    </div>
  );
}
