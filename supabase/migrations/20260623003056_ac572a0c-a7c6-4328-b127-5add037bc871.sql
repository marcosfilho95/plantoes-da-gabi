-- 1) Restrict auth_usernames to authenticated users only (remove anon access)
DROP POLICY IF EXISTS "anon can read username mappings" ON public.auth_usernames;

CREATE POLICY "authenticated can read username mappings"
ON public.auth_usernames
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.auth_usernames FROM anon;
GRANT SELECT ON public.auth_usernames TO authenticated;

-- 2) Set immutable search_path on set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 3) Restrict has_role EXECUTE: revoke from public/anon, keep for authenticated (required by RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;