import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Send,
  BarChart3,
  CalendarPlus,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AgentTask {
  id: string;
  task_type: string;
  message: string;
  status: string;
  response: any;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

const quickActions = [
  { label: "Create wallet on Base", type: "wallet_create", icon: Wallet, message: "Create a new wallet on Base Sepolia" },
  { label: "Tip top dancer", type: "tip", icon: Send, message: "Tip top dancer 0.0001 ETH on Base Sepolia" },
  { label: "Check balances", type: "custom", icon: BarChart3, message: "Check my wallet balances across all chains" },
  { label: "Create battle event", type: "event_create", icon: CalendarPlus, message: "Create a breaking battle event for this weekend" },
];

export const AgentTaskPanel = () => {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchTasks();
      // Subscribe to realtime updates
      const channel = supabase
        .channel("agent-tasks")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agent_tasks" },
          () => fetchTasks()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [session]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setTasks(data as AgentTask[]);
  };

  const sendTask = async (taskType: string, message: string) => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("openclaw-proxy", {
        body: { taskType, message },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await error.context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      toast.success("Task submitted to your OpenClaw agent");
      setCustomMessage("");
      fetchTasks();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit task");
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="h-5 w-5" />
          Agent Command Center
        </CardTitle>
        <CardDescription>Send tasks to your OpenClaw agent</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick actions */}
        <div className="grid gap-2 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Button
              key={action.type + action.label}
              variant="outline"
              className="justify-start gap-2"
              disabled={sending}
              onClick={() => sendTask(action.type, action.message)}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Custom command */}
        <div className="flex gap-2">
          <Input
            placeholder="Send a custom command to your agent..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTask("custom", customMessage)}
          />
          <Button
            onClick={() => sendTask("custom", customMessage)}
            disabled={sending || !customMessage.trim()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Task history */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Task History</h4>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Send your first command above!</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-secondary/30 p-3 cursor-pointer transition-colors hover:bg-secondary/50"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon(task.status)}
                      <span className="text-sm font-medium">{task.message}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.task_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {expandedTask === task.id && (
                    <div className="mt-3 rounded-md bg-background p-3 text-xs">
                      {task.error_message && (
                        <p className="text-destructive">{task.error_message}</p>
                      )}
                      {task.response && (
                        <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                          {JSON.stringify(task.response, null, 2)}
                        </pre>
                      )}
                      {!task.error_message && !task.response && (
                        <p className="text-muted-foreground">
                          {task.status === "running" ? "Task is running..." : "Waiting for response..."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
