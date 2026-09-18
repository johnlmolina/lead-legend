import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * RLS-scoped client for Server Components/Actions/Route Handlers — every
 * query through this client is subject to Postgres RLS policies for the
 * signed-in user. Never a global: Supabase's own guidance is to create a new
 * client per request (Fluid compute keeps warm instances across requests).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore since the
            // proxy is what actually refreshes the session cookie.
          }
        },
      },
    }
  );
}
