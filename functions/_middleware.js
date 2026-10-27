/**
 * Cloudflare Pages middleware – runs before every /api/* handler.
 * - Creates a Supabase admin client (service-role)
 * - Extracts + verifies the caller's JWT
 * - Attaches { user, role, supabaseAdmin } to context.data
 */
import { createClient } from "@supabase/supabase-js";

export async function onRequest(context) {
  const { env, request, next, data } = context;

  // Supabase admin client (service role – never expose to browser)
  const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  data.supabaseAdmin = supabaseAdmin;
  data.env = env;

  // Extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (user && !error) {
        data.user = user;

        // Fetch role from profiles
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        data.role = profile?.role || "user";
      }
    } catch {
      // Invalid token – continue as unauthenticated
    }
  }

  return next();
}
