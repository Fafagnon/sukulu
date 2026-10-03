import type { AttendanceStatus } from "@/types/database";

export interface AttendanceRecordItem {
  id?: string;
  studentId: string;
  status: AttendanceStatus;
  date: string;
  timetableSlotId?: string | null;
  arrivalTime?: string | null;
  reason?: string | null;
  updatedAt?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /**
   * Taux de présence brute = (présents + retards) / total * 100.
   */
  presenceRate: number;
  /**
   * Taux d'assiduité global = (présents + retards + justifiés) / total * 100.
   * Les absences justifiées ne pénalisent pas l'assiduité globale de l'élève.
   */
  attendanceRate: number;
  /**
   * Taux d'absences injustifiées = absents non justifiés / total * 100.
   */
  unexcusedAbsenceRate: number;
}

export interface StudentAttendanceStats {
  studentId: string;
  studentName?: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  presenceRate: number;
  consecutiveAbsences: number;
  hasAlert: boolean;
}

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  isCompleted: boolean;
}

export interface AttendanceConflictResolution {
  winner: "local" | "remote";
  resolvedStatus: AttendanceStatus;
  resolvedReason: string | null;
  resolvedArrivalTime: string | null;
  decisionReason: string;
}

const DEFAULT_ALERT_THRESHOLD = 3;

/**
 * Calcule la synthèse statistique d'une liste de pointages d'assiduité.
 */
export function calculateAttendanceSummary(
  records: AttendanceRecordItem[]
): AttendanceSummary {
  const total = records.length;
  if (total === 0) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      presenceRate: 100,
      attendanceRate: 100,
      unexcusedAbsenceRate: 0,
    };
  }

  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  for (const r of records) {
    switch (r.status) {
      case "present":
        present += 1;
        break;
      case "absent":
        absent += 1;
        break;
      case "late":
        late += 1;
        break;
      case "excused":
        excused += 1;
        break;
    }
  }

  const round1Decimal = (val: number) => Math.round(val * 10) / 10;

  const presenceRate = round1Decimal(((present + late) / total) * 100);
  const attendanceRate = round1Decimal(((present + late + excused) / total) * 100);
  const unexcusedAbsenceRate = round1Decimal((absent / total) * 100);

  return {
    total,
    present,
    absent,
    late,
    excused,
    presenceRate,
    attendanceRate,
    unexcusedAbsenceRate,
  };
}

/**
 * Calcule le nombre d'absences injustifiées consécutives sur les séances les plus récentes.
 * Les enregistrements sont triés par date décroissante.
 */
export function detectConsecutiveAbsences(
  records: { date: string; status: AttendanceStatus }[]
): number {
  if (records.length === 0) return 0;

  // Tri par date décroissante (plus récent d'abord)
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let consecutive = 0;
  for (const rec of sorted) {
    if (rec.status === "absent") {
      consecutive += 1;
    } else {
      break;
    }
  }

  return consecutive;
}

/**
 * Calcule les statistiques d'assiduité complètes d'un élève individuel.
 */
export function calculateStudentAttendanceStats(
  studentId: string,
  records: AttendanceRecordItem[],
  studentName?: string,
  alertThreshold: number = DEFAULT_ALERT_THRESHOLD
): StudentAttendanceStats {
  const summary = calculateAttendanceSummary(records);
  const consecutiveAbsences = detectConsecutiveAbsences(records);

  const hasAlert =
    summary.absent >= alertThreshold || consecutiveAbsences >= alertThreshold;

  return {
    studentId,
    studentName,
    totalSessions: summary.total,
    presentCount: summary.present,
    absentCount: summary.absent,
    lateCount: summary.late,
    excusedCount: summary.excused,
    attendanceRate: summary.attendanceRate,
    presenceRate: summary.presenceRate,
    consecutiveAbsences,
    hasAlert,
  };
}

/**
 * Synthétise les statistiques d'un groupe d'élèves pour repérer les alertes.
 */
