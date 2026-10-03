"use server";

import { revalidatePath } from "next/cache";

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
import { logAuditEvent } from "@/lib/audit";

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

    // 1. Vérifier si un compte existe déjà pour cet email (profil = source de vérité multi-tenant).
    // On ne parcourt PAS auth.users (vol cross-tenant + page de 50 max).
    const { data: existingProfile, error: profileLookupErr } = await admin
      .from("profiles")
      .select("id, school_id, role")
      .ilike("email", email)
      .limit(1);

    if (profileLookupErr) throw profileLookupErr;

    let userId: string | null = existingProfile?.[0]?.id ?? null;
    let inviteLink: string | null = null;
    let tempPassword: string | null = null;

    if (userId && existingProfile![0].school_id && existingProfile![0].school_id !== schoolId) {
      return { error: "Un compte est déjà rattaché à un autre établissement pour cet email." };
    }

    if (userId) {
      // Compte déjà présent dans cette école : on vérifie qu'aucun profil enseignant n'existe déjà
      const { data: existingTeacher } = await admin
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      if (existingTeacher && existingTeacher.length > 0) {
        return { error: "Cet enseignant est déjà enregistré." };
      }
    } else {
      // Créer le compte utilisateur avec un mot de passe fort, puis générer une invitation
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
      tempPassword = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

      const { data: newAuthUser, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
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

      // Lien d'invitation à communiquer à l'enseignant (valable une fois, expire)
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
      });
      if (!linkErr && linkData?.properties?.action_link) {
        inviteLink = linkData.properties.action_link;
      }
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

    void logAuditEvent({
      schoolId,
      action: "create",
      entityType: "teacher",
      entityId: userId!,
      newData: { first_name: firstName, last_name: lastName, email, matricule: teacherMatricule },
    });

    revalidatePath("/admin/teachers");
    return { success: true, inviteLink, tempPassword };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de l'enseignant.";
    return { error: message };
  }
}
