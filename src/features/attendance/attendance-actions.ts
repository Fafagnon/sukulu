"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit";
import type { AttendanceStatus } from "@/types/database";
import {
  calculateAttendanceSummary,
  calculateClassAttendanceSummary,
  calculateMultiStudentStats,
  validateAttendanceInput,
  type AttendanceRecordItem,
} from "./attendance-engine";

export interface AttendanceBatchRecordInput {
  studentId: string;
  status: AttendanceStatus;
  arrivalTime?: string | null;
  reason?: string | null;
}

export interface SaveAttendanceBatchInput {
  classId: string;
  date: string; // YYYY-MM-DD
  timetableSlotId?: string | null;
  records: AttendanceBatchRecordInput[];
}

export interface TeacherAttendanceContext {
  classes: {
    id: string;
    name: string;
    cycle: string;
    level: string;
    series: string | null;
    capacity: number | null;
    totalEnrolled: number;
  }[];
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  teacherProfile: {
    id: string;
    fullName: string;
    role: string;
  };
  today: string;
}

export interface StudentAttendanceSheetItem {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  photoUrl: string | null;
  status: AttendanceStatus;
  arrivalTime: string | null;
  reason: string | null;
  recordId: string | null;
}

export interface DailyAttendanceOverview {
  date: string;
  summary: {
    totalEnrolled: number;
    totalRecorded: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    presenceRate: number;
    attendanceRate: number;
    unexcusedAbsenceRate: number;
  };
  classesSummary: {
    classId: string;
    className: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
    isCompleted: boolean;
  }[];
  absentAndLateStudents: {
    recordId: string;
    studentId: string;
    studentName: string;
    matricule: string;
    className: string;
    status: AttendanceStatus;
    arrivalTime: string | null;
    reason: string | null;
    recordedAt: string;
  }[];
  frequentAbsentAlerts: {
    studentId: string;
    studentName: string;
    matricule: string;
    className: string;
    totalAbsences: number;
    consecutiveAbsences: number;
    attendanceRate: number;
  }[];
}

/**
 * 1. Contexte enseignant : classes assignées et année scolaire active.
 */
export async function getTeacherAttendanceContext(): Promise<{
  data?: TeacherAttendanceContext;
  error?: string;
}> {
  try {
    const { supabase, schoolId, user, profile, role } =
      await getAuthenticatedSchoolContext();

    if (!user || !profile) {
      return { error: "Session non valide ou expirée." };
    }

    // Année scolaire active
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id, name, start_date, end_date")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (!activeYear) {
      return { error: "Aucune année scolaire active configurée dans l'établissement." };
    }

    let classIds: string[] = [];

    if (role === "enseignant") {
      // Classes où l'enseignant a un cours assigné ou un créneau
      const [classSubjectsRes, slotsRes] = await Promise.all([
        supabase
          .from("class_subjects")
          .select("class_id")
          .eq("school_id", schoolId)
          .eq("teacher_id", user.id),
        supabase
          .from("timetable_slots")
          .select("class_id")
          .eq("school_id", schoolId)
          .eq("teacher_id", user.id),
      ]);

      const foundIds = new Set<string>();
      classSubjectsRes.data?.forEach((cs) => foundIds.add(cs.class_id));
      slotsRes.data?.forEach((ts) => foundIds.add(ts.class_id));
      classIds = Array.from(foundIds);
    }

    // Récupérer les classes (toutes si direction ou si enseignant sans affectation formelle encore)
    let classesQuery = supabase
      .from("classes")
      .select("id, name, cycle, level, series, capacity")
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .order("name", { ascending: true });

    if (role === "enseignant" && classIds.length > 0) {
      classesQuery = classesQuery.in("id", classIds);
    }

    const { data: classesData, error: classesError } = await classesQuery;
    if (classesError) {
      return { error: "Erreur lors du chargement des classes: " + classesError.message };
    }

    // Compter les effectifs inscrits pour chaque classe
    const classList = await Promise.all(
      (classesData ?? []).map(async (cls) => {
        const { count } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("class_id", cls.id)
          .eq("status", "enrolled");

        return {
          id: cls.id,
          name: cls.name,
          cycle: cls.cycle,
          level: cls.level,
          series: cls.series,
          capacity: cls.capacity,
          totalEnrolled: count ?? 0,
        };
      })
    );

    const todayStr = new Date().toISOString().split("T")[0];

    return {
      data: {
        classes: classList,
        academicYear: activeYear
          ? {
              id: activeYear.id,
              name: activeYear.name,
              startDate: activeYear.start_date,
              endDate: activeYear.end_date,
            }
          : null,
        teacherProfile: {
          id: user.id,
          fullName: `${profile.first_name} ${profile.last_name}`.trim(),
          role: profile.role,
        },
        today: todayStr,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erreur inconnue lors du chargement du contexte enseignant.",
    };
  }
}

