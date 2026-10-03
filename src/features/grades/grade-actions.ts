"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit";
import {
  computeRanks,
  classStats,
  midTermAverage,
  subjectAverage,
  subjectPoints,
  overallAverage,
  round2,
} from "./grading-engine";

export interface AssessmentItem {
  id: string;
  title: string;
  type: "cc" | "composition";
  assessment_date: string;
  max_score: number;
  teacher_id: string | null;
  period_id: string;
  class_id: string;
  subject_id: string;
}

export interface GradeEntry {
  assessment_id: string;
  student_id: string;
  score: number;
}

async function assertPeriodWritable(periodId: string, schoolId: string, supabase: Awaited<ReturnType<typeof getAuthenticatedSchoolContext>>["supabase"]) {
  const { data: period } = await supabase
    .from("periods")
    .select("id, name, status")
    .eq("id", periodId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (!period) {
    return { error: "Période introuvable." };
  }
  if (period.status === "locked") {
    return {
      error: `La période « ${period.name} » est verrouillée : aucune modification n'est possible. Contactez la direction.`,
    };
  }
  return { period };
}

/**
 * 1. Grille de saisie : élèves de la classe + évaluations + notes existantes
 */
export async function getGradesSheet(filter: {
  classId: string;
  subjectId: string;
  periodId: string;
}) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const [studentsRes, assessmentsRes, periodRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, matricule, first_name, last_name")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("last_name", { ascending: true }),
      supabase
        .from("assessments")
        .select("id, title, type, assessment_date, max_score, teacher_id, period_id, class_id, subject_id")
        .eq("school_id", schoolId)
        .eq("class_id", filter.classId)
        .eq("subject_id", filter.subjectId)
        .eq("period_id", filter.periodId)
        .order("type", { ascending: true })
        .order("assessment_date", { ascending: true }),
      supabase
        .from("periods")
        .select("id, name, status")
        .eq("id", filter.periodId)
        .eq("school_id", schoolId)
        .maybeSingle(),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (assessmentsRes.error) throw assessmentsRes.error;

    const assessmentIds = (assessmentsRes.data || []).map((a) => a.id);
    const gradesRes = assessmentIds.length === 0
      ? { data: [] as Array<{ id: string; assessment_id: string; student_id: string; score: number }> , error: null }
      : await supabase
          .from("grades")
          .select("id, assessment_id, student_id, score")
          .eq("school_id", schoolId)
          .in("assessment_id", assessmentIds);

    if (gradesRes.error) throw gradesRes.error;

    // Élèves effectivement inscrits dans cette classe pour l'année active
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("school_id", schoolId)
      .eq("class_id", filter.classId)
      .eq("status", "enrolled");

    const enrolledIds = new Set((enrollments || []).map((e) => e.student_id));
    const students = (studentsRes.data || []).filter((s) => enrolledIds.has(s.id));

    return {
      data: {
        students,
        assessments: (assessmentsRes.data || []) as AssessmentItem[],
        grades: (gradesRes.data || []) as GradeEntry[],
        period: periodRes.data,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de chargement de la grille.";
    return { error: message };
  }
}

/**
 * 2. Création d'une évaluation (CC ou composition)
 */
export async function createAssessmentAction(formData: FormData) {
  try {
    const { supabase, schoolId, role, user } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin" && role !== "enseignant") {
      return { error: "Action non autorisée." };
    }

    const title = (formData.get("title") as string)?.trim();
    const type = (formData.get("type") as string) === "composition" ? "composition" : "cc";
    const classId = formData.get("classId") as string;
    const subjectId = formData.get("subjectId") as string;
    const periodId = formData.get("periodId") as string;
    const academicYearId = formData.get("academicYearId") as string;
    const teacherId = (formData.get("teacherId") as string) || null;
    const assessmentDate = (formData.get("assessmentDate") as string) || new Date().toISOString().split("T")[0];
    const maxScore = parseFloat((formData.get("maxScore") as string) || "20");

    if (!title || !classId || !subjectId || !periodId || !academicYearId) {
      return { error: "Tous les champs obligatoires doivent être renseignés." };
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      return { error: "Le barème maximum doit être un nombre positif." };
    }

    const lock = await assertPeriodWritable(periodId, schoolId, supabase);
    if ("error" in lock && lock.error) return { error: lock.error };

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        school_id: schoolId,
        academic_year_id: academicYearId,
        period_id: periodId,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId || (role === "enseignant" ? user!.id : null),
        title,
        type,
        assessment_date: assessmentDate,
        max_score: maxScore,
        created_by: user?.id || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    void logAuditEvent({
      schoolId,
      userId: user?.id,
      action: "create",
      entityType: "assessment",
      entityId: data.id,
      newData: { title, type, class_id: classId, subject_id: subjectId },
    });

    revalidatePath("/admin/grades");
    return { success: true, assessmentId: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de l'évaluation.";
    return { error: message };
  }
}

/**
 * 3. Enregistrement en bloc d'une colonne de notes (upsert)
 *    Vérifie : verrouillage période, barème, note >= 0.
 */
export async function saveGradesAction(params: {
  assessmentId: string;
  scores: Array<{ studentId: string; score: number | null }>;
}) {
  try {
    const { supabase, schoolId, role, user } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin" && role !== "enseignant") {
      return { error: "Action non autorisée." };
    }

    const { data: assessment, error: assessmentErr } = await supabase
      .from("assessments")
      .select("id, title, max_score, period_id, class_id, subject_id, type")
      .eq("id", params.assessmentId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (assessmentErr) throw assessmentErr;
    if (!assessment) return { error: "Évaluation introuvable." };

    const lock = await assertPeriodWritable(assessment.period_id, schoolId, supabase);
    if ("error" in lock && lock.error) return { error: lock.error };

    const toInsert: Array<{
      school_id: string;
      assessment_id: string;
      student_id: string;
      score: number;
      entered_by: string | null;
    }> = [];
    const toDelete: string[] = [];

    for (const entry of params.scores) {
      if (entry.score === null || entry.score === undefined) {
        toDelete.push(entry.studentId);
        continue;
      }
      if (!Number.isFinite(entry.score) || entry.score < 0) {
        return { error: "Les notes doivent être des nombres positifs." };
      }
      if (entry.score > assessment.max_score) {
        return {
          error: `Note hors barème : ${entry.score} > ${assessment.max_score} (« ${assessment.title} »).`,
        };
      }
      toInsert.push({
        school_id: schoolId,
        assessment_id: params.assessmentId,
        student_id: entry.studentId,
        score: round2(entry.score),
        entered_by: user?.id || null,
      });
    }

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("grades")
        .delete()
        .eq("assessment_id", params.assessmentId)
        .eq("school_id", schoolId)
        .in("student_id", toDelete);
      if (delErr) throw delErr;
    }

    if (toInsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from("grades")
        .upsert(toInsert, { onConflict: "assessment_id,student_id" });
      if (upsertErr) throw upsertErr;
    }

    void logAuditEvent({
      schoolId,
      userId: user?.id,
      action: "grade_entry",
      entityType: "assessment",
      entityId: params.assessmentId,
      newData: { saved: toInsert.length, cleared: toDelete.length, title: assessment.title },
    });

    revalidatePath("/admin/grades");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement des notes.";
    return { error: message };
  }
}

/**
 * 4. Suppression d'une évaluation (et de ses notes en cascade)
 */
export async function deleteAssessmentAction(assessmentId: string) {
  try {
    const { supabase, schoolId, role, user } = await getAuthenticatedSchoolContext();

    if (role !== "direction" && role !== "superadmin") {
      return { error: "Action réservée à la direction." };
    }

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, title, period_id")
      .eq("id", assessmentId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!assessment) return { error: "Évaluation introuvable." };

    const lock = await assertPeriodWritable(assessment.period_id, schoolId, supabase);
    if ("error" in lock && lock.error) return { error: lock.error };

    const { error } = await supabase
      .from("assessments")
      .delete()
      .eq("id", assessmentId)
      .eq("school_id", schoolId);
    if (error) throw error;

    void logAuditEvent({
      schoolId,
      userId: user?.id,
      action: "delete",
      entityType: "assessment",
      entityId: assessmentId,
      oldData: { title: assessment.title },
    });

    revalidatePath("/admin/grades");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return { error: message };
  }
}

export interface SubjectResultRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  coefficient: number;
  mid: number | null;
  composition: number | null;
  average: number | null;
  points: number | null;
}

