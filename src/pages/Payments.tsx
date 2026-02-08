import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EchoTestPaymentCard from "@/components/payments/EchoTestPaymentCard";
import StoryPaymentCard from "@/components/payments/StoryPaymentCard";
import PaymentHistoryTable, { type PaymentRecord } from "@/components/payments/PaymentHistoryTable";

const Payments = () => {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch agent ID
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAgentId(data.id);
      });
  }, [user]);

  // Fetch payment history
  const fetchPayments = async () => {
    if (!agentId) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("agent_payments")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPayments(data as unknown as PaymentRecord[]);
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [agentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">x402 Payments</h1>
        <p className="text-muted-foreground mt-1">
          Execute and track HTTP 402 payments using USDC across chains.
        </p>
      </div>

      <EchoTestPaymentCard agentId={agentId} onPaymentComplete={fetchPayments} />
      <StoryPaymentCard agentId={agentId} onPaymentComplete={fetchPayments} />
      <PaymentHistoryTable payments={payments} loading={loadingHistory} />
    </div>
  );
};

export default Payments;
