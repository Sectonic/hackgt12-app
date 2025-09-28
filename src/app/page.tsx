'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Clock,
  FileText,
  FolderOpen,
  Layers,
  Plus,
  Users,
  Zap,
} from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

import type { User } from '@supabase/supabase-js';

const FEATURE_CARDS = [
  {
    icon: Layers,
    title: 'Precision Drawing',
    description: 'Professional CAD-like tools with grid snapping and constraints for accurate architectural drawings.',
  },
  {
    icon: Zap,
    title: 'AI Assistant',
    description: 'Intelligent design suggestions with natural language commands and automated layout generation.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Real-time collaboration with secure sharing and role-based permissions for your team.',
  },
] as const;

type Plan = Database['public']['Tables']['plans']['Row'];

type RecentPlanState = {
  plans: Plan[];
  loading: boolean;
};

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [{ plans: recentPlans, loading }, setRecentPlans] = useState<RecentPlanState>({ plans: [], loading: true });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRecentPlans({ plans: [], loading: false });
      return;
    }

    let isMounted = true;

    const fetchRecentPlans = async () => {
      setRecentPlans((prev) => ({ ...prev, loading: true }));

      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .or(`owner_id.eq.${user.id},id.in.(SELECT plan_id FROM plan_members WHERE user_id = '${user.id}')`)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (isMounted) {
          setRecentPlans({ plans: data ?? [], loading: false });
        }
      } catch (error) {
        console.error('Error fetching recent plans:', error);
        if (isMounted) {
          setRecentPlans({ plans: [], loading: false });
        }
      }
    };

    fetchRecentPlans();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-b-transparent border-primary" />
      </div>
    );
  }

  if (!user) {
    return <MarketingLanding />;
  }

  return <Dashboard user={user} loading={loading} recentPlans={recentPlans} />;
}

function MarketingLanding() {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center">
        <div className="space-y-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="relative">
              <Layers className="h-20 w-20 text-primary drop-shadow-lg" />
              <div className="absolute -inset-2 rounded-full bg-primary/5 blur-xl" />
            </div>
            <h1 className="text-7xl font-bold tracking-tight text-foreground">LayOut</h1>
          </div>
          <p className="max-w-3xl text-2xl leading-relaxed text-muted-foreground">
            Professional floor plan editor with AI-powered design assistance. Create, collaborate, and share architectural layouts with precision.
          </p>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURE_CARDS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="feature-card">
              <CardHeader className="pb-4 text-center">
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="blueprint-grid absolute inset-0" />
                  <Icon className="relative z-10 h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
            <Link href="/auth" className="flex items-center gap-2">
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  user: User;
  recentPlans: Plan[];
  loading: boolean;
}

function Dashboard({ user, recentPlans, loading }: DashboardProps) {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col space-y-8">
        <div className="grid gap-8 md:grid-cols-3">
          <QuickActionCard
            href="/plans"
            icon={Plus}
            title="Create New Plan"
            description="Start a fresh architectural project"
          />
          <QuickActionCard
            href="/plans"
            icon={FolderOpen}
            title="Browse Plans"
            description="View all your design projects"
          />
          <QuickActionCard
            href="/plans?tab=shared"
            icon={Users}
            title="Shared with Me"
            description="Collaborative team projects"
          />
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Recent Plans</h2>
            <Button variant="ghost" asChild>
              <Link href="/plans" className="flex items-center space-x-2">
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentPlans.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentPlans.map((plan) => (
                <Card key={plan.id} className="wall-card group cursor-pointer">
                  <Link href={`/plans/${plan.id}/editor`} className="block">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary">
                            {plan.title}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              Updated{' '}
                              {plan.updated_at
                                ? formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })
                                : 'Never'}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={plan.owner_id === user.id ? 'default' : 'secondary'} className="shadow-sm">
                          {plan.owner_id === user.id ? 'Owner' : 'Shared'}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <CardContent>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium">No plans yet</h3>
                <p className="mb-4 text-muted-foreground">Create your first floor plan to get started</p>
                <Button asChild>
                  <Link href="/plans">Create Plan</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

function QuickActionCard({ href, icon: Icon, title, description }: QuickActionCardProps) {
  return (
    <Card className="wall-card group cursor-pointer">
      <Link href={href} className="block p-6">
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="mb-1 text-xl font-semibold transition-colors group-hover:text-primary">
              {title}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          </div>
        </div>
      </Link>
    </Card>
  );
}
