import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle,
  Plus,
  Send,
  Loader2,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useChatConversations,
  type Conversation,
  type ChatMessage,
} from "@/hooks/useChatConversations";
import { streamChat, type ChatMessage as StreamMessage } from "@/lib/openclaw-stream";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function groupConversationsByDate(convos: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = [];
  const buckets: Record<string, Conversation[]> = {};

  for (const c of convos) {
    const d = new Date(c.updated_at);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else label = format(d, "MMM d, yyyy");
    (buckets[label] ??= []).push(c);
  }

  for (const [label, items] of Object.entries(buckets)) {
    groups.push({ label, items });
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChatPage = () => {
  const {
    fetchConversations,
    createConversation,
    deleteConversation,
    fetchMessages,
    saveMessage,
    renameConversation,
  } = useChatConversations();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---- scroll helper ---- */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  /* ---- load conversations on mount ---- */
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchConversations();
        setConversations(data);
      } catch {
        toast({ title: "Failed to load conversations", variant: "destructive" });
      } finally {
        setLoadingConvos(false);
      }
    })();
  }, [fetchConversations, toast]);

  /* ---- select a conversation ---- */
  const selectConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setMessages([]);
      setStreamContent("");
      try {
        const msgs = await fetchMessages(id);
        setMessages(msgs);
      } catch {
        toast({ title: "Failed to load messages", variant: "destructive" });
      }
    },
    [fetchMessages, toast]
  );

  /* ---- new chat ---- */
  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setStreamContent("");
    } catch {
      toast({ title: "Failed to create chat", variant: "destructive" });
    }
  }, [createConversation, toast]);

  /* ---- delete chat ---- */
  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) {
          setActiveId(null);
          setMessages([]);
        }
      } catch {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    },
    [activeId, deleteConversation, toast]
  );

  /* ---- send message ---- */
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    let convId = activeId;

    // Auto-create a conversation if none active
    if (!convId) {
      try {
        const conv = await createConversation(trimmed.slice(0, 50));
        setConversations((prev) => [conv, ...prev]);
        convId = conv.id;
        setActiveId(convId);
      } catch {
        toast({ title: "Failed to create chat", variant: "destructive" });
        return;
      }
    }

    setInput("");
    setIsLoading(true);
    setIsStreaming(false);
    setStreamContent("");

    // Save user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversation_id: convId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await saveMessage(convId, "user", trimmed);
    } catch {
      /* continue anyway */
    }

    // Auto-title from first user message
    const isFirst = messages.length === 0;
    if (isFirst) {
      const title = trimmed.slice(0, 50);
      renameConversation(convId, title).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title } : c))
      );
    }

    // Build history for API
    const history: StreamMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    let assistantContent = "";

    try {
      await streamChat({
        messages: history,
        onDelta: (chunk) => {
          if (!isStreaming) setIsStreaming(true);
          assistantContent += chunk;
          setStreamContent(assistantContent);
        },
        onDone: async () => {
          setIsLoading(false);
          setIsStreaming(false);
          setStreamContent("");

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            conversation_id: convId!,
            role: "assistant",
            content: assistantContent,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          try {
            await saveMessage(convId!, "assistant", assistantContent);
          } catch {
            /* silent */
          }

          // Bump conversation to top
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
            );
            return updated.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        },
        onError: (error) => {
          setIsLoading(false);
          setIsStreaming(false);
          setStreamContent("");
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              conversation_id: convId!,
              role: "assistant",
              content: `Error: ${error}`,
              created_at: new Date().toISOString(),
            },
          ]);
        },
      });
    } catch {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamContent("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: convId!,
          role: "assistant",
          content: "Failed to connect. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeId);
  const grouped = groupConversationsByDate(conversations);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Conversation sidebar ─── */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-muted/30 transition-all duration-300",
          sidebarOpen ? "w-72 min-w-[18rem]" : "w-0 min-w-0 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Conversations</span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleNewChat}>
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {loadingConvos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {grouped.map((group) => (
                <div key={group.label}>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={cn(
                        "group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        c.id === activeId
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/70 hover:bg-muted"
                      )}
                    >
                      <span className="truncate">{c.title}</span>
                      <button
                        onClick={(e) => handleDelete(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ─── Main chat area ─── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h2 className="text-sm font-semibold text-foreground truncate">
            {activeConvo?.title ?? "Chat with OpenClaw"}
          </h2>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {!activeId && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center gap-3">
              <MessageCircle className="h-12 w-12 opacity-20" />
              <p>Select a conversation or start a new one.</p>
              <Button variant="outline" size="sm" onClick={handleNewChat}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Chat
              </Button>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming assistant message */}
          {isStreaming && streamContent && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-xl rounded-bl-sm px-4 py-3 text-sm bg-muted text-foreground">
                <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamContent}
                  </ReactMarkdown>
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                </div>
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-xl rounded-bl-sm px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 md:p-4 bg-muted/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
