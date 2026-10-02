"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TeacherAssignment {
  id: string;
  coefficient: number;
  classes: {
    id: string;
    name: string;
    level: string;
    cycle: string;
  } | null;
  subjects: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface TeacherProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  teacher_profiles: {
    id: string;
    matricule: string | null;
    specialty: string | null;
    qualification: string | null;
    status: string;
    hire_date: string | null;
  } | null;
  assignments: TeacherAssignment[];
}

async function getAuthenticatedSchoolContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.school_id) {
      return { supabase, user, schoolId: profile.school_id, role: profile.role };
    }
  }

  const { data: defaultSchool } = await supabase
    .from("schools")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (defaultSchool) {
    return { supabase, user: null, schoolId: defaultSchool.id, role: "direction" as const };
  }

  throw new Error("Aucun établissement disponible.");
}

/**
 * 1. Récupère la liste des enseignants de l'école avec leurs matières et classes affectées
 */
export async function getTeachers(search?: string) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    // Récupérer les profils enseignants
    let query = supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        is_active,
        created_at,
        teacher_profiles(
          id,
          matricule,
          specialty,
          qualification,
          status,
          hire_date
        )
      `)
      .eq("school_id", schoolId)
      .eq("role", "enseignant")
      .order("last_name", { ascending: true });

    if (search && search.trim().length > 0) {
      const s = search.trim();
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data: teachers, error } = await query;
    if (error) throw error;

    // Récupérer les affectations de cours pour ces enseignants
    const teacherIds = (teachers || []).map((t) => t.id);
    const { data: assignments } = await supabase
      .from("class_subjects")
      .select(`
        id,
        teacher_id,
        coefficient,
        classes(id, name, level, cycle),
        subjects(id, name, code)
      `)
      .eq("school_id", schoolId)
      .in("teacher_id", teacherIds);

    // Rattacher les affectations et normaliser le profil enseignant
    const enriched = (teachers || []).map((t) => {
      const tp = Array.isArray(t.teacher_profiles)
        ? t.teacher_profiles[0] || null
        : t.teacher_profiles;

      return {
        ...t,
        teacher_profiles: tp,
        assignments: (assignments || []).filter((a) => a.teacher_id === t.id),
      };
    });

    return { data: enriched as unknown as TeacherProfile[] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des enseignants.";
    return { error: message, data: [] };
  }
}

/**
 * 2. Crée un nouveau profil enseignant
 */
export async function createTeacherAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction de l'établissement." };
    }

    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const specialty = (formData.get("specialty") as string)?.trim() || null;
    const qualification = (formData.get("qualification") as string)?.trim() || null;
    const hireDate = (formData.get("hireDate") as string)?.trim() || null;

    if (!firstName || !lastName || !email) {
      return { error: "Nom, prénom et email sont obligatoires." };
    }

    // 1. Créer ou récupérer le profil utilisateur
    // Vérifier si l'utilisateur existe déjà
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId = existingProfile?.id;

    if (!userId) {
      // Générer un UUID pour le profil (en prod via auth.admin ou invitation)
      const { data: newProfile, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          school_id: schoolId,
          role: "enseignant",
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          is_active: true,
        })
        .select("id")
        .single();

      if (profileErr) throw profileErr;
      userId = newProfile.id;
    }

    // 2. Créer le profil enseignant rattaché
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(100 + Math.random() * 900);
    const teacherMatricule = `ENS-${currentYear}-${randomNum}`;

    await supabase.from("teacher_profiles").insert({
      school_id: schoolId,
      user_id: userId,
      matricule: teacherMatricule,
      specialty,
      qualification,
      phone,
      hire_date: hireDate || null,
      status: "active",
    });

    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de l'enseignant.";
    return { error: message };
  }
}
