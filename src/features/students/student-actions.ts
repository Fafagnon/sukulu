"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type StudentStatus, type Gender } from "@/types/database";

// Helper pour récupérer le contexte établissement
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

  // Fallback dev si session non active en local
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
 * 1. Génère un matricule élève unique séquentiel : SUK-YYYY-XXXX
 */
export async function getNextMatricule(yearName?: string): Promise<string> {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();
    const currentYear = yearName ? yearName.split("-")[0] : new Date().getFullYear().toString();
    
    // Compter le nombre d'élèves déjà enregistrés pour cette école
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId);

    const nextIndex = (count || 0) + 1;
    const padded = String(nextIndex).padStart(4, "0");
    return `SUK-${currentYear}-${padded}`;
  } catch {
    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `SUK-${currentYear}-${randomSuffix}`;
  }
}

/**
 * 2. Récupère la liste des élèves avec filtres (recherche, statut, classe, cycle)
 */
export async function getStudents(filters?: {
  search?: string;
  status?: StudentStatus | "all";
  classId?: string;
  cycle?: string;
  academicYearId?: string;
}) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    // 1. Trouver l'année scolaire active si non spécifiée
    let targetYearId = filters?.academicYearId;
    if (!targetYearId) {
      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .maybeSingle();
      targetYearId = activeYear?.id;
    }

    // 2. Construire la requête
    let query = supabase
      .from("students")
      .select(`
        *,
        enrollments(
          id,
          academic_year_id,
          class_id,
          status,
          is_repeater,
          classes(id, name, level, cycle, series)
        ),
        student_parents(
          id,
          relationship,
          is_primary,
          parent:parent_id(id, first_name, last_name, phone, email)
        )
      `)
      .eq("school_id", schoolId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    } else {
      // Par défaut on affiche les élèves actifs
      query = query.neq("status", "archived");
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const s = filters.search.trim();
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,matricule.ilike.%${s}%`);
    }

    const { data: students, error } = await query;
    if (error) throw error;

    // Filtrer par classe ou par cycle côté serveur en mémoire si spécifié
    let filtered = students || [];

    if (filters?.classId && filters.classId !== "all") {
      filtered = filtered.filter((st) =>
        st.enrollments?.some(
          (e: { academic_year_id: string; class_id: string }) =>
            e.academic_year_id === targetYearId && e.class_id === filters.classId
        )
      );
    }

    if (filters?.cycle && filters.cycle !== "all") {
      filtered = filtered.filter((st) =>
        st.enrollments?.some(
          (e: { academic_year_id: string; classes?: { cycle: string } | null }) =>
            e.academic_year_id === targetYearId && e.classes?.cycle === filters.cycle
        )
      );
    }

    return { data: filtered, activeYearId: targetYearId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement des élèves.";
    return { error: message, data: [], activeYearId: null };
  }
}

/**
 * 3. Récupère la fiche détaillée d'un élève avec tout son historique
 */
export async function getStudentById(studentId: string) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const { data: student, error } = await supabase
      .from("students")
      .select(`
        *,
        enrollments(
          id,
          academic_year_id,
          class_id,
          enrollment_date,
          status,
          is_repeater,
          notes,
          created_at,
          academic_years(id, name, is_active),
          classes(id, name, level, cycle, series)
        ),
        student_parents(
          id,
          relationship,
          is_primary,
          can_pickup,
          parent:parent_id(id, first_name, last_name, phone, phone_secondary, email, profession, address)
        )
      `)
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single();

    if (error) throw error;
    return { data: student };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Élève introuvable.";
    return { error: message, data: null };
  }
}

/**
 * 4. Statistiques globales de l'établissement sur les effectifs
 */
export async function getStudentStats(academicYearId?: string) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    let targetYearId = academicYearId;
    if (!targetYearId) {
      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .maybeSingle();
      targetYearId = activeYear?.id;
    }

    // Récupérer tous les élèves et leurs inscriptions de l'année
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        id,
        gender,
        status,
        enrollments(
          id,
          academic_year_id,
          is_repeater,
          classes(id, cycle)
        )
      `)
      .eq("school_id", schoolId);

    if (error) throw error;

    const totalActive = (students || []).filter((s) => s.status === "active").length;
    const boys = (students || []).filter((s) => s.status === "active" && s.gender === "M").length;
    const girls = (students || []).filter((s) => s.status === "active" && s.gender === "F").length;
    
    // Inscrits dans l'année active
    const enrolledInYear = (students || []).filter((s) =>
      s.enrollments?.some((e: { academic_year_id: string }) => e.academic_year_id === targetYearId)
    );

    const repeaters = enrolledInYear.filter((s) =>
      s.enrollments?.some((e: { academic_year_id: string; is_repeater: boolean }) => e.academic_year_id === targetYearId && e.is_repeater)
    ).length;

    // Répartition par cycle
    const cycleCounts: Record<string, number> = {
      Maternelle: 0,
      Primaire: 0,
      Collège: 0,
      Lycée: 0,
    };

    enrolledInYear.forEach((s) => {
      const enr = s.enrollments?.find((e: { academic_year_id: string }) => e.academic_year_id === targetYearId);
      if (enr && (enr as { classes?: { cycle: string } }).classes?.cycle) {
        const c = (enr as { classes: { cycle: string } }).classes.cycle;
        cycleCounts[c] = (cycleCounts[c] || 0) + 1;
      }
    });

    return {
      totalActive,
      boys,
      girls,
      repeaters,
      enrolledTotal: enrolledInYear.length,
      cycleCounts,
    };
  } catch {
    return {
      totalActive: 0,
      boys: 0,
      girls: 0,
      repeaters: 0,
      enrolledTotal: 0,
      cycleCounts: { Maternelle: 0, Primaire: 0, Collège: 0, Lycée: 0 },
    };
  }
}

