/**
 * POST /api/migrate
 *
 * Imports game accounts from localStorage format.
 * Body: { accounts: [{ username, password, displayName, zone, server }, ...] }
 *
 * Encrypts each credential pair server-side before storing.
 */
import { encrypt } from "./_crypto.js";
import { json, error, requireAuth } from "./_helpers.js";

export async function onRequestPost(context) {
  const { data } = context;
  const authErr = requireAuth(data);
  if (authErr) return authErr;

  try {
    const body = await context.request.json();
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
        user_id: data.user.id,
        display_name: a.displayName || a.display_name || `Account ${i + 1}`,
        username_enc: await encrypt(a.username, data.env),
        password_enc: await encrypt(a.password, data.env),
        zone: a.zone || "E",
        server: parseInt(a.server) || 1,
        sort_order: i,
        device_no: crypto.randomUUID(),
      });
    }

    if (rows.length === 0) {
      return error("No valid accounts to migrate");
    }

    const { data: inserted, error: dbErr } = await data.supabaseAdmin
      .from("game_accounts")
      .insert(rows)
      .select("id, display_name, zone, server, sort_order");

    if (dbErr) return error(dbErr.message, 500);
    return json({ migrated: inserted.length, accounts: inserted });
  } catch (e) {
    return error(e.message, 500);
  }
}
