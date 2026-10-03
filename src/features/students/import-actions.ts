"use server";

import { revalidatePath } from "next/cache";
import { type Gender } from "@/types/database";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit";

export interface StudentImportRow {
  matricule: string;
  lastName: string;
  firstName: string;
  gender: Gender;
  birthDate: string;
  birthPlace?: string;
  className: string;
  parentName?: string;
  parentPhone?: string;
  isRepeater?: boolean;
}

export interface ImportBatchResult {
  importedCount: number;
  errors: Array<{ rowNumber: number; matricule: string; error: string }>;
}

/**
 * Exécute l'import par lot d'élèves avec résolution automatique des classes
 */
export async function importStudentsBatchAction(
  rows: StudentImportRow[],
  academicYearId: string
): Promise<{ success: boolean; result?: ImportBatchResult; error?: string }> {
  try {
    const { supabase, schoolId, role, user } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { success: false, error: "Action réservée à la direction de l'établissement." };
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: "Aucune donnée à importer." };
    }

    // Récupérer toutes les classes de l'école pour l'année ciblée
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId);

    const classMap = new Map<string, string>();
    classes?.forEach((c) => {
      classMap.set(c.name.trim().toLowerCase(), c.id);
    });

    // Récupérer les matricules existants
    const { data: existingStudents } = await supabase
      .from("students")
      .select("matricule")
      .eq("school_id", schoolId);

    const existingMatricules = new Set(existingStudents?.map((s) => s.matricule.trim().toUpperCase()));

    let importedCount = 0;
    const errors: Array<{ rowNumber: number; matricule: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const cleanMatricule = row.matricule.trim().toUpperCase();

      // 1. Vérification unicité matricule
      if (existingMatricules.has(cleanMatricule)) {
        errors.push({
          rowNumber: rowNum,
          matricule: row.matricule,
          error: "Matricule déjà utilisé dans l'établissement.",
        });
        continue;
      }

      // 2. Résolution de la classe
      const cleanClassName = row.className.trim().toLowerCase();
      const targetClassId = classMap.get(cleanClassName);

      if (!targetClassId) {
        errors.push({
          rowNumber: rowNum,
          matricule: row.matricule,
          error: `Classe inconnue : "${row.className}".`,
        });
        continue;
      }

      try {
        // Insertion de l'élève
        const { data: createdStudent, error: studentErr } = await supabase
          .from("students")
          .insert({
            school_id: schoolId,
            matricule: cleanMatricule,
            first_name: row.firstName.trim(),
            last_name: row.lastName.trim(),
            gender: row.gender,
            birth_date: row.birthDate,
            birth_place: row.birthPlace?.trim() || null,
            nationality: "Togolaise",
            status: "active",
          })
          .select("id")
          .single();

        if (studentErr) {
          errors.push({
            rowNumber: rowNum,
            matricule: row.matricule,
            error: studentErr.message,
          });
          continue;
        }

        existingMatricules.add(cleanMatricule);

        // Insertion de l'inscription annuelle
        await supabase.from("enrollments").insert({
          school_id: schoolId,
          student_id: createdStudent.id,
          academic_year_id: academicYearId,
          class_id: targetClassId,
          is_repeater: Boolean(row.isRepeater),
          status: "enrolled",
        });

        // Insertion du parent si fourni
        if (row.parentPhone && row.parentPhone.trim().length > 0) {
          const phone = row.parentPhone.trim();
          const parentName = row.parentName?.trim() || "Parent";
          const nameParts = parentName.split(" ");
          const pLastName = nameParts[0] || "Tuteur";
          const pFirstName = nameParts.slice(1).join(" ") || "Légal";

          const { data: pProfile } = await supabase
            .from("parent_profiles")
            .insert({
              school_id: schoolId,
              first_name: pFirstName,
              last_name: pLastName,
              phone,
            })
            .select("id")
            .single();

          if (pProfile) {
            await supabase.from("student_parents").insert({
              school_id: schoolId,
              student_id: createdStudent.id,
              parent_id: pProfile.id,
              relationship: "Tuteur légal",
              is_primary: true,
              can_pickup: true,
            });
          }
        }

        importedCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue.";
        errors.push({
          rowNumber: rowNum,
          matricule: row.matricule,
          error: msg,
        });
      }
    }

    void logAuditEvent({
      schoolId,
      userId: user?.id,
      action: "import",
      entityType: "student",
      entityId: academicYearId,
      newData: { imported_count: importedCount, errors_count: errors.length },
    });

    revalidatePath("/admin/students");

    return {
      success: true,
      result: {
        importedCount,
        errors,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'importation par lot.";
    return { success: false, error: message };
  }
}
