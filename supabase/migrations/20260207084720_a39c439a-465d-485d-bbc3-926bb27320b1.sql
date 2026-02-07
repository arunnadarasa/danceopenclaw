
-- Create agent_payments table for x402 payment history
CREATE TABLE public.agent_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  network TEXT NOT NULL,
  target_url TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments (via agent ownership)
CREATE POLICY "Users can view own payments"
ON public.agent_payments
FOR SELECT
TO authenticated
USING (
  agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);

-- Users can insert payments for their own agents
CREATE POLICY "Users can insert own payments"
ON public.agent_payments
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  )
);

-- Service role needs full access for edge functions (they use service role key)
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS, so no extra policy needed

-- Index for faster queries
CREATE INDEX idx_agent_payments_agent_id ON public.agent_payments(agent_id);
CREATE INDEX idx_agent_payments_created_at ON public.agent_payments(created_at DESC);
