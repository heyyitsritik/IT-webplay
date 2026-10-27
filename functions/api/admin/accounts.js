/**
 * GET  /api/admin/accounts?user_id=xxx  – List a user's game accounts (admin view)
 * DELETE /api/admin/accounts?id=xxx     – Delete any game account (admin)
 */
import { json, error, requireAdmin } from "../_helpers.js";

export async function onRequestGet(context) {
  const { data } = context;
  const adminErr = requireAdmin(data);
  if (adminErr) return adminErr;

  try {
    const url = new URL(context.request.url);
    const userId = url.searchParams.get("user_id");

    let query = data.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id, display_name, zone, server, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: accounts, error: dbErr } = await query;
    if (dbErr) return error(dbErr.message, 500);

    return json({ accounts });
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestDelete(context) {
  const { data } = context;
  const adminErr = requireAdmin(data);
  if (adminErr) return adminErr;

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");
    if (!id) return error("Account id is required");

    // Get account for logging
    const { data: account } = await data.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id, display_name")
      .eq("id", id)
      .single();

    if (!account) return error("Account not found", 404);

    const { error: dbErr } = await data.supabaseAdmin
      .from("game_accounts")
      .delete()
      .eq("id", id);

    if (dbErr) return error(dbErr.message, 500);

    // Log the action
    await data.supabaseAdmin.from("admin_logs").insert({
      admin_id: data.user.id,
      action: "delete_account",
      target_user_id: account.user_id,
      target_account_id: id,
      details: { display_name: account.display_name },
    });

    return json({ success: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
