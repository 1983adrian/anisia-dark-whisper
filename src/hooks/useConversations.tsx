import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string | null;
  created_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }, []);

  const addMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role, content })
      .select()
      .single();

    if (data) {
      setMessages(prev => [...prev, data as Message]);
      
      if (role === 'user') {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
              "Authorization": "Bearer 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", 
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({ 
              model: "llama-3.3-70b-versatile", 
              messages: [{ role: "user", content: content }] 
            }),
          });
          const aiData = await res.json();
          const aiReply = aiData.choices[0].message.content;
          await addMessage(conversationId, 'assistant', aiReply);
        } catch (e) {
          console.error("Eroare Groq:", e);
        }
      }
    }
  };

  const createConversation = async (title: string = 'New Chat') => {
    if (!user) return null;
    const { data } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    if (data) {
      setCurrentConversation(data);
      setMessages([]);
      return data;
    }
    return null;
  };

  const selectConversation = useCallback(async (conversation: any) => {
    setCurrentConversation(conversation);
    setLoading(true);
    await fetchMessages(conversation.id);
    setLoading(false);
  }, [fetchMessages]);

  return { 
    conversations, 
    currentConversation, 
    messages, 
    loading, 
    createConversation, 
    addMessage, 
    setMessages,
    selectConversation 
  };
}
