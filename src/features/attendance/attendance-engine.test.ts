import { describe, it, expect } from "vitest";
import {
  calculateAttendanceSummary,
  detectConsecutiveAbsences,
  calculateStudentAttendanceStats,
  calculateMultiStudentStats,
  calculateClassAttendanceSummary,
  validateAttendanceInput,
  resolveAttendanceConflict,
  type AttendanceRecordItem,
} from "./attendance-engine";

describe("attendance-engine", () => {
  describe("calculateAttendanceSummary", () => {
    it("returns 100% rates for empty records", () => {
      const summary = calculateAttendanceSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.present).toBe(0);
      expect(summary.absent).toBe(0);
      expect(summary.late).toBe(0);
      expect(summary.excused).toBe(0);
      expect(summary.presenceRate).toBe(100);
      expect(summary.attendanceRate).toBe(100);
      expect(summary.unexcusedAbsenceRate).toBe(0);
    });

    it("calculates 100% presence when all students are present", () => {
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "present", date: "2026-10-03" },
        { studentId: "s2", status: "present", date: "2026-10-03" },
        { studentId: "s3", status: "present", date: "2026-10-03" },
      ];
      const summary = calculateAttendanceSummary(records);
      expect(summary.total).toBe(3);
      expect(summary.present).toBe(3);
      expect(summary.presenceRate).toBe(100);
      expect(summary.attendanceRate).toBe(100);
      expect(summary.unexcusedAbsenceRate).toBe(0);
    });

    it("correctly handles late and excused statuses in rates", () => {
      // 10 students: 6 present, 1 late, 1 excused, 2 absent
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "present", date: "2026-10-03" },
        { studentId: "s2", status: "present", date: "2026-10-03" },
        { studentId: "s3", status: "present", date: "2026-10-03" },
        { studentId: "s4", status: "present", date: "2026-10-03" },
        { studentId: "s5", status: "present", date: "2026-10-03" },
        { studentId: "s6", status: "present", date: "2026-10-03" },
        { studentId: "s7", status: "late", date: "2026-10-03", arrivalTime: "08:15" },
        { studentId: "s8", status: "excused", date: "2026-10-03", reason: "Maladie" },
        { studentId: "s9", status: "absent", date: "2026-10-03" },
        { studentId: "s10", status: "absent", date: "2026-10-03" },
      ];
      const summary = calculateAttendanceSummary(records);
      expect(summary.total).toBe(10);
      expect(summary.present).toBe(6);
      expect(summary.late).toBe(1);
      expect(summary.excused).toBe(1);
      expect(summary.absent).toBe(2);

      // Presence rate: (6 + 1) / 10 = 70%
      expect(summary.presenceRate).toBe(70);
      // Attendance rate: (6 + 1 + 1) / 10 = 80%
      expect(summary.attendanceRate).toBe(80);
      // Unexcused absence rate: 2 / 10 = 20%
      expect(summary.unexcusedAbsenceRate).toBe(20);
    });
  });

  describe("detectConsecutiveAbsences", () => {
    it("returns 0 when records list is empty", () => {
      expect(detectConsecutiveAbsences([])).toBe(0);
    });

    it("returns consecutive absences starting from the latest date", () => {
      const records = [
        { date: "2026-10-01", status: "present" as const },
        { date: "2026-10-02", status: "absent" as const },
        { date: "2026-10-03", status: "absent" as const },
      ];
      // Latest dates 10-03 and 10-02 are absent -> 2
      expect(detectConsecutiveAbsences(records)).toBe(2);
    });

    it("breaks streak as soon as a non-absent status is encountered", () => {
      const records = [
        { date: "2026-10-01", status: "absent" as const },
        { date: "2026-10-02", status: "absent" as const },
        { date: "2026-10-03", status: "late" as const }, // Broken by being late
      ];
      expect(detectConsecutiveAbsences(records)).toBe(0);
    });

    it("handles unsorted dates accurately", () => {
      const records = [
        { date: "2026-10-03", status: "absent" as const },
        { date: "2026-09-30", status: "present" as const },
        { date: "2026-10-02", status: "absent" as const },
        { date: "2026-10-01", status: "absent" as const },
      ];
      // Sorted desc: 10-03 (absent), 10-02 (absent), 10-01 (absent), 09-30 (present) -> 3
      expect(detectConsecutiveAbsences(records)).toBe(3);
    });
  });

  describe("calculateStudentAttendanceStats", () => {
    it("sets hasAlert when absences reach the alert threshold", () => {
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "absent", date: "2026-10-01" },
        { studentId: "s1", status: "absent", date: "2026-10-02" },
        { studentId: "s1", status: "absent", date: "2026-10-03" },
      ];
      const stats = calculateStudentAttendanceStats("s1", records, "Kouassi Jean", 3);
      expect(stats.studentName).toBe("Kouassi Jean");
      expect(stats.absentCount).toBe(3);
      expect(stats.consecutiveAbsences).toBe(3);
      expect(stats.hasAlert).toBe(true);
      expect(stats.attendanceRate).toBe(0);
    });

    it("does not trigger alert when absences are below threshold", () => {
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "present", date: "2026-10-01" },
        { studentId: "s1", status: "present", date: "2026-10-02" },
        { studentId: "s1", status: "absent", date: "2026-10-03" },
      ];
      const stats = calculateStudentAttendanceStats("s1", records, "Abalo Paul", 3);
      expect(stats.absentCount).toBe(1);
      expect(stats.consecutiveAbsences).toBe(1);
      expect(stats.hasAlert).toBe(false);
      expect(stats.attendanceRate).toBe(66.7);
    });
  });

  describe("calculateMultiStudentStats", () => {
    it("correctly aggregates stats across multiple students", () => {
      const students = [
        { id: "s1", name: "Élève 1" },
        { id: "s2", name: "Élève 2" },
      ];
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "present", date: "2026-10-03" },
        { studentId: "s2", status: "absent", date: "2026-10-03" },
      ];
      const results = calculateMultiStudentStats(students, records);
      expect(results).toHaveLength(2);
      expect(results[0].studentId).toBe("s1");
      expect(results[0].presentCount).toBe(1);
      expect(results[1].studentId).toBe("s2");
      expect(results[1].absentCount).toBe(1);
    });
  });

  describe("calculateClassAttendanceSummary", () => {
    it("marks class as completed when all student records are submitted", () => {
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "present", date: "2026-10-03" },
        { studentId: "s2", status: "present", date: "2026-10-03" },
      ];
      const summary = calculateClassAttendanceSummary("c1", "6ème A", 2, records);
      expect(summary.isCompleted).toBe(true);
      expect(summary.totalStudents).toBe(2);
      expect(summary.presentCount).toBe(2);
    });

    it("marks class as incomplete if fewer records than enrolled students exist", () => {
      const records: AttendanceRecordItem[] = [
        { studentId: "s1", status: "present", date: "2026-10-03" },
      ];
      const summary = calculateClassAttendanceSummary("c1", "6ème A", 20, records);
      expect(summary.isCompleted).toBe(false);
    });
  });

  describe("validateAttendanceInput", () => {
    it("validates correct inputs", () => {
      const res = validateAttendanceInput({
        status: "present",
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("validates valid late status with arrival time", () => {
      const res = validateAttendanceInput({
        status: "late",
        arrivalTime: "08:15",
      });
      expect(res.isValid).toBe(true);
    });

    it("rejects unknown statuses", () => {
      const res = validateAttendanceInput({
        status: "unknown_status",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("Statut d'assiduité invalide");
    });

    it("rejects malformed arrival time", () => {
      const res = validateAttendanceInput({
        status: "late",
        arrivalTime: "25:70",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("heure d'arrivée est invalide");
    });

    it("rejects excessively long reasons", () => {
      const res = validateAttendanceInput({
        status: "excused",
        reason: "x".repeat(501),
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("500 caractères");
    });
  });

  describe("resolveAttendanceConflict", () => {
    it("gives victory to local change if it is newer", () => {
      const local = {
        status: "absent" as const,
        updatedAt: "2026-10-03T10:00:00Z",
      };
      const remote = {
        status: "present" as const,
        updatedAt: "2026-10-03T09:00:00Z",
      };
      const resolution = resolveAttendanceConflict(local, remote);
      expect(resolution.winner).toBe("local");
      expect(resolution.resolvedStatus).toBe("absent");
    });

    it("gives victory to remote if server is more recent", () => {
      const local = {
        status: "absent" as const,
        updatedAt: "2026-10-03T09:00:00Z",
      };
      const remote = {
        status: "excused" as const,
        reason: "Certificat médical reçu par la Direction",
        updatedAt: "2026-10-03T11:00:00Z",
      };
      const resolution = resolveAttendanceConflict(local, remote);
      expect(resolution.winner).toBe("remote");
      expect(resolution.resolvedStatus).toBe("excused");
      expect(resolution.resolvedReason).toBe("Certificat médical reçu par la Direction");
    });

    it("favors local entry if timestamps are identical", () => {
      const local = {
        status: "late" as const,
        arrivalTime: "08:10",
        updatedAt: "2026-10-03T10:00:00Z",
      };
      const remote = {
        status: "present" as const,
        updatedAt: "2026-10-03T10:00:00Z",
      };
      const resolution = resolveAttendanceConflict(local, remote);
      expect(resolution.winner).toBe("local");
      expect(resolution.resolvedStatus).toBe("late");
      expect(resolution.resolvedArrivalTime).toBe("08:10");
    });
  });
});
