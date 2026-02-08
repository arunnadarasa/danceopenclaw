
-- Create moltbook_connections table
CREATE TABLE public.moltbook_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id),
  moltbook_api_key TEXT NOT NULL,
  moltbook_agent_name TEXT NOT NULL,
  claim_url TEXT,
  claim_status TEXT NOT NULL DEFAULT 'pending_claim',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moltbook_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own rows
CREATE POLICY "Users can view own moltbook connection"
  ON public.moltbook_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moltbook connection"
  ON public.moltbook_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moltbook connection"
  ON public.moltbook_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own moltbook connection"
  ON public.moltbook_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_moltbook_connections_updated_at
  BEFORE UPDATE ON public.moltbook_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
