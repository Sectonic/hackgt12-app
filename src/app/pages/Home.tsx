import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { supabase } from '@/app/integrations/supabase/client';
import { Layers, Plus, FolderOpen, Users, Zap, ArrowRight, FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { User } from '@supabase/supabase-js';

interface HomeProps {
  user: User | null;
}

// Database-compatible Plan type
type DatabasePlan = {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  is_archived: boolean | null;
  owner_id: string;
};

export default function Home({ user }: HomeProps) {
  const [recentPlans, setRecentPlans] = useState<DatabasePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentPlans = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .or(
            `owner_id.eq.${user.id},id.in.(${
              // Subquery to get plans where user is a member
              `SELECT plan_id FROM plan_members WHERE user_id = '${user.id}'`
            })`,
          )
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setRecentPlans(data || []);
      } catch (error) {
        console.error('Error fetching recent plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPlans();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-16">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-4">
              <div className="relative">
                <Layers className="h-20 w-20 text-primary drop-shadow-lg" />
                <div className="absolute -inset-2 bg-primary/5 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-7xl font-bold text-foreground tracking-tight">LayOut</h1>
            </div>
            <p className="text-2xl text-muted-foreground max-w-3xl leading-relaxed">
              Professional floor plan editor with AI-powered design assistance. Create, collaborate,
              and share architectural layouts with precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
            <Card className="feature-card">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
                  <div className="blueprint-grid absolute inset-0"></div>
                  <Layers className="h-8 w-8 text-primary relative z-10" />
                </div>
                <CardTitle className="text-xl font-semibold">Precision Drawing</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground leading-relaxed">
                  Professional CAD-like tools with grid snapping, precise measurements, and
                  geometric constraints for accurate architectural drawings.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
                  <div className="blueprint-grid absolute inset-0"></div>
                  <Zap className="h-8 w-8 text-primary relative z-10" />
                </div>
                <CardTitle className="text-xl font-semibold">AI Assistant</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground leading-relaxed">
                  Intelligent design suggestions and automated layout generation with natural
                  language commands and smart recommendations.
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
                  <div className="blueprint-grid absolute inset-0"></div>
                  <Users className="h-8 w-8 text-primary relative z-10" />
                </div>
                <CardTitle className="text-xl font-semibold">Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground leading-relaxed">
                  Real-time collaboration with role-based permissions and secure sharing
                  capabilities for seamless teamwork.
                </p>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
            <Link to="/auth" className="flex items-center space-x-2">
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between">
        </div>
        {/* Quick Actions - Wall-style Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="wall-card group cursor-pointer">
            <Link to="/plans" className="block p-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Plus className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                    Create New Plan
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Start a fresh architectural project
                  </CardDescription>
                </div>
              </div>
            </Link>
          </Card>

          <Card className="wall-card group cursor-pointer">
            <Link to="/plans" className="block p-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <FolderOpen className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                    Browse Plans
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    View all your design projects
                  </CardDescription>
                </div>
              </div>
            </Link>
          </Card>

          <Card className="wall-card group cursor-pointer">
            <Link to="/plans?tab=shared" className="block p-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                    Shared with Me
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Collaborative team projects
                  </CardDescription>
                </div>
              </div>
            </Link>
          </Card>
        </div>

        {/* Recent Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Recent Plans</h2>
            <Button variant="ghost" asChild>
              <Link to="/plans" className="flex items-center space-x-2">
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPlans.map((plan) => (
                <Card key={plan.id} className="wall-card group cursor-pointer">
                  <Link to={`/plans/${plan.id}/editor`} className="block">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors mb-2">
                            {plan.title}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              Updated{' '}
                              {plan.updated_at
                                ? formatDistanceToNow(new Date(plan.updated_at), {
                                    addSuffix: true,
                                  })
                                : 'Never'}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={plan.owner_id === user.id ? 'default' : 'secondary'}
                          className="shadow-sm"
                        >
                          {plan.owner_id === user.id ? 'Owner' : 'Shared'}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No plans yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first floor plan to get started
                </p>
                <Button asChild>
                  <Link to="/plans">Create Plan</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
