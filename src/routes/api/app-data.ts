import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppDataPayload = {
  locations?: unknown;
  shifts?: unknown;
  shiftTemplates?: unknown;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

async function getUserId(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.id) {
    return null;
  }

  return data.user.id;
}

function normalizeAppData(value: AppDataPayload) {
  return {
    locations: Array.isArray(value.locations) ? value.locations : [],
    shifts: Array.isArray(value.shifts) ? value.shifts : [],
    shiftTemplates: Array.isArray(value.shiftTemplates) ? value.shiftTemplates : [],
  };
}

export const Route = createFileRoute("/api/app-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = await getUserId(request);

        if (!userId) {
          return jsonResponse({ error: "Sessão expirada" }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
          .from("app_data")
          .select("data")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error(error);
          return jsonResponse({ error: "Não foi possível carregar seus dados." }, { status: 500 });
        }

        return jsonResponse(normalizeAppData((data?.data ?? {}) as AppDataPayload));
      },
      PUT: async ({ request }) => {
        const userId = await getUserId(request);

        if (!userId) {
          return jsonResponse({ error: "Sessão expirada" }, { status: 401 });
        }

        const payload = normalizeAppData((await request.json()) as AppDataPayload);
        const { error } = await supabaseAdmin.from("app_data").upsert({
          id: userId,
          data: payload,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error(error);
          return jsonResponse({ error: "Não foi possível salvar seus dados." }, { status: 500 });
        }

        return jsonResponse(payload);
      },
    },
  },
});
