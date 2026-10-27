/**
 * GET /api/admin/logs?limit=50&offset=0 – Fetch admin audit logs
 */
import { json, error, requireAdmin } from "../helpers.js";

export async function handleAdminLogs(request, method, ctx) {
  if (method !== "GET") return error("Method not allowed", 405);

  const adminErr = requireAdmin(ctx);
  if (adminErr) return adminErr;

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 50, 200);
    const offset = parseInt(url.searchParams.get("offset")) || 0;

    const { data: logs, error: dbErr } = await ctx.supabaseAdmin
      .from("admin_logs")
      .select(`
        id, action, details, created_at,
        admin:profiles!admin_id(email),
        target_user:profiles!target_user_id(email)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbErr) return error(dbErr.message, 500);
    return json({ logs, limit, offset });
  } catch (e) {
    return error(e.message, 500);
  }
}
