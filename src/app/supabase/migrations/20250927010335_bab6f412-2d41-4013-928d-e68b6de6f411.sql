-- Fix the security warning by properly setting search_path for the function
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