/**
 * 2. Récupère la liste des élèves d'une classe pour l'appel avec les pointages existants.
 */
export async function getClassStudentsForAttendance(params: {
  classId: string;
  date: string;
  timetableSlotId?: string | null;
}): Promise<{
  data?: {
    classId: string;
    date: string;
    timetableSlotId: string | null;
    students: StudentAttendanceSheetItem[];
  };
  error?: string;
}> {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    // 1. Récupérer les inscriptions actives de la classe
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("student_id, students (id, matricule, first_name, last_name, gender, photo_url, status)")
      .eq("school_id", schoolId)
      .eq("class_id", params.classId)
      .eq("status", "enrolled");

    if (enrollError) {
      return { error: "Erreur lors de la récupération des élèves: " + enrollError.message };
    }

    // 2. Récupérer les pointages déjà enregistrés pour cette date
    let recordsQuery = supabase
      .from("attendance_records")
      .select("id, student_id, status, arrival_time, reason")
      .eq("school_id", schoolId)
      .eq("class_id", params.classId)
      .eq("date", params.date);

    if (params.timetableSlotId) {
      recordsQuery = recordsQuery.eq("timetable_slot_id", params.timetableSlotId);
    } else {
      recordsQuery = recordsQuery.is("timetable_slot_id", null);
    }

    const { data: existingRecords, error: recError } = await recordsQuery;
    if (recError) {
      return { error: "Erreur lors de la lecture des pointages existants: " + recError.message };
    }

    const recordsMap = new Map<
      string,
      {
        id: string;
        status: AttendanceStatus;
        arrivalTime: string | null;
        reason: string | null;
      }
    >();

    existingRecords?.forEach((r) => {
      recordsMap.set(r.student_id, {
        id: r.id,
        status: r.status as AttendanceStatus,
        arrivalTime: r.arrival_time,
        reason: r.reason,
      });
    });

    const students: StudentAttendanceSheetItem[] = [];

    for (const item of enrollments ?? []) {
      const s = item.students;
      if (!s || s.status !== "active") continue;

      const existing = recordsMap.get(s.id);
      students.push({
        studentId: s.id,
        matricule: s.matricule,
        firstName: s.first_name,
        lastName: s.last_name,
        gender: s.gender,
        photoUrl: s.photo_url,
        status: existing ? existing.status : ("present" as AttendanceStatus),
        arrivalTime: existing?.arrivalTime ?? null,
        reason: existing?.reason ?? null,
        recordId: existing?.id ?? null,
      });
    }

    students.sort((a, b) => a.lastName.localeCompare(b.lastName, "fr", { sensitivity: "base" }));

    return {
      data: {
        classId: params.classId,
        date: params.date,
        timetableSlotId: params.timetableSlotId ?? null,
        students,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors du chargement des élèves.",
    };
  }
}

/**
 * 3. Enregistrement en lot d'un appel (appel direct ou synchronisation offline outbox).
 */
export async function saveAttendanceBatchAction(
  input: SaveAttendanceBatchInput
): Promise<{
  success: boolean;
  count?: number;
  syncedAt?: string;
  error?: string;
}> {
  try {
    const { supabase, schoolId, user } = await getAuthenticatedSchoolContext();

    if (!user) {
      return { success: false, error: "Utilisateur non authentifié." };
    }

    if (!input.classId || !input.date || !Array.isArray(input.records)) {
      return { success: false, error: "Données d'appel incomplètes ou invalides." };
    }

    // Validation des données unitaires
    for (const record of input.records) {
      const validation = validateAttendanceInput({
        status: record.status,
        arrivalTime: record.arrivalTime,
        reason: record.reason,
      });
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(" ; ") };
      }
    }

    // Récupérer l'année scolaire de la classe
    const { data: classData, error: classErr } = await supabase
      .from("classes")
      .select("academic_year_id")
      .eq("id", input.classId)
      .eq("school_id", schoolId)
      .single();

    if (classErr || !classData) {
      return { success: false, error: "Classe introuvable dans cet établissement." };
    }

    const now = new Date().toISOString();
    const rows = input.records.map((r) => ({
      school_id: schoolId,
      academic_year_id: classData.academic_year_id,
      class_id: input.classId,
      student_id: r.studentId,
      timetable_slot_id: input.timetableSlotId ?? null,
      date: input.date,
      status: r.status,
      arrival_time: r.status === "late" && r.arrivalTime ? r.arrivalTime.trim() : null,
      reason:
        (r.status === "excused" || r.status === "absent") && r.reason
          ? r.reason.trim()
          : null,
      recorded_by: user.id,
      updated_at: now,
    }));

    if (rows.length === 0) {
      return { success: true, count: 0, syncedAt: now };
    }

    const { error: upsertError } = await supabase.from("attendance_records").upsert(
      rows,
      {
        onConflict: "school_id,student_id,date,timetable_slot_id",
      }
    );

    if (upsertError) {
      return {
        success: false,
        error: "Erreur lors de l'enregistrement de l'appel: " + upsertError.message,
      };
    }

    // Traçabilité dans le journal d'audit
    await logAuditEvent({
      schoolId,
      userId: user.id,
      action: "record_attendance",
      entityType: "attendance_records",
      entityId: input.classId,
      newData: {
        classId: input.classId,
        date: input.date,
        slotId: input.timetableSlotId ?? null,
        recordsCount: rows.length,
      },
    });

    revalidatePath("/teacher");
    revalidatePath("/teacher/attendance");
    revalidatePath("/admin/attendance");

    return {
      success: true,
      count: rows.length,
      syncedAt: now,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de la sauvegarde de l'appel.",
    };
  }
}

