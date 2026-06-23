// Shim that re-exports the shared Supabase client so the legacy
// app code (`import { supabase, isSupabaseConfigured } from "@/lib/supabase"`)
// keeps working without changes.
import { supabase as supabaseClient } from "@/integrations/supabase/client";

export const supabase: typeof supabaseClient | null = supabaseClient;
export const isSupabaseConfigured: boolean = true;