export function calculateMultiStudentStats(
  students: { id: string; name?: string }[],
  records: AttendanceRecordItem[],
  alertThreshold: number = DEFAULT_ALERT_THRESHOLD
): StudentAttendanceStats[] {
  // Regroupement des records par studentId
  const recordsByStudent = new Map<string, AttendanceRecordItem[]>();
  for (const student of students) {
    recordsByStudent.set(student.id, []);
  }

  for (const rec of records) {
    const list = recordsByStudent.get(rec.studentId);
    if (list) {
      list.push(rec);
    } else {
      recordsByStudent.set(rec.studentId, [rec]);
    }
  }

  const results: StudentAttendanceStats[] = [];
  for (const student of students) {
    const studentRecords = recordsByStudent.get(student.id) ?? [];
    results.push(
      calculateStudentAttendanceStats(
        student.id,
        studentRecords,
        student.name,
        alertThreshold
      )
    );
  }

  return results;
}

/**
 * Calcule la synthèse d'assiduité d'une classe pour une séance ou une journée.
 */
export function calculateClassAttendanceSummary(
  classId: string,
  className: string,
  totalStudents: number,
  records: AttendanceRecordItem[]
): ClassAttendanceSummary {
  const summary = calculateAttendanceSummary(records);
  const isCompleted = records.length > 0 && records.length >= totalStudents;

  return {
    classId,
    className,
    totalStudents,
    presentCount: summary.present,
    absentCount: summary.absent,
    lateCount: summary.late,
    excusedCount: summary.excused,
    attendanceRate: summary.attendanceRate,
    isCompleted,
  };
}

/**
 * Valide un pointage d'assiduité unitaire.
 */
export function validateAttendanceInput(input: {
  status: string;
  arrivalTime?: string | null;
  reason?: string | null;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validStatuses: AttendanceStatus[] = ["present", "absent", "late", "excused"];

  if (!validStatuses.includes(input.status as AttendanceStatus)) {
    errors.push(
      `Statut d'assiduité invalide "${input.status}". Statuts autorisés : present, absent, late, excused.`
    );
  }

  if (input.status === "late" && input.arrivalTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(input.arrivalTime.trim())) {
      errors.push("Le format de l'heure d'arrivée est invalide (format attendu : HH:mm).");
    }
  }

  if (input.reason && input.reason.length > 500) {
    errors.push("Le motif de justification ne peut excéder 500 caractères.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Résolution déterministe de conflit de synchronisation offline (Last-Write-Wins avec priorité locale).
 */
export function resolveAttendanceConflict(
  local: {
    status: AttendanceStatus;
    arrivalTime?: string | null;
    reason?: string | null;
    updatedAt: string;
  },
  remote: {
    status: AttendanceStatus;
    arrivalTime?: string | null;
    reason?: string | null;
    updatedAt: string;
  }
): AttendanceConflictResolution {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  if (isNaN(localTime) || isNaN(remoteTime)) {
    // Si une date est invalide, la saisie locale prévaut (saisie terrain immédiate de l'enseignant)
    return {
      winner: "local",
      resolvedStatus: local.status,
      resolvedReason: local.reason ?? null,
      resolvedArrivalTime: local.arrivalTime ?? null,
      decisionReason: "Horodatage invalide, priorité donnée à la saisie locale enseignant",
    };
  }

  if (localTime >= remoteTime) {
    return {
      winner: "local",
      resolvedStatus: local.status,
      resolvedReason: local.reason ?? null,
      resolvedArrivalTime: local.arrivalTime ?? null,
      decisionReason: "La saisie locale est plus récente ou égale à celle du serveur",
    };
  }

  return {
    winner: "remote",
    resolvedStatus: remote.status,
    resolvedReason: remote.reason ?? null,
    resolvedArrivalTime: remote.arrivalTime ?? null,
    decisionReason: "La version distante sur le serveur est plus récente",
  };
}
