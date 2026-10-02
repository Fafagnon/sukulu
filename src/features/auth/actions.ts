"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signUpSchema, onboardingSchema } from "./schemas";
import { type UserRole } from "@/types/database";

const isDevPlaceholder = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Action serveur de connexion SUKULU (Image 2 - Welcome Back)
 */
export async function loginAction(formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Données de connexion invalides.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/admin" };
      }
      return {
        error: "Identifiants invalides ou compte introuvable.",
      };
    }

    // Vérifier le profil de l'utilisateur
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, school_id")
      .eq("id", data.user.id)
      .maybeSingle();

    // Si l'utilisateur n'a pas encore configuré son établissement, l'orienter vers l'onboarding
    if (!profile?.school_id) {
      return { success: true, redirectPath: "/onboarding" };
    }

    let redirectPath = "/admin";
    if (profile.role === "enseignant") {
      redirectPath = "/teacher";
    } else if (profile.role === "parent") {
      redirectPath = "/parent";
    }

    return { success: true, redirectPath };
  } catch {
    if (isDevPlaceholder()) {
      return { success: true, redirectPath: "/admin" };
    }
    return {
      error: "Erreur de communication avec le serveur d'authentification.",
    };
  }
}

/**
 * Action serveur de création de compte Direction (Image 2 - Create Account)
 */
export async function signUpAction(formData: FormData) {
  const rawData = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Données d'inscription invalides.",
    };
  }

  const fullName = parsed.data.fullName.trim();
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "Administrateur";
  const lastName = nameParts.slice(1).join(" ") || "Direction";

  try {
    const supabase = await createClient();

    // 1. Inscription dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: "direction",
        },
      },
    });

    if (authError || !authData.user) {
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/onboarding" };
      }
      return {
        error: authError?.message || "Erreur lors de la création du compte.",
      };
    }

    // 2. Création du profil initial (sans school_id encore rattaché, en attente de l'onboarding)
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authData.user.id,
      school_id: null,
      role: "direction",
      first_name: firstName,
      last_name: lastName,
      email: parsed.data.email,
      is_active: true,
    });

    if (profileError) {
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/onboarding" };
      }
      return {
        error: "Erreur lors de l'initialisation du profil. Veuillez réessayer.",
      };
    }

    return { success: true, redirectPath: "/onboarding" };
  } catch {
    if (isDevPlaceholder()) {
      return { success: true, redirectPath: "/onboarding" };
    }
    return {
      error: "Erreur de communication avec le serveur d'authentification.",
    };
  }
}

/**
 * Action serveur d'onboarding complet de l'établissement (Image 1 - Stepper)
 */
export async function submitOnboardingAction(data: {
  schoolType: string;
  schoolName: string;
  schoolCode: string;
  city: string;
  country: string;
  currency?: string;
  periodType?: "trimestre" | "semestre";
  priorities?: string[];
}) {
  const payload = {
    ...data,
    currency: data.currency || "XOF",
    periodType: data.periodType || "trimestre",
    priorities: data.priorities || [],
  };

  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Données de configuration invalides.",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/admin" };
      }
      return {
        error: "Session expirée. Veuillez vous reconnecter pour finaliser la configuration.",
      };
    }

    // 1. Création de l'établissement dans la table schools avec ID pré-généré (évite le blocage RLS RETURNING)
    const newSchoolId = crypto.randomUUID();
    const { error: schoolError } = await supabase
      .from("schools")
      .insert({
        id: newSchoolId,
        name: parsed.data.schoolName.trim(),
        short_name: parsed.data.schoolCode.trim().toUpperCase(),
        code: parsed.data.schoolCode.trim().toUpperCase(),
        country: parsed.data.country,
        city: parsed.data.city.trim(),
        currency: parsed.data.currency,
        academic_settings: {
          school_type: parsed.data.schoolType,
          period_type: parsed.data.periodType,
          priorities: parsed.data.priorities,
          grading_scale: 20,
        },
        status: "active",
      });

    if (schoolError) {
      if (schoolError?.code === "23505") {
        return {
          error: "Ce code d'établissement est déjà utilisé. Veuillez en choisir un autre (ex: CPL2, ND-LOME).",
        };
      }
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/admin" };
      }
      return {
        error: schoolError?.message || "Impossible de créer l'établissement. Veuillez réessayer.",
      };
    }

    // 2. Rattachement du profil de direction à la nouvelle école
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        school_id: newSchoolId,
        role: "direction",
      })
      .eq("id", user.id);

    if (updateProfileError && !isDevPlaceholder()) {
      return {
        error: "Impossible d'associer votre profil à l'établissement. Contactez le support.",
      };
    }

    // 3. Initialisation de l'année scolaire en cours (2026-2027)
    const academicYearId = crypto.randomUUID();
    const { error: yearError } = await supabase
      .from("academic_years")
      .insert({
        id: academicYearId,
        school_id: newSchoolId,
        name: "2026-2027",
        start_date: "2026-09-01",
        end_date: "2027-06-30",
        is_active: true,
      });

    // 4. Initialisation des périodes académiques par défaut
    if (!yearError) {
      if (parsed.data.periodType === "trimestre") {
        await supabase.from("periods").insert([
          {
            school_id: newSchoolId,
            academic_year_id: academicYearId,
            name: "1er Trimestre",
            type: "trimestre",
            order_index: 1,
            start_date: "2026-09-01",
            end_date: "2026-12-20",
            status: "open",
          },
          {
            school_id: newSchoolId,
            academic_year_id: academicYearId,
            name: "2ème Trimestre",
            type: "trimestre",
            order_index: 2,
            start_date: "2027-01-05",
            end_date: "2027-03-31",
            status: "locked",
          },
          {
            school_id: newSchoolId,
            academic_year_id: academicYearId,
            name: "3ème Trimestre",
            type: "trimestre",
            order_index: 3,
            start_date: "2027-04-10",
            end_date: "2027-06-30",
            status: "locked",
          },
        ]);
      } else {
        await supabase.from("periods").insert([
          {
            school_id: newSchoolId,
            academic_year_id: academicYearId,
            name: "1er Semestre",
            type: "semestre",
            order_index: 1,
            start_date: "2026-09-01",
            end_date: "2027-01-31",
            status: "open",
          },
          {
            school_id: newSchoolId,
            academic_year_id: academicYearId,
            name: "2ème Semestre",
            type: "semestre",
            order_index: 2,
            start_date: "2027-02-15",
            end_date: "2027-06-30",
            status: "locked",
          },
        ]);
      }
    }

    return { success: true, redirectPath: "/admin" };
  } catch {
    if (isDevPlaceholder()) {
      return { success: true, redirectPath: "/admin" };
    }
    return {
      error: "Erreur lors de la configuration de l'établissement.",
    };
  }
}

/**
 * Action serveur de déconnexion
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
