export const getSupabaseConfigurationIssue = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url && !publishableKey) return null;
  if (!url) return "Thiếu NEXT_PUBLIC_SUPABASE_URL trong environment variables.";
  if (!publishableKey) return "Thiếu NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong environment variables.";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL không phải URL hợp lệ.";
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname === "your-project-id.supabase.co" ||
    /your-project|placeholder|xxxxx/i.test(parsedUrl.hostname)
  ) {
    return "NEXT_PUBLIC_SUPABASE_URL vẫn là URL mẫu. Hãy thay bằng Project URL thật trong Supabase Settings → API.";
  }

  return null;
};

export const getSupabaseEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey || getSupabaseConfigurationIssue()) {
    return null;
  }

  return { url, publishableKey };
};

export const getAdminEmails = () =>
  (process.env.SUPABASE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const getSupabaseServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = () => getSupabaseEnvironment() !== null;