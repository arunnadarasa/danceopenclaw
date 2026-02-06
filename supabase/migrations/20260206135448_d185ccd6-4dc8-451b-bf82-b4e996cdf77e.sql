
-- Create openclaw_connections table
CREATE TABLE public.openclaw_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  webhook_url TEXT NOT NULL,
  webhook_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_ping_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on openclaw_connections
ALTER TABLE public.openclaw_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for openclaw_connections
CREATE POLICY "Users can view own connection"
  ON public.openclaw_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connection"
  ON public.openclaw_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connection"
  ON public.openclaw_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connection"
  ON public.openclaw_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on openclaw_connections
CREATE TRIGGER update_openclaw_connections_updated_at
  BEFORE UPDATE ON public.openclaw_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create agent_tasks table
CREATE TABLE public.agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'custom',
  message TEXT NOT NULL,
  session_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on agent_tasks
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_tasks
CREATE POLICY "Users can view own tasks"
  ON public.agent_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.agent_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.agent_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
