/**
 * POST /api/migrate
 *
 * Imports game accounts from localStorage format.
 * Body: { accounts: [{ username, password, displayName, zone, server }, ...] }
 */
import { encrypt } from "../crypto.js";
import { json, error, requireAuth } from "../helpers.js";

export async function handleMigrate(request, method, ctx) {
  if (method !== "POST") return error("Method not allowed", 405);

  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { accounts } = body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return error("accounts array is required");
    }

    if (accounts.length > 100) {
      return error("Maximum 100 accounts per migration");
    }

    const rows = [];
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i];
      if (!a.username || !a.password) continue;

      rows.push({
        user_id: ctx.user.id,
        display_name: a.displayName || a.display_name || `Account ${i + 1}`,
        username_enc: await encrypt(a.username, ctx.env),
        password_enc: await encrypt(a.password, ctx.env),
        zone: a.zone || "E",
        server: parseInt(a.server) || 1,
        sort_order: i,
        device_no: crypto.randomUUID(),
      });
    }

    if (rows.length === 0) {
      return error("No valid accounts to migrate");
    }

    const { data: inserted, error: dbErr } = await ctx.supabaseAdmin
      .from("game_accounts")
      .insert(rows)
      .select("id, display_name, zone, server, sort_order");

    if (dbErr) return error(dbErr.message, 500);
    return json({ migrated: inserted.length, accounts: inserted });
  } catch (e) {
    return error(e.message, 500);
  }
}
