/**
 * POST /api/accounts-reorder
 *
 * Body: { order: [{ id: string, sort_order: number }, ...] }
 * Updates sort_order for all accounts in one batch.
 */
import { json, error, requireAuth } from "./_helpers.js";

export async function onRequestPost(context) {
  const { data } = context;
  const authErr = requireAuth(data);
  if (authErr) return authErr;

  try {
    const body = await context.request.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return error("order array is required");
    }

    // Update each account's sort_order (verify ownership)
    for (const item of order) {
      const { error: dbErr } = await data.supabaseAdmin
        .from("game_accounts")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("user_id", data.user.id);

      if (dbErr) return error(dbErr.message, 500);
    }

    return json({ success: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
