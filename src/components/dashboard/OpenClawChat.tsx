import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { streamChat, type ChatMessage as StreamMessage } from "@/lib/openclaw-stream";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const OpenClawChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { createConversation, saveMessage, renameConversation } = useChatConversations();
  const widgetConvIdRef = useRef<string | null>(null);

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

  const ensureConversation = async (firstMessage: string): Promise<string | null> => {
    if (widgetConvIdRef.current) return widgetConvIdRef.current;
    if (!user) return null;
    try {
      const conv = await createConversation(firstMessage.slice(0, 50));
      widgetConvIdRef.current = conv.id;
      return conv.id;
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setIsLoading(true);
    setIsStreaming(false);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Persist user message
    const convId = await ensureConversation(trimmed);
    if (convId) {
      saveMessage(convId, "user", trimmed).catch(() => {});
      // Auto-title on first message
      if (messages.length === 0) {
        renameConversation(convId, trimmed.slice(0, 50)).catch(() => {});
      }
    }

    let assistantContent = "";

    try {
      await streamChat({
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })) as StreamMessage[],
        onDelta: (chunk) => {
          if (!isStreaming) setIsStreaming(true);
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              );
            }
            return [...prev, { role: "assistant", content: assistantContent }];
          });
        },
        onDone: () => {
          setIsLoading(false);
          setIsStreaming(false);
          // Persist assistant response
          if (convId && assistantContent) {
            saveMessage(convId, "assistant", assistantContent).catch(() => {});
          }
        },
        onError: (error) => {
          setIsLoading(false);
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${error}` },
          ]);
        },
      });
    } catch {
      setIsLoading(false);
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect. Please try again." },
      ]);
    }
  };

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
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                        {isStreaming && i === messages.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isLoading && !isStreaming && (
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
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={!input.trim() || isLoading}
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
