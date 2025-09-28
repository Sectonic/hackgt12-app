'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Clock, FileText, Loader2, MoreVertical, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useToast } from '@/app/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import { useCedarStore } from 'cedar-os';
import { createInitialPlanSnapshot } from '@/app/plans/[planId]/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { FloatingCedarChat } from '@/cedar/components/chatComponents/FloatingCedarChat';

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
  const [planPendingDelete, setPlanPendingDelete] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [planPendingRename, setPlanPendingRename] = useState<Plan | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingPlan, setRenamingPlan] = useState(false);

  const handleSharePlan = useCallback(
    async (plan: Plan) => {
      try {
        if (typeof window === 'undefined') {
          throw new Error('Clipboard is unavailable in this environment.');
        }

        const origin = window.location.origin;
        const shareUrl = `${origin}/plans/${plan.id}`;

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.setAttribute('readonly', '');
          textArea.style.position = 'absolute';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          try {
            textArea.select();
            document.execCommand('copy');
          } finally {
            document.body.removeChild(textArea);
          }
        }

        toast({
          title: 'Link copied',
          description: 'Share this link to invite collaborators.',
        });
      } catch (shareError) {
        const message =
          shareError instanceof Error ? shareError.message : 'Unable to copy link to clipboard.';
        toast({
          variant: 'destructive',
          title: 'Could not copy link',
          description: message,
        });
      }
    },
    [toast],
  );

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

  const handleConfirmDelete = useCallback(async () => {
    if (!planPendingDelete) return;

    setDeletingPlan(true);
    const planId = planPendingDelete.id;

    try {
      const { error: revisionError } = await supabase
        .from('plan_revisions')
        .delete()
        .eq('plan_id', planId);

      if (revisionError) throw revisionError;

      const { error: membershipError } = await supabase
        .from('plan_members')
        .delete()
        .eq('plan_id', planId);

      if (membershipError) throw membershipError;

      const { error: planError } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (planError) throw planError;

      toast({
        title: 'Plan deleted',
        description: 'The plan and its revisions were removed successfully.',
      });
      setPlanPendingDelete(null);
      await fetchPlans();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete this plan right now.';
      toast({
        variant: 'destructive',
        title: 'Could not delete plan',
        description: message,
      });
    } finally {
      setDeletingPlan(false);
    }
  }, [fetchPlans, planPendingDelete, toast]);

  const handleConfirmRename = useCallback(async () => {
    if (!planPendingRename) return;

    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      toast({
        variant: 'destructive',
        title: 'Plan name required',
        description: 'Please enter a name before saving.',
      });
      return;
    }

    if (nextTitle === planPendingRename.title) {
      setPlanPendingRename(null);
      setRenameValue('');
      return;
    }

    setRenamingPlan(true);
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('plans')
        .update({ title: nextTitle, updated_at: now })
        .eq('id', planPendingRename.id);

      if (error) throw error;

      setMyPlans((prev) =>
        prev.map((plan) =>
          plan.id === planPendingRename.id ? { ...plan, title: nextTitle, updated_at: now } : plan,
        ),
      );
      setSharedPlans((prev) =>
        prev.map((plan) =>
          plan.id === planPendingRename.id ? { ...plan, title: nextTitle, updated_at: now } : plan,
        ),
      );

      toast({
        title: 'Plan renamed',
        description: 'Your plan name was updated successfully.',
      });

      setPlanPendingRename(null);
      setRenameValue('');
    } catch (renameError) {
      const message =
        renameError instanceof Error ? renameError.message : 'Unable to rename this plan right now.';
      toast({
        variant: 'destructive',
        title: 'Could not rename plan',
        description: message,
      });
    } finally {
      setRenamingPlan(false);
    }
  }, [planPendingRename, renameValue, setMyPlans, setSharedPlans, toast]);

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
  const renameTrimmed = renameValue.trim();
  const renameDisabled =
    !planPendingRename ||
    renamingPlan ||
    renameTrimmed.length === 0 ||
    renameTrimmed === planPendingRename.title;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-b-transparent border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <FloatingCedarChat
        side="right"
        title="Cedar Chat"
        collapsedLabel="How can I help you today?"
        dimensions={{
          width: 500,
          height: 700,
        }}
      />
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
              className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary"
              disabled={plansLoading}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleCreatePlan}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
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
              className={`cursor-pointer flex-1 rounded-lg px-4 py-2 transition ${
                activeTab === 'my' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              My plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shared')}
              className={`cursor-pointer flex-1 rounded-lg px-4 py-2 transition ${
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
                    className="h-[260px] animate-pulse rounded-2xl border border-border bg-muted/40"
                  />
                ))}
              </div>
            ) : plansError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
                {plansError}
              </div>
            ) : activePlans.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activePlans.map((plan) => {
                  const isOwner = plan.owner_id === user.id;

                  return (
                    <div key={plan.id} className="group relative h-full">
                      <Link
                        href={`/plans/${plan.id}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div
                          className={`relative aspect-video w-full overflow-hidden ${
                            plan.image_url ? 'bg-muted' : 'grid-background bg-white'
                          }`}
                        >
                          {plan.image_url ? (
                            <Image
                              src={plan.image_url}
                              alt={`${plan.title} preview`}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="object-cover transition duration-300 group-hover:scale-[1.02]"
                              priority
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                          <div>
                            <h3 className="text-base font-semibold text-foreground transition group-hover:text-primary">
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
                          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>{activeTab === 'shared' ? 'Shared' : 'Owner'}</span>
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-primary" />
                          </div>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Plan options"
                            className="absolute right-4 top-4 z-10 rounded-full border border-transparent bg-background/80 p-1.5 text-muted-foreground backdrop-blur transition hover:border-border hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 p-1">
                          {isOwner ? (
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                setPlanPendingRename(plan);
                                setRenameValue(plan.title ?? '');
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit name
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              void handleSharePlan(plan);
                            }}
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share link
                          </DropdownMenuItem>
                          {isOwner ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(event) => {
                                event.preventDefault();
                                setPlanPendingDelete(plan);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete plan
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            ) : activeTab === 'shared' ? (
              <EmptyState {...SHARED_EMPTY_STATE} />
            ) : (
              <EmptyState {...EMPTY_STATE} onCta={handleCreatePlan} ctaDisabled={creatingPlan} />
            )}
          </section>
        </div>
      </div>
      <AlertDialog
        open={Boolean(planPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingPlan) {
            setPlanPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {planPendingDelete
                ? `Deleting ${planPendingDelete.title} will also remove all revisions. This action cannot be undone.`
                : 'Deleting this plan will also remove all revisions. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPlan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 focus:ring-destructive/40"
              disabled={deletingPlan}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deletingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deletingPlan ? 'Deleting…' : 'Delete plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(planPendingRename)}
        onOpenChange={(open) => {
          if (!open && !renamingPlan) {
            setPlanPendingRename(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit plan name</DialogTitle>
            <DialogDescription>Keep your plans organized with a clear name.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmRename();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder="Enter plan name"
                autoFocus
                disabled={renamingPlan}
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  if (renamingPlan) return;
                  setPlanPendingRename(null);
                  setRenameValue('');
                }}
                className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                disabled={renamingPlan}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={renameDisabled}
              >
                {renamingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Edit
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