/**
 * 4. Tableau de bord d'assiduité pour la Direction (Vue journalière et alertes).
 */
export async function getDailyAttendanceOverviewAction(filter?: {
  date?: string;
  classId?: string;
}): Promise<{
  data?: DailyAttendanceOverview;
  error?: string;
}> {
  try {
    const { supabase, schoolId } = await getAuthenticatedSchoolContext();

    const targetDate = filter?.date || new Date().toISOString().split("T")[0];

    // Année scolaire active
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (!activeYear) {
      return { error: "Aucune année scolaire active." };
    }

    // Récupérer toutes les classes
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .order("name", { ascending: true });

    const classes = classesData ?? [];

    // Compter les inscrits totaux et par classe
    const { data: enrollmentsData } = await supabase
      .from("enrollments")
      .select("class_id, student_id")
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .eq("status", "enrolled");

    const enrolledStudentsCountByClass = new Map<string, number>();
    const allEnrolledStudentIds = new Set<string>();

    enrollmentsData?.forEach((en) => {
      allEnrolledStudentIds.add(en.student_id);
      const prev = enrolledStudentsCountByClass.get(en.class_id) ?? 0;
      enrolledStudentsCountByClass.set(en.class_id, prev + 1);
    });

    // Récupérer les pointages de la date cible
    let attendanceQuery = supabase
      .from("attendance_records")
      .select(`
        id,
        student_id,
        class_id,
        status,
        arrival_time,
        reason,
        created_at,
        students (
          id,
          matricule,
          first_name,
          last_name
        ),
        classes (
          id,
          name
        )
      `)
      .eq("school_id", schoolId)
      .eq("date", targetDate);

    if (filter?.classId) {
      attendanceQuery = attendanceQuery.eq("class_id", filter.classId);
    }

    const { data: attendanceRecords, error: attError } = await attendanceQuery;
    if (attError) {
      return { error: "Erreur lors de la lecture des présences: " + attError.message };
    }

    // Transformer en éléments AttendanceRecordItem pour le moteur de calcul
    const recordItems: AttendanceRecordItem[] = (attendanceRecords ?? []).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      status: r.status as AttendanceStatus,
      date: targetDate,
      arrivalTime: r.arrival_time,
      reason: r.reason,
    }));

    const globalSummary = calculateAttendanceSummary(recordItems);

    // Synthèse par classe
    const classesSummary = classes.map((cls) => {
      const classRecords = recordItems.filter((r) => {
        const raw = attendanceRecords?.find((ar) => ar.id === r.id);
        return raw?.class_id === cls.id;
      });
      const totalEnrolled = enrolledStudentsCountByClass.get(cls.id) ?? 0;
      return calculateClassAttendanceSummary(
        cls.id,
        cls.name,
        totalEnrolled,
        classRecords
      );
    });

    // Liste détaillée des absents et retards du jour
    const absentAndLateStudents = (attendanceRecords ?? [])
      .filter((r) => r.status === "absent" || r.status === "late" || r.status === "excused")
      .map((r) => {
        const s = r.students as { matricule: string; first_name: string; last_name: string } | null;
        const c = r.classes as { name: string } | null;
        return {
          recordId: r.id,
          studentId: r.student_id,
          studentName: s ? `${s.first_name} ${s.last_name}`.trim() : "Élève",
          matricule: s?.matricule || "—",
          className: c?.name || "Classe",
          status: r.status as AttendanceStatus,
          arrivalTime: r.arrival_time,
          reason: r.reason,
          recordedAt: r.created_at,
        };
      });

    // Alertes élèves fréquemment absents (sur l'ensemble de l'année scolaire active)
    const { data: allYearAbsences } = await supabase
      .from("attendance_records")
      .select(`
        student_id,
        status,
        date,
        students (
          id,
          matricule,
          first_name,
          last_name
        ),
        classes (
          name
        )
      `)
      .eq("school_id", schoolId)
      .eq("academic_year_id", activeYear.id)
      .in("status", ["absent", "excused", "late"]);

    const studentStatsMap = new Map<
      string,
      {
        studentName: string;
        matricule: string;
        className: string;
        records: { date: string; status: AttendanceStatus }[];
      }
    >();

    allYearAbsences?.forEach((rec) => {
      const s = rec.students as { matricule: string; first_name: string; last_name: string } | null;
      const c = rec.classes as { name: string } | null;
      const prev = studentStatsMap.get(rec.student_id) ?? {
        studentName: s ? `${s.first_name} ${s.last_name}`.trim() : "Élève",
        matricule: s?.matricule || "—",
        className: c?.name || "—",
        records: [],
      };
      prev.records.push({
        date: rec.date,
        status: rec.status as AttendanceStatus,
      });
      studentStatsMap.set(rec.student_id, prev);
    });

    const frequentAlerts: DailyAttendanceOverview["frequentAbsentAlerts"] = [];

    studentStatsMap.forEach((entry, studentId) => {
      const stats = calculateMultiStudentStats(
        [{ id: studentId, name: entry.studentName }],
        entry.records.map((r) => ({
          studentId,
          status: r.status,
          date: r.date,
        })),
        3 // Seuil de 3 absences
      )[0];

      if (stats && stats.hasAlert) {
        frequentAlerts.push({
          studentId,
          studentName: entry.studentName,
          matricule: entry.matricule,
          className: entry.className,
          totalAbsences: stats.absentCount,
          consecutiveAbsences: stats.consecutiveAbsences,
          attendanceRate: stats.attendanceRate,
        });
      }
    });

    frequentAlerts.sort((a, b) => b.totalAbsences - a.totalAbsences);

    return {
      data: {
        date: targetDate,
        summary: {
          totalEnrolled: allEnrolledStudentIds.size,
          totalRecorded: recordItems.length,
          presentCount: globalSummary.present,
          absentCount: globalSummary.absent,
          lateCount: globalSummary.late,
          excusedCount: globalSummary.excused,
          presenceRate: globalSummary.presenceRate,
          attendanceRate: globalSummary.attendanceRate,
          unexcusedAbsenceRate: globalSummary.unexcusedAbsenceRate,
        },
        classesSummary,
        absentAndLateStudents,
        frequentAbsentAlerts: frequentAlerts.slice(0, 10), // Top 10 alertes
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors du calcul de la synthèse d'assiduité.",
    };
  }
}

