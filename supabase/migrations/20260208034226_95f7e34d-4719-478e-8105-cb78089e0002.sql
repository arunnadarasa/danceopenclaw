-- Fix: Restrict profiles SELECT to own profile only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Fix: Restrict agents SELECT to own agents only
DROP POLICY IF EXISTS "Users can view all agents" ON public.agents;
CREATE POLICY "Users can view own agents"
  ON public.agents
  FOR SELECT
  USING (auth.uid() = user_id);