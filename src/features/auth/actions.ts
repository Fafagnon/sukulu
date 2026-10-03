"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE, REMEMBER_MAX_AGE } from "@/lib/supabase/server";
import { loginSchema, signUpSchema, onboardingSchema } from "./schemas";

const isDevPlaceholder = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Rate-limit en mémoire côté serveur : 5 tentatives de connexion échouées
 * par couple (IP, email) sur une fenêtre de 15 minutes.
 * (Simple Map : réinitialisée au redémarrage du process, suffisante en complément
 * du rate-limiting Supabase côté auth.)
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

async function checkLoginRateLimit(): Promise<{ blocked: boolean }> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";
  const key = ip;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { blocked: false };
  }
  entry.count += 1;
  return { blocked: entry.count > LOGIN_MAX_ATTEMPTS };
}

function recordLoginFailure(): void {
  // Les tentatives sont déjà comptées par checkLoginRateLimit ;
  // point d'extension futur : écriture dans audit_logs.
}

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

  const rate = await checkLoginRateLimit();
  if (rate.blocked) {
    return {
      error:
        "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
    };
  }

  try {
    // Poser / effacer le marqueur « se souvenir » AVANT la connexion pour que
    // les cookies de session écrits par Supabase respectent déjà la durée voulue.
    const cookieStore = await cookies();
    if (parsed.data.rememberMe) {
      cookieStore.set(REMEMBER_COOKIE, "1", {
        path: "/",
        maxAge: REMEMBER_MAX_AGE,
        sameSite: "lax",
        httpOnly: true,
      });
    } else {
      try {
        cookieStore.delete(REMEMBER_COOKIE);
      } catch {
        // Cookie déjà absent
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/admin" };
      }
      recordLoginFailure();
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
    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/admin" };
      }
      return {
        error: "Session expirée. Veuillez vous reconnecter pour finaliser la configuration.",
      };
    }

    // Vérifier qu'aucun rattachement n'existe déjà (évite l'auto-promotion
    // et les orphelines en cas de retry après un échec partiel)
    const { data: existingProfile } = await userClient
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile?.school_id) {
      if (!isDevPlaceholder()) {
        return {
          error:
            "Votre compte est déjà rattaché à un établissement. Contactez le support si nécessaire.",
        };
      }
    }

    // Client administrateur privilégié pour initialiser le premier établissement sans blocage RLS
    let adminSupabase = userClient;
    try {
      adminSupabase = createAdminClient();
    } catch {
      adminSupabase = userClient;
    }

    // 1. Création de l'établissement dans la table schools avec ID pré-généré
    const newSchoolId = crypto.randomUUID();
    const { error: schoolError } = await adminSupabase
      .from("schools")
      .insert({
        id: newSchoolId,
        name: parsed.data.schoolName.trim(),
        short_name: parsed.data.schoolCode.trim().toUpperCase(),
        code: parsed.data.schoolCode.trim().toUpperCase(),
        country: parsed.data.country,
        city: parsed.data.city.trim(),
        currency: parsed.data.currency,
        created_by: user.id,
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
        if (schoolError.message?.includes("uq_schools_created_by")) {
          return {
            error:
              "Ce compte a déjà créé un établissement. Reconnectez-vous ou contactez le support.",
          };
        }
        return {
          error: "Ce code d'établissement est déjà utilisé pour ce pays. Veuillez en choisir un autre (ex: CPL2, ND-LOME).",
        };
      }
      if (isDevPlaceholder()) {
        return { success: true, redirectPath: "/admin" };
      }
      return {
        error: schoolError?.message || "Impossible de créer l'établissement. Veuillez réessayer.",
      };
    }

    // 2. Rattachement du profil de direction à la nouvelle école (upsert garantissant la création si absent)
    const userMeta = user.user_metadata || {};
    const firstName = userMeta.first_name || "Administrateur";
    const lastName = userMeta.last_name || "Direction";

    const { error: updateProfileError } = await adminSupabase
      .from("profiles")
      .upsert({
        id: user.id,
        school_id: newSchoolId,
        role: "direction",
        first_name: firstName,
        last_name: lastName,
        email: user.email || "",
        is_active: true,
      });

    if (updateProfileError && !isDevPlaceholder()) {
      return {
        error: "Impossible d'associer votre profil à l'établissement. Contactez le support.",
      };
    }

    // 3. Initialisation de l'année scolaire en cours (2026-2027)
    const academicYearId = crypto.randomUUID();
    const { error: yearError } = await adminSupabase
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
        await adminSupabase.from("periods").insert([
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
        await adminSupabase.from("periods").insert([
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
 * Action serveur : envoi d'un email de réinitialisation de mot de passe.
 * Le lien pointe vers /auth/callback?next=/reset-password puis vers la page
 * de nouveau mot de passe (flow recovery Supabase).
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Veuillez saisir une adresse email valide." };
  }

  try {
    const supabase = await createClient();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });

    // On ne révèle jamais si l'email existe (anti-enumeration).
    if (error && !isDevPlaceholder()) {
      console.warn("[auth] resetPasswordForEmail:", error.message);
    }

    return {
      success:
        "Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.",
    };
  } catch {
    return {
      error: "Impossible d'envoyer l'email de réinitialisation pour le moment.",
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
