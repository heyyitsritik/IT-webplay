/**
 * GET    /api/admin/accounts?user_id=xxx – List a user's game accounts (admin)
 * DELETE /api/admin/accounts?id=xxx      – Delete any game account (admin)
 */
import { json, error, requireAdmin } from "../helpers.js";

export async function handleAdminAccounts(request, method, ctx) {
  if (method === "GET") return listAccounts(request, ctx);
  if (method === "DELETE") return deleteAccount(request, ctx);
  return error("Method not allowed", 405);
}

async function listAccounts(request, ctx) {
  const adminErr = requireAdmin(ctx);
  if (adminErr) return adminErr;

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");

    let query = ctx.supabaseAdmin
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

async function deleteAccount(request, ctx) {
  const adminErr = requireAdmin(ctx);
  if (adminErr) return adminErr;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return error("Account id is required");

    // Get account for logging
    const { data: account } = await ctx.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id, display_name")
      .eq("id", id)
      .single();

    if (!account) return error("Account not found", 404);

    const { error: dbErr } = await ctx.supabaseAdmin
      .from("game_accounts")
      .delete()
      .eq("id", id);

    if (dbErr) return error(dbErr.message, 500);

    // Log the action
    await ctx.supabaseAdmin.from("admin_logs").insert({
      admin_id: ctx.user.id,
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
