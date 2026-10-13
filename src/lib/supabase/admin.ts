import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAdminEmails, getSupabaseEnvironment, getSupabaseServiceRoleKey } from "./env";
import { createClient } from "./server";

export type AdminAccess =
  | { client: SupabaseClient<Database>; user: User; error: null }
  | { client: null; user: null; error: "not_configured" | "unauthorized" | "forbidden" };

export async function requireAdmin(): Promise<AdminAccess> {
  const sessionClient = await createClient();
  if (!sessionClient) return { client: null, user: null, error: "not_configured" };

  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) return { client: null, user: null, error: "unauthorized" };

  const adminEmails = getAdminEmails();
  const normalizedEmail = data.user.email?.trim().toLowerCase() ?? "";
  const isAdminByRole = data.user.app_metadata?.role === "admin";
  const isAdminByEmail = adminEmails.includes(normalizedEmail);

  if (!isAdminByRole && !isAdminByEmail) {
    return { client: null, user: null, error: "forbidden" };
  }

  const environment = getSupabaseEnvironment();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!environment || !serviceRoleKey) return { client: null, user: null, error: "not_configured" };

  const adminClient = createSupabaseClient<Database>(environment.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { client: adminClient, user: data.user, error: null };
}