-- Add RLS to app_data so authenticated users can only access their own row.
-- id is a text column equal to auth.uid() (cast to text).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_data TO authenticated;
GRANT ALL ON public.app_data TO service_role;

ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own app_data" ON public.app_data;
DROP POLICY IF EXISTS "Users insert own app_data" ON public.app_data;
DROP POLICY IF EXISTS "Users update own app_data" ON public.app_data;
DROP POLICY IF EXISTS "Users delete own app_data" ON public.app_data;

CREATE POLICY "Users read own app_data"
  ON public.app_data FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

CREATE POLICY "Users insert own app_data"
  ON public.app_data FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Users update own app_data"
  ON public.app_data FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Users delete own app_data"
  ON public.app_data FOR DELETE
  TO authenticated
  USING (id = auth.uid()::text);

-- updated_at trigger so "last backup" timestamp reflects real writes
DROP TRIGGER IF EXISTS app_data_set_updated_at ON public.app_data;
CREATE TRIGGER app_data_set_updated_at
  BEFORE UPDATE ON public.app_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();