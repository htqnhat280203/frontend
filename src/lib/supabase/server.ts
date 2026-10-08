import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabaseEnvironment } from "./env";

export async function createClient() {
  const environment = getSupabaseEnvironment();
  if (!environment) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(environment.url, environment.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; the Next proxy handles refreshes.
        }
      },
    },
  });
}