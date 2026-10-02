"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type PeriodStatus } from "@/types/database";

import { getAuthenticatedSchoolContext } from "@/lib/auth-context";

/**
 * 1. Récupère l'année scolaire active et toutes les années de l'établissement
 */
export async function getAcademicYears() {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const { data: years, error } = await supabase
      .from("academic_years")
      .select("*, periods(*)")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return { data: years || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la récupération des années.";
    return { error: message, data: [] };
  }
}

/**
 * 2. Crée une nouvelle année scolaire et initialise ses périodes par défaut
 */
export async function createAcademicYearAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction de l'établissement." };
    }

    const name = formData.get("name") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const setAsActive = formData.get("setAsActive") === "on";
    const periodType = (formData.get("periodType") as "trimestre" | "semestre") || "trimestre";

    if (!name || !startDate || !endDate) {
      return { error: "Veuillez renseigner tous les champs obligatoires." };
    }

    // Si la nouvelle année doit être active, désactiver les autres années
    if (setAsActive) {
      await supabase
        .from("academic_years")
        .update({ is_active: false })
        .eq("school_id", schoolId);
    }

    const { data: newYear, error: yearError } = await supabase
      .from("academic_years")
      .insert({
        school_id: schoolId,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: setAsActive,
      })
      .select("id")
      .single();

    if (yearError || !newYear) {
      return { error: yearError?.message || "Erreur lors de la création de l'année scolaire." };
    }

    // Initialisation des périodes
    if (periodType === "trimestre") {
      await supabase.from("periods").insert([
        {
          school_id: schoolId,
          academic_year_id: newYear.id,
          name: "1er Trimestre",
          type: "trimestre",
          order_index: 1,
          status: "open",
          start_date: startDate,
          end_date: `${startDate.substring(0, 4)}-12-20`,
        },
        {
          school_id: schoolId,
          academic_year_id: newYear.id,
          name: "2ème Trimestre",
          type: "trimestre",
          order_index: 2,
          status: "open",
          start_date: `${endDate.substring(0, 4)}-01-05`,
          end_date: `${endDate.substring(0, 4)}-03-31`,
        },
        {
          school_id: schoolId,
          academic_year_id: newYear.id,
          name: "3ème Trimestre",
          type: "trimestre",
          order_index: 3,
          status: "open",
          start_date: `${endDate.substring(0, 4)}-04-10`,
          end_date: endDate,
        },
      ]);
    } else {
      await supabase.from("periods").insert([
        {
          school_id: schoolId,
          academic_year_id: newYear.id,
          name: "1er Semestre",
          type: "semestre",
          order_index: 1,
          status: "open",
          start_date: startDate,
          end_date: `${endDate.substring(0, 4)}-01-31`,
        },
        {
          school_id: schoolId,
          academic_year_id: newYear.id,
          name: "2ème Semestre",
          type: "semestre",
          order_index: 2,
          status: "open",
          start_date: `${endDate.substring(0, 4)}-02-15`,
          end_date: endDate,
        },
      ]);
    }

    revalidatePath("/admin/academic-years");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { error: message };
  }
}

/**
 * 3. Définit une année scolaire comme active (règle stricte : 1 seule active à la fois)
 */
export async function setActiveAcademicYearAction(yearId: string) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    // 1. Désactiver toutes les années de cette école
    await supabase
      .from("academic_years")
      .update({ is_active: false })
      .eq("school_id", schoolId);

    // 2. Activer l'année choisie
    const { error } = await supabase
      .from("academic_years")
      .update({ is_active: true })
      .eq("id", yearId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/academic-years");
    revalidatePath("/admin/classes");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { error: message };
  }
}

/**
 * 4. Met à jour le statut d'une période (open, review, locked)
 */
export async function updatePeriodStatusAction(periodId: string, status: PeriodStatus) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { error } = await supabase
      .from("periods")
      .update({ status })
      .eq("id", periodId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/academic-years");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour du statut.";
    return { error: message };
  }
}

/**
 * 5. Récupère les classes de l'année scolaire active (ou d'une année spécifique)
 */
export async function getClasses(yearId?: string) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    let targetYearId = yearId;

    if (!targetYearId) {
      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .maybeSingle();

      targetYearId = activeYear?.id;
    }

    if (!targetYearId) {
      return { data: [], activeYearId: null };
    }

    const { data: classes, error } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .eq("academic_year_id", targetYearId)
      .order("level", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return { data: classes || [], activeYearId: targetYearId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de récupération des classes.";
    return { error: message, data: [], activeYearId: null };
  }
}

/**
 * 6. Crée une nouvelle classe
 */
export async function createClassAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const academicYearId = formData.get("academicYearId") as string;
    const name = formData.get("name") as string;
    const cycle = formData.get("cycle") as string;
    const level = formData.get("level") as string;
    const series = (formData.get("series") as string) || null;
    const capacityRaw = formData.get("capacity") as string;
    const capacity = capacityRaw ? parseInt(capacityRaw, 10) : null;

    if (!academicYearId || !name || !cycle || !level) {
      return { error: "Tous les champs obligatoires doivent être renseignés." };
    }

    const { error } = await supabase.from("classes").insert({
      school_id: schoolId,
      academic_year_id: academicYearId,
      name: name.trim(),
      cycle: cycle.trim(),
      level: level.trim(),
      series: series ? series.trim() : null,
      capacity: capacity && capacity > 0 ? capacity : null,
    });

    if (error) {
      return { error: error.message || "Erreur lors de la création de la classe." };
    }

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { error: message };
  }
}

/**
 * 7. Supprime une classe
 */
export async function deleteClassAction(classId: string) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", classId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return { error: message };
  }
}
