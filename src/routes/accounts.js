import { encrypt } from "../crypto.js";
import { json, error, requireAuth } from "../helpers.js";

export async function handleAccounts(request, method, ctx) {
  if (method === "POST") return createAccount(request, ctx);
  if (method === "PUT") return updateAccount(request, ctx);
  if (method === "DELETE") return deleteAccount(request, ctx);
  return error("Method not allowed", 405);
}

async function createAccount(request, ctx) {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { display_name, username, password, zone, server, sort_order } = body;

    if (!display_name || !username || !password || !zone || server == null) {
      return error("Missing required fields");
    }

    const username_enc = await encrypt(username, ctx.env);
    const password_enc = await encrypt(password, ctx.env);
    const device_no = crypto.randomUUID();

    const { data: account, error: dbErr } = await ctx.supabaseAdmin
      .from("game_accounts")
      .insert({
        user_id: ctx.user.id,
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

async function updateAccount(request, ctx) {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { id, display_name, username, password, zone, server, sort_order } = body;

    if (!id) return error("Account id is required");

    const { data: existing } = await ctx.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== ctx.user.id) {
      return error("Account not found", 404);
    }

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (zone !== undefined) updates.zone = zone;
    if (server !== undefined) updates.server = parseInt(server);
    if (sort_order !== undefined) updates.sort_order = sort_order;

    if (username !== undefined) {
      updates.username_enc = await encrypt(username, ctx.env);
    }
    if (password !== undefined) {
      updates.password_enc = await encrypt(password, ctx.env);
    }

    const { data: updated, error: dbErr } = await ctx.supabaseAdmin
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

async function deleteAccount(request, ctx) {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return error("Account id is required");

    const { data: existing } = await ctx.supabaseAdmin
      .from("game_accounts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== ctx.user.id) {
      return error("Account not found", 404);
    }

    const { error: dbErr } = await ctx.supabaseAdmin
      .from("game_accounts")
      .delete()
      .eq("id", id);

    if (dbErr) return error(dbErr.message, 500);
    return json({ success: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
