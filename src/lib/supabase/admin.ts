import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAdminEmails } from "./env";
import { createClient } from "./server";

export type AdminAccess =
  | { client: SupabaseClient<Database>; user: User; error: null }
  | { client: null; user: null; error: "not_configured" | "unauthorized" | "forbidden" };

export async function requireAdmin(): Promise<AdminAccess> {
  const client = await createClient();
  if (!client) return { client: null, user: null, error: "not_configured" };

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { client: null, user: null, error: "unauthorized" };

  const adminEmails = getAdminEmails();
  const normalizedEmail = data.user.email?.trim().toLowerCase() ?? "";
  const isAdminByRole =
    data.user.app_metadata?.role === "admin" || data.user.user_metadata?.role === "admin";
  const isAdminByEmail = adminEmails.includes(normalizedEmail);

  if (!isAdminByRole && !isAdminByEmail) {
    return { client: null, user: null, error: "forbidden" };
  }

  return { client, user: data.user, error: null };
}