"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const DAYS_NAMES: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

async function getAuthenticatedSchoolContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non authentifié.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.school_id) {
    throw new Error("Aucun établissement rattaché à ce compte.");
  }

  return { supabase, user, schoolId: profile.school_id, role: profile.role };
}

/**
 * 1. Récupère les créneaux d'emploi du temps avec filtrage par classe ou enseignant
 */
export async function getTimetableSlots(filter?: {
  classId?: string;
  teacherId?: string;
  academicYearId?: string;
}) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    let query = supabase
      .from("timetable_slots")
      .select("*, classes(id, name, level, cycle), subjects(id, name, code), profiles:teacher_id(id, first_name, last_name, email)")
      .eq("school_id", schoolId);

    if (filter?.classId) {
      query = query.eq("class_id", filter.classId);
    }

    if (filter?.teacherId) {
      query = query.eq("teacher_id", filter.teacherId);
    }

    if (filter?.academicYearId) {
      query = query.eq("academic_year_id", filter.academicYearId);
    }

    const { data: slots, error } = await query
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return { data: slots || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement de l'emploi du temps.";
    return { error: message, data: [] };
  }
}

/**
 * 2. Crée un créneau horaire avec vérification stricte du moteur anti-conflits
 */
export async function createTimetableSlotAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction de l'établissement." };
    }

    const academicYearId = formData.get("academicYearId") as string;
    const classId = formData.get("classId") as string;
    const subjectId = formData.get("subjectId") as string;
    const teacherId = (formData.get("teacherId") as string) || null;
    const dayOfWeek = parseInt(formData.get("dayOfWeek") as string, 10);
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const room = (formData.get("room") as string) || null;

    if (!academicYearId || !classId || !subjectId || !dayOfWeek || !startTime || !endTime) {
      return { error: "Tous les champs obligatoires doivent être renseignés." };
    }

    if (startTime >= endTime) {
      return { error: "L'heure de début doit être strictement antérieure à l'heure de fin." };
    }

    // =========================================================================
    // MOTEUR DE DÉTECTION DES CONFLITS HORAIRES
    // =========================================================================

    // A) Conflit de Classe : La classe a-t-elle déjà un cours sur ce créneau ?
    const { data: classConflict } = await supabase
      .from("timetable_slots")
      .select("id, start_time, end_time, subjects(name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId)
      .eq("class_id", classId)
      .eq("day_of_week", dayOfWeek)
      .lt("start_time", endTime)
      .gt("end_time", startTime)
      .maybeSingle();

    if (classConflict) {
      const subjectName = (classConflict.subjects as { name?: string })?.name || "un cours";
      return {
        error: `Conflit de classe : Cette classe a déjà ${subjectName} programmé le ${DAYS_NAMES[dayOfWeek]} de ${classConflict.start_time.substring(0, 5)} à ${classConflict.end_time.substring(0, 5)}.`,
      };
    }

    // B) Conflit Enseignant : L'enseignant a-t-il déjà un cours ailleurs sur ce créneau ?
    if (teacherId) {
      const { data: teacherConflict } = await supabase
        .from("timetable_slots")
        .select("id, start_time, end_time, classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId)
        .eq("teacher_id", teacherId)
        .eq("day_of_week", dayOfWeek)
        .lt("start_time", endTime)
        .gt("end_time", startTime)
        .maybeSingle();

      if (teacherConflict) {
        const conflictClassName = (teacherConflict.classes as { name?: string })?.name || "une autre classe";
        return {
          error: `Conflit enseignant : Cet enseignant dispense déjà un cours en ${conflictClassName} le ${DAYS_NAMES[dayOfWeek]} de ${teacherConflict.start_time.substring(0, 5)} à ${teacherConflict.end_time.substring(0, 5)}.`,
        };
      }
    }

    // C) Conflit de Salle : La salle est-elle déjà occupée ?
    if (room && room.trim()) {
      const { data: roomConflict } = await supabase
        .from("timetable_slots")
        .select("id, start_time, end_time, classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", academicYearId)
        .eq("room", room.trim())
        .eq("day_of_week", dayOfWeek)
        .lt("start_time", endTime)
        .gt("end_time", startTime)
        .maybeSingle();

      if (roomConflict) {
        const conflictClassName = (roomConflict.classes as { name?: string })?.name || "une classe";
        return {
          error: `Conflit de salle : La salle « ${room} » est déjà réservée par ${conflictClassName} le ${DAYS_NAMES[dayOfWeek]} de ${roomConflict.start_time.substring(0, 5)} à ${roomConflict.end_time.substring(0, 5)}.`,
        };
      }
    }

    // Insertion du créneau validé
    const { error: insertError } = await supabase.from("timetable_slots").insert({
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId || null,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room ? room.trim() : null,
    });

    if (insertError) {
      return { error: insertError.message || "Erreur lors de l'enregistrement du créneau." };
    }

    revalidatePath("/admin/timetable");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { error: message };
  }
}

/**
 * 3. Supprime un créneau d'emploi du temps
 */
export async function deleteTimetableSlotAction(slotId: string) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { error } = await supabase
      .from("timetable_slots")
      .delete()
      .eq("id", slotId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/timetable");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return { error: message };
  }
}
