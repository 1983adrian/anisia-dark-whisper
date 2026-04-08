
CREATE TABLE IF NOT EXISTS public.ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memory_type text NOT NULL DEFAULT 'learned',
  category text DEFAULT 'general',
  content text NOT NULL,
  importance integer DEFAULT 5,
  times_recalled integer DEFAULT 0,
  last_recalled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories" ON public.ai_memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories" ON public.ai_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON public.ai_memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON public.ai_memories
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ai_memories_user_id ON public.ai_memories(user_id);
CREATE INDEX idx_ai_memories_category ON public.ai_memories(category);
CREATE INDEX idx_ai_memories_importance ON public.ai_memories(importance DESC);
