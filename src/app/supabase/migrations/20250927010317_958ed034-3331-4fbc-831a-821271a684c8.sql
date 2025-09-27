-- Create plans table
CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL,
    title text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_archived boolean DEFAULT false
);

-- Create plan_members table
CREATE TABLE public.plan_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(plan_id, user_id)
);

-- Create plan_revisions table
CREATE TABLE public.plan_revisions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    snapshot jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create share_links table
CREATE TABLE public.share_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    can_edit boolean DEFAULT false,
    created_by uuid NOT NULL,
    expires_at timestamptz NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role for a specific plan
CREATE OR REPLACE FUNCTION public.get_user_role(plan_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.plan_members 
    WHERE plan_members.plan_id = $1 AND user_id = auth.uid()
    LIMIT 1;
$$;

-- RLS Policies for plans table
CREATE POLICY "Plans owners can manage" ON public.plans
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Plan members can view" ON public.plans
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.plan_members 
            WHERE plan_members.plan_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Plan admins and editors can update" ON public.plans
    FOR UPDATE USING (
        owner_id = auth.uid() OR 
        public.get_user_role(id) IN ('admin', 'editor')
    );

-- RLS Policies for plan_members table
CREATE POLICY "Plan owners and admins manage members" ON public.plan_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.plans 
            WHERE plans.id = plan_id AND plans.owner_id = auth.uid()
        ) OR 
        public.get_user_role(plan_id) = 'admin'
    );

CREATE POLICY "Members can view plan memberships" ON public.plan_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.plans 
            WHERE plans.id = plan_id AND plans.owner_id = auth.uid()
        ) OR 
        public.get_user_role(plan_id) IN ('admin', 'editor', 'viewer')
    );

-- RLS Policies for plan_revisions table
CREATE POLICY "Plan members can create and view revisions" ON public.plan_revisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.plans 
            WHERE plans.id = plan_id AND plans.owner_id = auth.uid()
        ) OR 
        public.get_user_role(plan_id) IN ('admin', 'editor', 'viewer')
    );

-- RLS Policies for share_links table
CREATE POLICY "Plan owners and admins manage share links" ON public.share_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.plans 
            WHERE plans.id = plan_id AND plans.owner_id = auth.uid()
        ) OR 
        public.get_user_role(plan_id) = 'admin'
    );

-- Functional index for performance
CREATE INDEX idx_plans_updated_at ON public.plans (updated_at DESC);
CREATE INDEX idx_plan_members_user_plan ON public.plan_members (user_id, plan_id);
CREATE INDEX idx_share_links_token ON public.share_links (token);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add trigger to update updated_at on plans
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();