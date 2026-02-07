import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  taskId?: string;
}

export const OpenClawChat = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, scrollToBottom]);

  // Realtime subscription for agent task updates
  useEffect(() => {
    if (!user || pendingTaskIds.size === 0) return;

    const channel = supabase
      .channel("chat-task-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_tasks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const task = payload.new as {
            id: string;
            status: string;
            response: unknown;
            error_message: string | null;
          };

          if (!pendingTaskIds.has(task.id)) return;

          if (task.status === "completed") {
            let content = "Task completed.";
            if (task.response) {
              const res = task.response as Record<string, unknown>;
              content =
                (res.result as string) ||
                (res.response as string) ||
                (res.output as string) ||
                JSON.stringify(task.response);
            }

            setMessages((prev) => [
              ...prev,
              { role: "agent", content, timestamp: new Date(), taskId: task.id },
            ]);
            setPendingTaskIds((prev) => {
              const next = new Set(prev);
              next.delete(task.id);
              return next;
            });
          } else if (task.status === "failed") {
            setMessages((prev) => [
              ...prev,
              {
                role: "agent",
                content: task.error_message || "Something went wrong.",
                timestamp: new Date(),
                taskId: task.id,
              },
            ]);
            setPendingTaskIds((prev) => {
              const next = new Set(prev);
              next.delete(task.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pendingTaskIds]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput("");
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date() },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke("openclaw-proxy", {
        body: { taskType: "chat", message: trimmed },
      });

      if (error) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: `Error: ${error.message}`, timestamp: new Date() },
        ]);
      } else if (data?.taskId) {
        setPendingTaskIds((prev) => new Set(prev).add(data.taskId));
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Failed to send message. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const isWaiting = pendingTaskIds.size > 0;

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              onClick={() => setOpen(true)}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] sm:w-[400px] h-[500px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm text-foreground">
                  Chat with OpenClaw
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center gap-2">
                  <MessageCircle className="h-10 w-10 opacity-30" />
                  <p>Send a message to your OpenClaw agent.</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isWaiting && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground rounded-xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-border p-3 bg-muted/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={!input.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