/**
 * 5. Mise à jour de la justification d'une absence par la Direction ou l'Enseignant.
 */
export async function updateAttendanceJustificationAction(input: {
  recordId: string;
  status: "excused" | "absent" | "late";
  reason?: string | null;
  arrivalTime?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, schoolId, user } = await getAuthenticatedSchoolContext();

    if (!user) {
      return { success: false, error: "Session non autorisée." };
    }

    const { data: existing, error: findError } = await supabase
      .from("attendance_records")
      .select("id, status, reason, arrival_time, student_id, class_id")
      .eq("id", input.recordId)
      .eq("school_id", schoolId)
      .single();

    if (findError || !existing) {
      return { success: false, error: "Pointage introuvable." };
    }

    const updatePayload: {
      status: AttendanceStatus;
      reason: string | null;
      arrival_time?: string | null;
      updated_at: string;
    } = {
      status: input.status,
      reason: input.reason?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (input.status === "late") {
      updatePayload.arrival_time = input.arrivalTime?.trim() || null;
    }

    const { error: updateError } = await supabase
      .from("attendance_records")
      .update(updatePayload)
      .eq("id", input.recordId)
      .eq("school_id", schoolId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await logAuditEvent({
      schoolId,
      userId: user.id,
      action: "update_attendance_justification",
      entityType: "attendance_records",
      entityId: input.recordId,
      oldData: existing,
      newData: updatePayload,
      reason: input.reason,
    });

    revalidatePath("/admin/attendance");
    revalidatePath("/teacher/attendance");

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour de la justification.",
    };
  }
}
