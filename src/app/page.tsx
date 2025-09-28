'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Layers,
  Users,
  Zap,
} from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

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

export default function HomePage() {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center">
        <div className="space-y-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="relative">
              <Layers className="h-20 w-20 text-primary drop-shadow-lg" />
              <div className="absolute -inset-2 rounded-full bg-primary/5 blur-xl" />
            </div>
            <h1 className="text-7xl font-bold tracking-tight text-foreground">Layout AI</h1>
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
            <Link href="/auth" className="cursor-pointer flex items-center gap-2">
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
