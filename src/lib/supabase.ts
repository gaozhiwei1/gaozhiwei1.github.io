import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
let client: SupabaseClient | null = null;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const configuredOAuthProviders = {
  google: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true",
  github: import.meta.env.VITE_ENABLE_GITHUB_AUTH === "true",
};
