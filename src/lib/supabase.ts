// Shim that re-exports the Lovable-managed Supabase client so the legacy
// app code (`import { supabase, isSupabaseConfigured } from "@/lib/supabase"`)
// keeps working without changes.
export { supabase } from "@/integrations/supabase/client";
export const isSupabaseConfigured = true;
