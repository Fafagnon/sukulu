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

import { getAuthenticatedSchoolContext } from "@/lib/auth-context";

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

import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";

/**
 * 2. Crée un nouveau profil enseignant
 */
export async function createTeacherAction(formData: FormData) {
  try {
    const { schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction de l'établissement." };
    }

    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const specialty = (formData.get("specialty") as string)?.trim() || null;

    if (!firstName || !lastName || !email) {
      return { error: "Nom, prénom et email sont obligatoires." };
    }

    const admin = createAdminClient();

    // 1. Vérifier si un compte auth existe déjà pour cet email
    let userId: string | null = null;
    const { data: usersData } = await admin.auth.admin.listUsers();
    const existingUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Créer le compte utilisateur dans Supabase Auth
      const tempPassword = `Sukulu@${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: newAuthUser, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "enseignant",
        },
      });

      if (authErr || !newAuthUser?.user) {
        throw new Error(authErr?.message || "Impossible de générer le compte enseignant.");
      }
      userId = newAuthUser.user.id;
    }

    // 2. Garantir le profil public lié à l'établissement
    const { error: profileErr } = await admin.from("profiles").upsert({
      id: userId,
      school_id: schoolId,
      role: "enseignant",
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      is_active: true,
    });

    if (profileErr) throw profileErr;

    // 3. Créer le profil enseignant rattaché (sans qualification ni date d'embauche)
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(100 + Math.random() * 900);
    const teacherMatricule = `ENS-${currentYear}-${randomNum}`;

    const { error: teacherErr } = await admin.from("teacher_profiles").insert({
      school_id: schoolId,
      user_id: userId,
      matricule: teacherMatricule,
      specialty,
      phone,
      status: "active",
    });

    if (teacherErr) throw teacherErr;

    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de l'enseignant.";
    return { error: message };
  }
}
