"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedSchoolContext } from "@/lib/auth-context";

/**
 * 1. Récupère le catalogue des matières de l'école
 */
export async function getSubjects() {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const { data: subjects, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (error) throw error;
    return { data: subjects || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des matières.";
    return { error: message, data: [] };
  }
}

/**
 * 2. Crée une nouvelle matière
 */
export async function createSubjectAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction de l'établissement." };
    }

    const name = formData.get("name") as string;
    const code = (formData.get("code") as string)?.toUpperCase();
    const description = (formData.get("description") as string) || null;

    if (!name || !code) {
      return { error: "Le nom et le code de la matière sont obligatoires." };
    }

    const { error } = await supabase.from("subjects").insert({
      school_id: schoolId,
      name: name.trim(),
      code: code.trim(),
      description: description ? description.trim() : null,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: `Une matière avec le code « ${code} » existe déjà.` };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { error: message };
  }
}

/**
 * 3. Initialise le catalogue officiel des matières (Togo / MENFP & Afrique francophone)
 */
export async function seedStandardSubjectsAction() {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const standardSubjects = [
      { name: "Français / Littérature", code: "FRAN", description: "Langue française, grammaire, rédaction et littérature" },
      { name: "Mathématiques", code: "MATH", description: "Arithmétique, algèbre, géométrie et analyse" },
      { name: "Anglais", code: "ANG", description: "Langue vivante 1" },
      { name: "Histoire-Géographie", code: "HIST-GEO", description: "Histoire universelle et géographie générale" },
      { name: "Sciences de la Vie et de la Terre (SVT)", code: "SVT", description: "Biologie et géologie" },
      { name: "Sciences Physiques et Chimie (PC)", code: "PC", description: "Physique et chimie expérimentale" },
      { name: "Philosophie", code: "PHILO", description: "Philosophie générale pour classes terminales" },
      { name: "Éducation Civique et Morale (ECM)", code: "ECM", description: "Citoyenneté et valeurs civiques" },
      { name: "Éducation Physique et Sportive (EPS)", code: "EPS", description: "Activités physiques et sportives" },
      { name: "Informatique / TIC", code: "INFO", description: "Bureautique, algorithmique et culture numérique" },
      { name: "Allemand", code: "ALL", description: "Langue vivante 2" },
      { name: "Espagnol", code: "ESP", description: "Langue vivante 2" },
    ];

    for (const sub of standardSubjects) {
      await supabase.from("subjects").upsert(
        {
          school_id: schoolId,
          name: sub.name,
          code: sub.code,
          description: sub.description,
          is_active: true,
        },
        { onConflict: "school_id,code" }
      );
    }

    revalidatePath("/admin/subjects");
    return { success: true, count: standardSubjects.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'initialisation.";
    return { error: message };
  }
}

/**
 * 4. Supprime une matière
 */
export async function deleteSubjectAction(subjectId: string) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de suppression.";
    return { error: message };
  }
}

/**
 * 5. Récupère les matières associées à une classe avec leurs coefficients
 */
export async function getClassSubjects(classId: string) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const { data: assignments, error } = await supabase
      .from("class_subjects")
      .select("*, subjects(*), profiles:teacher_id(id, first_name, last_name, email)")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { data: assignments || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des affectations.";
    return { error: message, data: [] };
  }
}

/**
 * 6. Affecte une matière à une classe avec un coefficient
 */
export async function assignSubjectToClassAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const classId = formData.get("classId") as string;
    const subjectId = formData.get("subjectId") as string;
    const coefficientRaw = formData.get("coefficient") as string;
    const coefficient = parseFloat(coefficientRaw) || 1.0;
    const teacherId = (formData.get("teacherId") as string) || null;

    if (!classId || !subjectId) {
      return { error: "Classe et Matière obligatoires." };
    }

    const { error } = await supabase.from("class_subjects").insert({
      school_id: schoolId,
      class_id: classId,
      subject_id: subjectId,
      coefficient,
      teacher_id: teacherId || null,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "Cette matière est déjà attribuée à cette classe." };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { error: message };
  }
}

/**
 * 7. Modifie le coefficient d'une matière dans une classe
 */
export async function updateClassSubjectCoefficientAction(
  classSubjectId: string,
  newCoefficient: number
) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    if (newCoefficient <= 0) {
      return { error: "Le coefficient doit être strictement supérieur à zéro." };
    }

    const { error } = await supabase
      .from("class_subjects")
      .update({ coefficient: newCoefficient })
      .eq("id", classSubjectId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { error: message };
  }
}

/**
 * 8. Retire une matière d'une classe
 */
export async function removeClassSubjectAction(classSubjectId: string) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { error } = await supabase
      .from("class_subjects")
      .delete()
      .eq("id", classSubjectId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de suppression.";
    return { error: message };
  }
}
