/**
 * GET  /api/admin/users          – List all users with account counts
 * POST /api/admin/users          – Update a user's role
 *
 * Body (POST): { user_id: string, role: 'user' | 'admin' }
 */
import { json, error, requireAdmin } from "../_helpers.js";

export async function onRequestGet(context) {
  const { data } = context;
  const adminErr = requireAdmin(data);
  if (adminErr) return adminErr;

  try {
    // Fetch all profiles
    const { data: profiles, error: dbErr } = await data.supabaseAdmin
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: true });

    if (dbErr) return error(dbErr.message, 500);

    // Get account counts per user
    const { data: counts } = await data.supabaseAdmin
      .from("game_accounts")
      .select("user_id")
      .then(({ data: rows }) => {
        const map = {};
        for (const r of rows || []) {
          map[r.user_id] = (map[r.user_id] || 0) + 1;
        }
        return { data: map };
      });

    const users = profiles.map((p) => ({
      ...p,
      account_count: counts[p.id] || 0,
    }));

    return json({ users });
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestPost(context) {
  const { data } = context;
  const adminErr = requireAdmin(data);
  if (adminErr) return adminErr;

  try {
    const body = await context.request.json();
    const { user_id, role } = body;

    if (!user_id || !["user", "admin"].includes(role)) {
      return error("Valid user_id and role ('user'|'admin') required");
    }

    // Prevent self-demotion
    if (user_id === data.user.id && role !== "admin") {
      return error("Cannot demote yourself");
    }

    const { error: dbErr } = await data.supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", user_id);

    if (dbErr) return error(dbErr.message, 500);

    // Log the action
    await data.supabaseAdmin.from("admin_logs").insert({
      admin_id: data.user.id,
      action: "role_change",
      target_user_id: user_id,
      details: { new_role: role },
    });

    return json({ success: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
