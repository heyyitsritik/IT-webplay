/**
 * POST /api/accounts  – Create a new game account (encrypts credentials server-side)
 * PUT  /api/accounts  – Update an existing game account
 *
 * Body: { display_name, username, password, zone, server, sort_order }
 * PUT also requires: { id }
 */
import { encrypt } from "./_crypto.js";
import { json, error, requireAuth } from "./_helpers.js";

export async function onRequestPost(context) {
  const { data } = context;
  const authErr = requireAuth(data);
  if (authErr) return authErr;

  try {
    const body = await context.request.json();
    const { display_name, username, password, zone, server, sort_order } = body;

    if (!display_name || !username || !password || !zone || server == null) {
      return error("Missing required fields");
    }

    // Encrypt credentials server-side
    const username_enc = await encrypt(username, data.env);
    const password_enc = await encrypt(password, data.env);

    // Generate stable device_no for this account
    const device_no = crypto.randomUUID();

    const { data: account, error: dbErr } = await data.supabaseAdmin
      .from("game_accounts")
      .insert({
        user_id: data.user.id,
        display_name,
        username_enc,
        password_enc,
        zone,
        server: parseInt(server),
        sort_order: sort_order ?? 0,
        device_no,
      })
      .select("id, display_name, zone, server, sort_order, device_no, created_at")
      .single();

    if (dbErr) return error(dbErr.message, 500);
    return json(account, 201);
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestPut(context) {
  const { data } = context;
  const authErr = requireAuth(data);
  if (authErr) return authErr;

  try {
    const body = await context.request.json();
    const { id, display_name, username, password, zone, server, sort_order } = body;

    if (!id) return error("Account id is required");

    // Verify ownership
    const { data: existing } = await data.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== data.user.id) {
      return error("Account not found", 404);
    }

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (zone !== undefined) updates.zone = zone;
    if (server !== undefined) updates.server = parseInt(server);
    if (sort_order !== undefined) updates.sort_order = sort_order;

    // Re-encrypt if credentials changed
    if (username !== undefined) {
      updates.username_enc = await encrypt(username, data.env);
    }
    if (password !== undefined) {
      updates.password_enc = await encrypt(password, data.env);
    }

    const { data: updated, error: dbErr } = await data.supabaseAdmin
      .from("game_accounts")
      .update(updates)
      .eq("id", id)
      .select("id, display_name, zone, server, sort_order, device_no, updated_at")
      .single();

    if (dbErr) return error(dbErr.message, 500);
    return json(updated);
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestDelete(context) {
  const { data } = context;
  const authErr = requireAuth(data);
  if (authErr) return authErr;

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");
    if (!id) return error("Account id is required");

    // Verify ownership
    const { data: existing } = await data.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== data.user.id) {
      return error("Account not found", 404);
    }

    const { error: dbErr } = await data.supabaseAdmin
      .from("game_accounts")
      .delete()
      .eq("id", id);

    if (dbErr) return error(dbErr.message, 500);
    return json({ success: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
