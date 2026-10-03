import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedSchoolContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string } | null;
  profile: {
    school_id: string | null;
    role: string;
    first_name: string;
    last_name: string;
  } | null;
  school: {
    id: string;
    name: string;
    code: string | null;
    short_name: string | null;
    country: string | null;
    currency: string | null;
  } | null;
  schoolId: string;
  role: string;
  country: string;
}

/**
 * Contexte d'authentification et d'établissement mis en cache par requête HTTP.
 * Réduit drastiquement le nombre d'appels Supabase en éliminant les requêtes redondantes
 * entre le Layout et les Pages.
 */
export const getAuthenticatedSchoolContext = cache(async (): Promise<AuthenticatedSchoolContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.school_id) {
      const { data: school } = await supabase
        .from("schools")
        .select("id, name, code, short_name, country, currency")
        .eq("id", profile.school_id)
        .maybeSingle();

      return {
        supabase,
        user,
        profile,
        school,
        schoolId: profile.school_id,
        role: profile.role,
        country: school?.country || "Togo",
      };
    }
  }

  // Aucun établissement rattaché : on n'invente JAMAIS de contexte par défaut.
  // (Le ancien fallback `.limit(1)` + rôle "direction" fabriqué permettait à
  // tout compte non rattaché d'agir sur n'importe quel tenant.)
  throw new Error(
    "Aucun établissement rattaché à ce compte. Veuillez compléter l'onboarding."
  );
});