/**
 * 5. Création complète d'un élève avec inscription et contact parent optionnel
 */
export async function createStudentAction(formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction de l'établissement." };
    }

    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const gender = formData.get("gender") as Gender;
    const birthDate = formData.get("birthDate") as string;
    const birthPlace = (formData.get("birthPlace") as string)?.trim() || null;
    const nationality = (formData.get("nationality") as string)?.trim() || "Togolaise";
    const address = (formData.get("address") as string)?.trim() || null;
    const bloodGroup = (formData.get("bloodGroup") as string)?.trim() || null;
    const medicalNotes = (formData.get("medicalNotes") as string)?.trim() || null;
    
    // Inscription immédiate
    const classId = formData.get("classId") as string;
    const academicYearId = formData.get("academicYearId") as string;
    const isRepeater = formData.get("isRepeater") === "true";

    // Responsable légal / Parent
    const parentFirstName = (formData.get("parentFirstName") as string)?.trim();
    const parentLastName = (formData.get("parentLastName") as string)?.trim();
    const parentPhone = (formData.get("parentPhone") as string)?.trim();
    const parentEmail = (formData.get("parentEmail") as string)?.trim() || null;
    const parentProfession = (formData.get("parentProfession") as string)?.trim() || null;
    const parentRelationship = (formData.get("parentRelationship") as string) || "Père";

    if (!firstName || !lastName || !gender || !birthDate) {
      return { error: "Veuillez renseigner tous les champs d'état civil obligatoires." };
    }

    // Générer ou valider le matricule
    let matricule = (formData.get("matricule") as string)?.trim();
    if (!matricule) {
      matricule = await getNextMatricule();
    }

    // 1. Insérer l'élève
    const { data: newStudent, error: studentError } = await supabase
      .from("students")
      .insert({
        school_id: schoolId,
        matricule,
        first_name: firstName,
        last_name: lastName,
        gender,
        birth_date: birthDate,
        birth_place: birthPlace,
        nationality,
        address,
        blood_group: bloodGroup,
        medical_notes: medicalNotes,
        status: "active",
      })
      .select()
      .single();

    if (studentError) {
      if (studentError.code === "23505") {
        return { error: `Le matricule ${matricule} est déjà attribué dans cet établissement.` };
      }
      return { error: studentError.message || "Erreur lors de la création de l'élève." };
    }

    // 2. Insérer l'inscription si une classe et une année sont fournies
    if (classId && academicYearId) {
      const { error: enrollError } = await supabase.from("enrollments").insert({
        school_id: schoolId,
        student_id: newStudent.id,
        academic_year_id: academicYearId,
        class_id: classId,
        status: "enrolled",
        is_repeater: isRepeater,
      });

      if (enrollError) {
        console.error("Erreur d'inscription automatique:", enrollError);
      }
    }

    // 3. Insérer le parent et créer la liaison si un nom et un téléphone sont fournis
    if (parentFirstName && parentLastName && parentPhone) {
      // Vérifier si un parent avec ce numéro existe déjà dans l'école
      let parentId: string | null = null;
      const { data: existingParent } = await supabase
        .from("parent_profiles")
        .select("id")
        .eq("school_id", schoolId)
        .eq("phone", parentPhone)
        .maybeSingle();

      if (existingParent) {
        parentId = existingParent.id;
      } else {
        const { data: createdParent } = await supabase
          .from("parent_profiles")
          .insert({
            school_id: schoolId,
            first_name: parentFirstName,
            last_name: parentLastName,
            phone: parentPhone,
            email: parentEmail,
            profession: parentProfession,
          })
          .select("id")
          .single();

        parentId = createdParent?.id || null;
      }

      if (parentId) {
        await supabase.from("student_parents").insert({
          school_id: schoolId,
          student_id: newStudent.id,
          parent_id: parentId,
          relationship: parentRelationship,
          is_primary: true,
          can_pickup: true,
        });
      }
    }

    revalidatePath("/admin/students");
    return { success: true, studentId: newStudent.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { error: message };
  }
}

