import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/database";
import { REMEMBER_COOKIE, REMEMBER_MAX_AGE, applyRememberMe } from "./persistence";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const remembered = cookieStore.get(REMEMBER_COOKIE)?.value === "1";
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, applyRememberMe(options, remembered))
          );
        } catch {
          // Géré par le proxy en cas d'appel depuis un Server Component pur
        }
      },
    },
  });
}

export { REMEMBER_COOKIE, REMEMBER_MAX_AGE };

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
