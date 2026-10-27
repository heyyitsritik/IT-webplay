/**
 * Shared helpers for Cloudflare Pages Functions.
 */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function requireAuth(data) {
  if (!data.user) {
    const reason = data.authDebug || "no token provided";
    return error("Unauthorized: " + reason, 401);
  }
  return null;
}

export function requireAdmin(data) {
  const authErr = requireAuth(data);
  if (authErr) return authErr;
  if (data.role !== "admin") {
    return error("Forbidden: admin access required", 403);
  }
  return null;
}