/**
 * 6. Met à jour les informations d'un élève
 */
export async function updateStudentAction(studentId: string, formData: FormData) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const gender = formData.get("gender") as Gender;
    const birthDate = formData.get("birthDate") as string;
    const birthPlace = (formData.get("birthPlace") as string)?.trim() || null;
    const nationality = (formData.get("nationality") as string)?.trim() || "Togolaise";
    const address = (formData.get("address") as string)?.trim() || null;
    const bloodGroup = (formData.get("bloodGroup") as string)?.trim() || null;
    const medicalNotes = (formData.get("medicalNotes") as string)?.trim() || null;
    const status = (formData.get("status") as StudentStatus) || "active";

    if (!firstName || !lastName || !gender || !birthDate) {
      return { error: "Veuillez renseigner tous les champs obligatoires." };
    }

    const { error } = await supabase
      .from("students")
      .update({
        first_name: firstName,
        last_name: lastName,
        gender,
        birth_date: birthDate,
        birth_place: birthPlace,
        nationality,
        address,
        blood_group: bloodGroup,
        medical_notes: medicalNotes,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de mise à jour.";
    return { error: message };
  }
}

/**
 * 7. Inscription / Réinscription d'un élève pour une année donnée
 */
export async function enrollStudentAction(
  studentId: string,
  classId: string,
  academicYearId: string,
  isRepeater: boolean = false,
  notes?: string
) {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    // Vérifier si une inscription existe déjà pour cette année
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .maybeSingle();

    if (existing) {
      // Mettre à jour la classe
      const { error } = await supabase
        .from("enrollments")
        .update({
          class_id: classId,
          is_repeater: isRepeater,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // Nouvelle inscription
      const { error } = await supabase.from("enrollments").insert({
        school_id: schoolId,
        student_id: studentId,
        academic_year_id: academicYearId,
        class_id: classId,
        is_repeater: isRepeater,
        notes: notes || null,
      });

      if (error) throw error;
    }

    // Réactiver l'élève si archivé
    await supabase
      .from("students")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur d'inscription.";
    return { error: message };
  }
}

/**
 * 8. Archivage d'un élève (départ, transfert, radiation)
 */
export async function archiveStudentAction(studentId: string, status: StudentStatus = "archived") {
  try {
    const { supabase, schoolId, role } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { error } = await supabase
      .from("students")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (error) throw error;

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'archivage.";
    return { error: message };
  }
}
