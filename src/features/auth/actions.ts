"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchoolSchema } from "./schemas";
import { type UserRole } from "@/types/database";

/**
 * Action serveur de connexion unifiée SUKULU
 */
export async function loginAction(formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Données de connexion invalides.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: "Identifiants invalides ou compte introuvable.",
    };
  }

  // Déterminer l'espace d'atterrissage selon le rôle
  let role: UserRole | string | undefined = data.user?.app_metadata?.role;

  // Si le rôle n'est pas encore dans le JWT, recherche dans la table profiles
  if (!role && data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile) {
      role = profile.role;
    }
  }

  let redirectPath = "/admin";
  if (role === "enseignant") {
    redirectPath = "/teacher";
  } else if (role === "parent") {
    redirectPath = "/parent";
  }

  return { success: true, redirectPath };
}

/**
 * Action serveur d'onboarding complet : création de l'école et du premier compte Direction
 */
export async function registerSchoolAction(formData: FormData) {
  const rawData = {
    schoolName: formData.get("schoolName"),
    schoolCode: formData.get("schoolCode"),
    country: formData.get("country") || "Togo",
    city: formData.get("city"),
    currency: formData.get("currency") || "XOF",
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = registerSchoolSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Données d'inscription invalides.",
    };
  }

  const supabase = await createClient();

  // 1. Inscription dans Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        role: "direction",
      },
    },
  });

  if (authError || !authData.user) {
    return {
      error: authError?.message || "Erreur lors de la création du compte administrateur.",
    };
  }

  // 2. Création de l'établissement dans la table schools
  const { data: schoolData, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: parsed.data.schoolName,
      code: parsed.data.schoolCode,
      country: parsed.data.country,
      city: parsed.data.city,
      currency: parsed.data.currency,
      status: "active",
    })
    .select("id")
    .single();

  if (schoolError || !schoolData) {
    return {
      error: "Impossible d'enregistrer l'établissement (ce code d'école est probablement déjà utilisé).",
    };
  }

  // 3. Liaison de l'utilisateur à l'école dans public.profiles
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    school_id: schoolData.id,
    role: "direction",
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email,
    is_active: true,
  });

  if (profileError) {
    return {
      error: "Erreur lors de la création du profil de direction.",
    };
  }

  return { success: true, redirectPath: "/admin" };
}

/**
 * Action serveur de déconnexion
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
