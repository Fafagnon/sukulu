"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
 * 1. Récupère l'annuaire des parents / tuteurs avec leurs enfants rattachés
 */
export async function getParents(search?: string) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    let query = supabase
      .from("parent_profiles")
      .select(`
        *,
        student_parents(
          id,
          relationship,
          is_primary,
          can_pickup,
          student:student_id(
            id,
            matricule,
            first_name,
            last_name,
            gender,
            status,
            enrollments(
              id,
              academic_year_id,
              classes(id, name, level)
            )
          )
        )
      `)
      .eq("school_id", schoolId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (search && search.trim().length > 0) {
      const s = search.trim();
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data: parents, error } = await query;
    if (error) throw error;
    return { data: parents || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des parents.";
    return { error: message, data: [] };
  }
}

/**
 * 2. Crée un nouveau profil parent
 */
export async function createParentAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const phoneSecondary = (formData.get("phoneSecondary") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const profession = (formData.get("profession") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;

    if (!firstName || !lastName || !phone) {
      return { error: "Le nom, le prénom et le téléphone sont obligatoires." };
    }

    const { data, error } = await supabase
      .from("parent_profiles")
      .insert({
        school_id: schoolId,
        first_name: firstName,
        last_name: lastName,
        phone,
        phone_secondary: phoneSecondary,
        email,
        profession,
        address,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin/parents");
    return { success: true, parentId: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création du parent.";
    return { error: message };
  }
}
