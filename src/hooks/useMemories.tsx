import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Memory {
  id: string;
  user_id: string;
  memory_type: string;
  category: string;
  content: string;
  importance: number;
  times_recalled: number;
  last_recalled_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMemories() {
  const { user } = useAuth();

  const getRelevantMemories = useCallback(async (query: string, limit = 10): Promise<Memory[]> => {
    if (!user) return [];

    // Get top memories by importance, most recent first
    const { data, error } = await supabase
      .from('ai_memories')
      .select('*')
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    // Simple keyword relevance scoring
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scored = (data as unknown as Memory[]).map(mem => {
      const contentLower = mem.content.toLowerCase();
      const categoryLower = (mem.category || '').toLowerCase();
      let relevance = mem.importance;
      
      for (const word of queryWords) {
        if (contentLower.includes(word)) relevance += 3;
        if (categoryLower.includes(word)) relevance += 2;
      }
      
      return { ...mem, _relevance: relevance };
    });

    return scored
      .sort((a, b) => b._relevance - a._relevance)
      .slice(0, 5)
      .map(({ _relevance, ...mem }) => mem);
  }, [user]);

  const saveMemory = useCallback(async (
    content: string, 
    category = 'general', 
    importance = 5,
    memoryType = 'learned'
  ): Promise<Memory | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_memories')
      .insert({
        user_id: user.id,
        content,
        category,
        importance,
        memory_type: memoryType,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save memory:', error);
      return null;
    }
    return data as unknown as Memory;
  }, [user]);

  const recallMemory = useCallback(async (memoryId: string) => {
    await supabase
      .from('ai_memories')
      .update({ 
        times_recalled: undefined, // will be handled by increment
        last_recalled_at: new Date().toISOString() 
      })
      .eq('id', memoryId);
  }, []);

  const formatMemoriesForContext = useCallback((memories: Memory[]): string => {
    if (memories.length === 0) return '';

    const formatted = memories.map(m => 
      `[${m.category}] (importanță: ${m.importance}/10): ${m.content}`
    ).join('\n');

    return `\n\n🧠 MEMORII RELEVANTE (învățate din conversații anterioare):\n${formatted}`;
  }, []);

  return {
    getRelevantMemories,
    saveMemory,
    recallMemory,
    formatMemoriesForContext,
  };
}
