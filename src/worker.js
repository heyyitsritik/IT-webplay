/**
 * IT-WebPlay Worker entry point.
 *
 * Routes /api/* requests to the appropriate handler.
 * Static assets (index.html, site/*) are served automatically
 * by the Cloudflare Workers assets binding.
 */
import { createClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "./crypto.js";
import { json, error, requireAuth, requireAdmin } from "./helpers.js";
import { handleAccounts } from "./routes/accounts.js";
import { handleGameLaunch } from "./routes/game-launch.js";
import { handleAccountsReorder } from "./routes/accounts-reorder.js";
import { handleMigrate } from "./routes/migrate.js";
import { handleAdminUsers } from "./routes/admin-users.js";
import { handleAdminAccounts } from "./routes/admin-accounts.js";
import { handleAdminLogs } from "./routes/admin-logs.js";

/**
 * Middleware: create Supabase admin client, verify JWT, attach user/role.
 * Returns a `ctx` object that every route handler receives.
 */
async function runMiddleware(request, env) {
  const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const ctx = { supabaseAdmin, env, user: null, role: null };

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (user && !authError) {
        ctx.user = user;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        ctx.role = profile?.role || "user";
      }
    } catch {
      // Invalid token – continue as unauthenticated
    }
  }

  return ctx;
}

/** Add CORS headers to every response. */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function withCors(response) {
  const hdrs = corsHeaders();
  for (const [k, v] of Object.entries(hdrs)) {
    response.headers.set(k, v);
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Only handle /api/* routes – everything else falls through to assets
    if (!url.pathname.startsWith("/api/")) {
      // Let the assets binding handle it
      return env.ASSETS.fetch(request);
    }

    // Run auth middleware
    const ctx = await runMiddleware(request, env);
    const path = url.pathname;
    const method = request.method;

    let response;
    try {
      // ─── Route dispatch ───
      if (path === "/api/accounts" || path === "/api/accounts/") {
        response = await handleAccounts(request, method, ctx);
      } else if (
        path === "/api/accounts-reorder" ||
        path === "/api/accounts-reorder/"
      ) {
        response = await handleAccountsReorder(request, method, ctx);
      } else if (
        path === "/api/game-launch" ||
        path === "/api/game-launch/"
      ) {
        response = await handleGameLaunch(request, method, ctx);
      } else if (path === "/api/migrate" || path === "/api/migrate/") {
        response = await handleMigrate(request, method, ctx);
      } else if (
        path === "/api/admin/users" ||
        path === "/api/admin/users/"
      ) {
        response = await handleAdminUsers(request, method, ctx);
      } else if (
        path === "/api/admin/accounts" ||
        path === "/api/admin/accounts/"
      ) {
        response = await handleAdminAccounts(request, method, ctx);
      } else if (
        path === "/api/admin/logs" ||
        path === "/api/admin/logs/"
      ) {
        response = await handleAdminLogs(request, method, ctx);
      } else {
        response = error("Not found", 404);
      }
    } catch (e) {
      response = error("Internal server error: " + e.message, 500);
    }

    return withCors(response);
  },
};