export interface ClassResultRow {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  subjects: SubjectResultRow[];
  overall: number | null;
  rank?: number;
}

/**
 * 5. Résultats d'une classe pour une période : toutes matières,
 *    moyennes via le moteur centralisé, rangs et statistiques.
 */
export async function getClassResults(filter: {
  classId: string;
  periodId: string;
}) {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const [studentsRes, enrollmentsRes, assignmentsRes, assessmentsRes, gradesRes] =
      await Promise.all([
        supabase
          .from("students")
          .select("id, matricule, first_name, last_name")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .order("last_name", { ascending: true }),
        supabase
          .from("enrollments")
          .select("student_id")
          .eq("school_id", schoolId)
          .eq("class_id", filter.classId)
          .eq("status", "enrolled"),
        supabase
          .from("class_subjects")
          .select("subject_id, coefficient, subjects(id, name, code)")
          .eq("school_id", schoolId)
          .eq("class_id", filter.classId)
          .eq("is_active", true),
        supabase
          .from("assessments")
          .select("id, subject_id, type")
          .eq("school_id", schoolId)
          .eq("class_id", filter.classId)
          .eq("period_id", filter.periodId),
        supabase
          .from("grades")
          .select("assessment_id, student_id, score")
          .eq("school_id", schoolId),
      ]);

    if (studentsRes.error) throw studentsRes.error;
    if (enrollmentsRes.error) throw enrollmentsRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (assessmentsRes.error) throw assessmentsRes.error;
    if (gradesRes.error) throw gradesRes.error;

    const assessmentIds = new Set((assessmentsRes.data || []).map((a) => a.id));
    const enrolledIds = new Set((enrollmentsRes.data || []).map((e) => e.student_id));
    const students = (studentsRes.data || []).filter((s) => enrolledIds.has(s.id));

    const grades = (gradesRes.data || []).filter((g) => assessmentIds.has(g.assessment_id));
    const gradesByAssessment = new Map<string, Map<string, number>>();
    for (const grade of grades) {
      if (!gradesByAssessment.has(grade.assessment_id)) {
        gradesByAssessment.set(grade.assessment_id, new Map());
      }
      gradesByAssessment.get(grade.assessment_id)!.set(grade.student_id, Number(grade.score));
    }

    const assessmentsBySubject = new Map<string, { cc: string[]; composition: string | null }>();
    for (const assessment of assessmentsRes.data || []) {
      const bucket = assessmentsBySubject.get(assessment.subject_id) || { cc: [], composition: null };
      if (assessment.type === "composition") {
        // Une seule composition par période/matière : la plus récente prise en compte
        bucket.composition = assessment.id;
      } else {
        bucket.cc.push(assessment.id);
      }
      assessmentsBySubject.set(assessment.subject_id, bucket);
    }

    const assignments = (assignmentsRes.data || []).map((a) => {
      const subject = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
      return {
        subjectId: a.subject_id,
        subjectName: subject?.name || "Matière",
        subjectCode: subject?.code || "",
        coefficient: Number(a.coefficient) || 1,
      };
    });

    const rows: ClassResultRow[] = students.map((student) => {
      const subjectRows: SubjectResultRow[] = assignments.map((assignment) => {
        const bucket = assessmentsBySubject.get(assignment.subjectId);
        const ccScores = (bucket?.cc || []).map(
          (id) => gradesByAssessment.get(id)?.get(student.id)
        );
        const compositionScore = bucket?.composition
          ? gradesByAssessment.get(bucket.composition)?.get(student.id) ?? null
          : null;

        const mid = midTermAverage(ccScores);
        const average = subjectAverage({ ccScores, compositionScore });
        const points = subjectPoints(average, assignment.coefficient);

        return {
          ...assignment,
          mid,
          composition: compositionScore,
          average,
          points,
        };
      });

      return {
        studentId: student.id,
        matricule: student.matricule,
        firstName: student.first_name,
        lastName: student.last_name,
        subjects: subjectRows,
        overall: overallAverage(
          subjectRows.map((s) => ({ average: s.average, coefficient: s.coefficient }))
        ),
      };
    });

    // Rangs via le moteur (RANK SQL : 1, 2, 2, 4) — on projecte overall → average
    const rankedAverages = computeRanks(
      rows.map((r) => ({ studentId: r.studentId, average: r.overall }))
    );
    const rankByStudent = new Map(
      rankedAverages.map((r) => [r.studentId, r.rank])
    );
    const ranked = rows.map((r) => ({
      ...r,
      rank: rankByStudent.get(r.studentId),
    }));

    const stats = classStats(ranked.map((r) => r.overall));

    return { data: { rows: ranked, stats } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de calcul des résultats.";
    return { error: message };
  }
}
