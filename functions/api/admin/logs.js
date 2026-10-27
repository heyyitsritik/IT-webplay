/**
 * GET /api/admin/logs?limit=50&offset=0  – Fetch admin audit logs
 */
import { json, error, requireAdmin } from "../_helpers.js";

export async function onRequestGet(context) {
  const { data } = context;
  const adminErr = requireAdmin(data);
  if (adminErr) return adminErr;

  try {
    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 50, 200);
    const offset = parseInt(url.searchParams.get("offset")) || 0;

    const { data: logs, error: dbErr } = await data.supabaseAdmin
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
