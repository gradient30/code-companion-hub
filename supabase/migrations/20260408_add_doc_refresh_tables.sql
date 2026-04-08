-- User-specific Firecrawl configuration
CREATE TABLE public.doc_refresh_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firecrawl_key_ciphertext TEXT,
  firecrawl_key_mask TEXT,
  firecrawl_last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.doc_refresh_user_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_doc_refresh_user_settings_updated_at
BEFORE UPDATE ON public.doc_refresh_user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view own doc_refresh_user_settings"
  ON public.doc_refresh_user_settings
  FOR SELECT
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own doc_refresh_user_settings"
  ON public.doc_refresh_user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doc_refresh_user_settings"
  ON public.doc_refresh_user_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can delete own doc_refresh_user_settings"
  ON public.doc_refresh_user_settings
  FOR DELETE
  TO authenticated
  USING (public.is_owner(user_id));

-- Refresh runs for official and Firecrawl-based refresh jobs
CREATE TABLE public.doc_refresh_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_mode TEXT NOT NULL DEFAULT 'official_fetch',
  scope TEXT NOT NULL,
  page_route TEXT NOT NULL,
  vendor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  summary_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doc_refresh_runs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_doc_refresh_runs_updated_at
BEFORE UPDATE ON public.doc_refresh_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_doc_refresh_runs_user_created
  ON public.doc_refresh_runs (user_id, created_at DESC);

CREATE INDEX idx_doc_refresh_runs_user_scope_created
  ON public.doc_refresh_runs (user_id, scope, created_at DESC);

CREATE POLICY "Users can view own doc_refresh_runs"
  ON public.doc_refresh_runs
  FOR SELECT
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own doc_refresh_runs"
  ON public.doc_refresh_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doc_refresh_runs"
  ON public.doc_refresh_runs
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can delete own doc_refresh_runs"
  ON public.doc_refresh_runs
  FOR DELETE
  TO authenticated
  USING (public.is_owner(user_id));

-- Immutable snapshots for each refresh run
CREATE TABLE public.doc_refresh_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.doc_refresh_runs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  raw_markdown TEXT NOT NULL,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, vendor_id, source_url)
);

ALTER TABLE public.doc_refresh_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_doc_refresh_snapshots_user_created
  ON public.doc_refresh_snapshots (user_id, created_at DESC);

CREATE INDEX idx_doc_refresh_snapshots_run
  ON public.doc_refresh_snapshots (run_id);

CREATE POLICY "Users can view own doc_refresh_snapshots"
  ON public.doc_refresh_snapshots
  FOR SELECT
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own doc_refresh_snapshots"
  ON public.doc_refresh_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own doc_refresh_snapshots"
  ON public.doc_refresh_snapshots
  FOR DELETE
  TO authenticated
  USING (public.is_owner(user_id));

-- Per-item diff records that stay available for review
CREATE TABLE public.doc_refresh_diff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.doc_refresh_runs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  diff_kind TEXT NOT NULL,
  baseline_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  candidate_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  similarity_score NUMERIC(5, 4),
  similar_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_action TEXT NOT NULL DEFAULT 'skip',
  review_status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, entity_key)
);

ALTER TABLE public.doc_refresh_diff_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_doc_refresh_diff_items_updated_at
BEFORE UPDATE ON public.doc_refresh_diff_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_doc_refresh_diff_items_user_run
  ON public.doc_refresh_diff_items (user_id, run_id);

CREATE INDEX idx_doc_refresh_diff_items_user_status
  ON public.doc_refresh_diff_items (user_id, review_status, created_at DESC);

CREATE POLICY "Users can view own doc_refresh_diff_items"
  ON public.doc_refresh_diff_items
  FOR SELECT
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own doc_refresh_diff_items"
  ON public.doc_refresh_diff_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doc_refresh_diff_items"
  ON public.doc_refresh_diff_items
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can delete own doc_refresh_diff_items"
  ON public.doc_refresh_diff_items
  FOR DELETE
  TO authenticated
  USING (public.is_owner(user_id));

-- Published overrides that become the effective catalog layer
CREATE TABLE public.doc_catalog_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  override_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_run_id UUID REFERENCES public.doc_refresh_runs(id) ON DELETE SET NULL,
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, vendor_id, entity_key)
);

ALTER TABLE public.doc_catalog_overrides ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_doc_catalog_overrides_updated_at
BEFORE UPDATE ON public.doc_catalog_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_doc_catalog_overrides_user_scope
  ON public.doc_catalog_overrides (user_id, scope, vendor_id);

CREATE POLICY "Users can view own doc_catalog_overrides"
  ON public.doc_catalog_overrides
  FOR SELECT
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own doc_catalog_overrides"
  ON public.doc_catalog_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doc_catalog_overrides"
  ON public.doc_catalog_overrides
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(user_id));

CREATE POLICY "Users can delete own doc_catalog_overrides"
  ON public.doc_catalog_overrides
  FOR DELETE
  TO authenticated
  USING (public.is_owner(user_id));
