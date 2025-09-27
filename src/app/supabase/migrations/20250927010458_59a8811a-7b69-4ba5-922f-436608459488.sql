-- Fix the security warning by setting search_path to empty string for better security
CREATE OR REPLACE FUNCTION public.get_user_role(plan_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role FROM public.plan_members 
    WHERE plan_members.plan_id = $1 AND user_id = auth.uid()
    LIMIT 1;
$$;