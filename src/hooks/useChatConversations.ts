import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useChatConversations() {
  const { user } = useAuth();

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Conversation[];
  }, [user]);

  const createConversation = useCallback(
    async (title = "New Chat"): Promise<Conversation> => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) throw error;
      return data as Conversation;
    },
    [user]
  );

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const { error } = await supabase
      .from("chat_conversations")
      .update({ title })
      .eq("id", id);
    if (error) throw error;
  }, []);

  const fetchMessages = useCallback(
    async (conversationId: string): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    []
  );

  const saveMessage = useCallback(
    async (conversationId: string, role: string, content: string) => {
      const { error: msgError } = await supabase
        .from("chat_messages")
        .insert({ conversation_id: conversationId, role, content });
      if (msgError) throw msgError;

      // Bump updated_at on the conversation
      const { error: convError } = await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (convError) throw convError;
    },
    []
  );

  return {
    fetchConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    fetchMessages,
    saveMessage,
  };
}
