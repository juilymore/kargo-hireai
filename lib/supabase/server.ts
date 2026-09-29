import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Server-only (API routes, Server Components) — never
// import this from a Client Component or expose the key to the browser.
// No auth/RLS in v1, so this is the only Supabase client the app uses; all
// browser interaction goes through Next.js API routes, never directly to
// Supabase, so no anon key is needed yet.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
