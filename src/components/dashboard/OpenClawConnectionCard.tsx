import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plug, Unplug, RefreshCw, ExternalLink, Trash2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const OpenClawConnectionCard = () => {
  const { session } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [status, setStatus] = useState<string>("not_configured");
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [pingDetail, setPingDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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
        setPingDetail(data.ping_detail || null);
        if (data.webhook_url) setWebhookUrl(data.webhook_url);

        // Show toast with diagnostic info on test
        if (data.ping_detail && data.status !== "connected") {
          toast.error(`Connection test failed`, {
            description: data.ping_detail,
            duration: 8000,
          });
        } else if (data.status === "connected") {
          toast.success("OpenClaw is reachable!");
        }
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
      setPingDetail(data.connection.ping_detail || null);

      if (data.connection.status === "connected") {
        toast.success("OpenClaw connected successfully!");
      } else {
        toast.warning("Connection saved but instance not reachable.", {
          description: data.connection.ping_detail || "Check your server logs.",
          duration: 8000,
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to register connection");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke("openclaw-register", {
        body: { action: "disconnect" },
      });
      if (error) {
        throw new Error(error.message);
      }
      setStatus("not_configured");
      setWebhookUrl("");
      setWebhookToken("");
      setLastPing(null);
      setPingDetail(null);
      toast.success("OpenClaw disconnected. You can reconfigure anytime.");
    } catch (e: any) {
      toast.error(e.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const statusColor =
    status === "connected"
      ? "bg-success"
      : status === "pending"
      ? "bg-warning"
      : status === "disconnected"
      ? "bg-destructive"
      : "bg-muted-foreground";

  const statusLabel =
    status === "not_configured"
      ? "Not Configured"
      : status.charAt(0).toUpperCase() + status.slice(1);

  const isConfigured = status !== "not_configured";

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
        {/* Diagnostic alert */}
        {pingDetail && (status === "pending" || status === "disconnected") && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <p className="font-medium">Connection issue detected</p>
              <p className="text-xs font-mono break-all">{pingDetail}</p>
              <p className="text-xs text-muted-foreground mt-1">
                This usually means your server is crashing on startup or the endpoint path is incorrect.
                Check your Railway/server logs and environment variables (API keys, tokens).
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <Input
            placeholder="https://your-server.up.railway.app"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            The base URL of your OpenClaw instance (e.g. <code className="text-xs">https://clawdbot-production-xxxx.up.railway.app</code>). Do not include path suffixes like /hooks/wake.
          </p>
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
          {isConfigured && (
            <>
              <Button variant="outline" onClick={fetchStatus} disabled={checking}>
                <RefreshCw className={`mr-1 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Test
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Disconnect"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {lastPing && (
          <p className="text-xs text-muted-foreground">
            Last successful ping: {new Date(lastPing).toLocaleString()}
          </p>
        )}

        <a
          href="https://docs.openclaw.ai/install/railway"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          OpenClaw setup docs <ExternalLink className="h-3 w-3" />
        </a>

        {/* Quick Setup Tips */}
        <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Setup Tips</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-medium text-primary">Hosting</span>
              <p className="text-xs text-muted-foreground">
                We recommend{" "}
                <a href="https://railway.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Railway</a>{" "}
                (Hobby Plan, $5/month). Set a <strong className="text-foreground">$10 hard usage limit</strong> and a{" "}
                <strong className="text-foreground">$5 custom email alert</strong> to control costs.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-medium text-primary">AI Key</span>
              <p className="text-xs text-muted-foreground">
                Use{" "}
                <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenRouter</a>{" "}
                for your AI model key (set as <code className="rounded bg-muted px-1 text-[11px]">OPENROUTER_API_KEY</code> in Railway).
                Sign up and grab a free key to get started.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
