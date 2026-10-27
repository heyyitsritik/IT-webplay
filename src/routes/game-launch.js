import { decrypt } from "../crypto.js";
import { json, error, requireAuth } from "../helpers.js";

const GAME_API = "https://m-xmjen.hkpctimes.com/api/index.php";
const GAME_CDN_TW = "https://xztwcdn.hkpctimes.com/staticOne/global.html";

export async function handleGameLaunch(request, method, ctx) {
  if (method !== "POST") return error("Method not allowed", 405);

  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { account_id } = body;
    if (!account_id) return error("account_id is required");

    const { data: account, error: dbErr } = await ctx.supabaseAdmin
      .from("game_accounts")
      .select("*")
      .eq("id", account_id)
      .single();

    if (dbErr || !account) return error("Account not found", 404);
    if (account.user_id !== ctx.user.id) {
      return error("Account not found", 404);
    }

    const username = await decrypt(account.username_enc, ctx.env);
    const password = await decrypt(account.password_enc, ctx.env);
    const deviceNo = account.device_no || crypto.randomUUID();

    // Step 1: user.login
    const loginUrl = new URL(GAME_API);
    loginUrl.searchParams.set("phone_brand", "oneplus");
    loginUrl.searchParams.set("device_no", deviceNo);
    loginUrl.searchParams.set("user_name", username);
    loginUrl.searchParams.set("password", password);
    loginUrl.searchParams.set("action", "user.login");
    loginUrl.searchParams.set("lang", "en-US");
    loginUrl.searchParams.set("promote", "17");
    loginUrl.searchParams.set("game_id", "1704");

    const loginRes = await fetch(loginUrl.toString(), {
      method: "POST",
      redirect: "follow",
    });
    if (!loginRes.ok) {
      return error("Game login failed: HTTP " + loginRes.status, 502);
    }
    const loginBody = await loginRes.json();
    if (!loginBody.status) {
      return error(
        "Game login rejected: " + (loginBody.msg || "unknown error"),
        401
      );
    }
    const token = loginBody.token;

    // Step 2: game.info
    const infoUrl = new URL(GAME_API);
    infoUrl.searchParams.set("phone_brand", "oneplus");
    infoUrl.searchParams.set("device_no", deviceNo);
    infoUrl.searchParams.set("token", token);
    infoUrl.searchParams.set("action", "game.info");
    infoUrl.searchParams.set("lang", "en-US");
    infoUrl.searchParams.set("promote", "17");
    infoUrl.searchParams.set("id", "1704");

    const infoRes = await fetch(infoUrl.toString(), {
      method: "GET",
      redirect: "follow",
    });
    if (!infoRes.ok) {
      return error("Game info failed: HTTP " + infoRes.status, 502);
    }
    const infoBody = await infoRes.json();
    if (!infoBody.status) {
      return error("Game info rejected", 502);
    }

    // Extract accessToken (regex to avoid + decode bug)
    const downUrl = infoBody.down_url;
    const atMatch = downUrl.match(/accessToken=([^&]+)/);
    if (!atMatch) {
      return error("Could not extract accessToken", 502);
    }
    const accessToken = atMatch[1];

    const tz = account.zone === "W" ? "-5" : "+5";
    const gameUrl = `${GAME_CDN_TW}?locate=en_us&pf=gcathkh5&gv=release&accessToken=${accessToken}&timeZone=${encodeURIComponent(tz)}`;

    return json({ game_url: gameUrl });
  } catch (e) {
    return error("Launch failed: " + e.message, 500);
  }
}
