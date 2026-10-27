import { json, error, requireAuth } from "../helpers.js";

export async function handleAccountsReorder(request, method, ctx) {
  if (method !== "POST") return error("Method not allowed", 405);

  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return error("order array is required");
    }

    for (const item of order) {
      const { error: dbErr } = await ctx.supabaseAdmin
        .from("game_accounts")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("user_id", ctx.user.id);

      if (dbErr) return error(dbErr.message, 500);
    }

    return json({ success: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
