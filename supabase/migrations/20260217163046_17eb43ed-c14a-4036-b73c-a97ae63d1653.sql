
-- Create prompt_optimize_history table
CREATE TABLE public.prompt_optimize_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_id uuid NULL,
  original_prompt text NOT NULL,
  optimized_prompt text NOT NULL,
  template text NOT NULL DEFAULT 'general',
  mode text NOT NULL DEFAULT 'system',
  action text NOT NULL DEFAULT 'optimize',
  feedback text NULL,
  analysis text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_optimize_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own history"
  ON public.prompt_optimize_history FOR SELECT
  USING (is_owner(user_id));

CREATE POLICY "Users can insert own history"
  ON public.prompt_optimize_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON public.prompt_optimize_history FOR DELETE
  USING (is_owner(user_id));
