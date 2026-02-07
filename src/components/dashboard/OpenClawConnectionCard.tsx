import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, Unplug, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const OpenClawConnectionCard = () => {
  const { session } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [status, setStatus] = useState<string>("not_configured");
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (session) fetchStatus();
  }, [session]);

  const fetchStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("openclaw-status", {
        method: "GET",
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await error.context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        console.warn("openclaw-status error:", msg);
      } else if (data) {
        setStatus(data.status || "not_configured");
        setLastPing(data.last_ping_at);
        if (data.webhook_url) setWebhookUrl(data.webhook_url);
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    if (!webhookUrl || !webhookToken) {
      toast.error("Please enter both webhook URL and token.");
      return;
    }
    setLoading(true);
    let normalizedUrl = webhookUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      const { data, error } = await supabase.functions.invoke("openclaw-register", {
        body: { webhookUrl: normalizedUrl, webhookToken },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await error.context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      setStatus(data.connection.status);
      setLastPing(data.connection.last_ping_at);
      toast.success(
        data.connection.status === "connected"
          ? "OpenClaw connected successfully!"
          : "Connection saved. Instance not reachable yet — status is pending."
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to register connection");
    } finally {
      setLoading(false);
    }
  };

  const statusColor =
    status === "connected"
      ? "bg-success"
      : status === "pending"
      ? "bg-warning"
      : "bg-destructive";

  const statusLabel =
    status === "not_configured" ? "Not Configured" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === "connected" ? (
              <Plug className="h-5 w-5 text-success" />
            ) : (
              <Unplug className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-lg">OpenClaw Connection</CardTitle>
              <CardDescription>Connect your self-hosted OpenClaw agent</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <Input
            placeholder="https://your-server.up.railway.app"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook Token</label>
          <Input
            type="password"
            placeholder="Your shared hook token"
            value={webhookToken}
            onChange={(e) => setWebhookToken(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? "Connecting..." : "Connect"}
          </Button>
          <Button variant="outline" onClick={fetchStatus} disabled={checking}>
            <RefreshCw className={`mr-1 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Test
          </Button>
        </div>

        {lastPing && (
          <p className="text-xs text-muted-foreground">
            Last successful ping: {new Date(lastPing).toLocaleString()}
          </p>
        )}

        <a
          href="https://openclaw.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          OpenClaw setup docs <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
};
