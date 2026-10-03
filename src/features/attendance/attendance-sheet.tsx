"use client";

import * as React from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCheck,
  Search,
  Clock,
  FileText,
  UserCheck,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AttendanceStatus } from "@/types/database";
import { triggerHaptic } from "@/lib/offline/haptics";
import {
  cacheClassRoster,
  getCachedClassRoster,
  queueOfflineAttendance,
  getPendingAttendanceQueue,
  getPendingQueueCount,
  markOutboxItemSyncing,
  markOutboxItemSynced,
  markOutboxItemFailed,
} from "./offline-store";
import {
  getClassStudentsForAttendance,
  saveAttendanceBatchAction,
  type StudentAttendanceSheetItem,
} from "./attendance-actions";

interface ClassOption {
  id: string;
  name: string;
  level: string;
  cycle: string;
  totalEnrolled: number;
}

interface AttendanceSheetProps {
  initialClasses: ClassOption[];
  initialToday: string;
  currentUserId?: string;
  schoolId?: string;
}

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerSnapshot() {
  return true;
}

export function AttendanceSheet({
  initialClasses,
  initialToday,
  schoolId = "",
}: AttendanceSheetProps) {
  const [selectedClassId, setSelectedClassId] = React.useState<string>(
    initialClasses[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = React.useState<string>(initialToday);
  const [pendingQueueCount, setPendingQueueCount] = React.useState<number>(0);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // État de connectivité via useSyncExternalStore (React 19 compliant sans cascade de rendus)
  const isOnline = React.useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    getServerSnapshot
  );

  // État local des élèves et de leurs statuts pour la session
  const [students, setStudents] = React.useState<StudentAttendanceSheetItem[]>([]);
  // Édition en ligne d'un retard (studentId sélectionné pour renseigner l'heure)
  const [editingLateStudentId, setEditingLateStudentId] = React.useState<string | null>(null);
  // Édition en ligne d'une justification (studentId sélectionné pour renseigner le motif)
  const [editingExcusedStudentId, setEditingExcusedStudentId] = React.useState<string | null>(null);

  // 1. Détection de connectivité et synchronisation automatique de l'outbox
  const runOutboxSync = React.useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    try {
      setIsSyncing(true);
      const queue = await getPendingAttendanceQueue();
      if (queue.length === 0) {
        setPendingQueueCount(0);
        return;
      }

      let successCount = 0;
      for (const item of queue) {
        if (!item.id) continue;
        await markOutboxItemSyncing(item.id);

        const res = await saveAttendanceBatchAction({
          classId: item.classId,
          date: item.date,
          timetableSlotId: item.timetableSlotId,
          records: item.records.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            arrivalTime: r.arrivalTime,
            reason: r.reason,
          })),
        });

        if (res.success) {
          await markOutboxItemSynced(item.id);
          successCount += 1;
        } else {
          await markOutboxItemFailed(item.id, res.error || "Erreur serveur");
        }
      }

      const remaining = await getPendingQueueCount();
      setPendingQueueCount(remaining);

      if (successCount > 0) {
        triggerHaptic("success");
        toast.success(
          `${successCount} appel${successCount > 1 ? "s" : ""} synchronisé${successCount > 1 ? "s" : ""} avec le serveur.`
        );
      }
    } catch (err) {
      console.error("[outbox sync] échec:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      toast.info("Connexion Internet rétablie. Synchronisation des données...");
      runOutboxSync();
    };

    const handleOffline = () => {
      triggerHaptic("warning");
      toast.warning("Mode hors-ligne actif. Vos pointages seront stockés localement.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initialisation du compteur d'outbox
    getPendingQueueCount().then(setPendingQueueCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [runOutboxSync]);

  // 2. Chargement de la liste des élèves (réseau ou fallback cache local)
  React.useEffect(() => {
    let cancelled = false;

    if (!selectedClassId) {
      return;
    }

    const targetClass = initialClasses.find((c) => c.id === selectedClassId);

    const fetchRoster = async () => {
      setIsLoadingStudents(true);
      try {
        if (navigator.onLine) {
          const res = await getClassStudentsForAttendance({
            classId: selectedClassId,
            date: selectedDate,
          });

          if (!cancelled && res.data) {
            setStudents(res.data.students);

            if (targetClass) {
              await cacheClassRoster({
                classId: selectedClassId,
                schoolId,
                className: targetClass.name,
                academicYearId: "",
                updatedAt: new Date().toISOString(),
                students: res.data.students.map((s) => ({
                  id: s.studentId,
                  matricule: s.matricule,
                  firstName: s.firstName,
                  lastName: s.lastName,
                  gender: s.gender,
                  photoUrl: s.photoUrl,
                })),
              });
            }
            return;
          }
        }

        // Si hors-ligne ou erreur, on charge depuis IndexedDB Dexie
        const cached = await getCachedClassRoster(selectedClassId);
        if (!cancelled) {
          if (cached && cached.students.length > 0) {
            setStudents(
              cached.students.map((s) => ({
                studentId: s.id,
                matricule: s.matricule,
                firstName: s.firstName,
                lastName: s.lastName,
                gender: s.gender,
                photoUrl: s.photoUrl,
                status: "present" as AttendanceStatus,
                arrivalTime: null,
                reason: null,
                recordId: null,
              }))
            );
            toast.info("Liste chargée depuis la mémoire locale hors-ligne.");
          } else {
            setStudents([]);
            if (!navigator.onLine) {
              toast.warning(
                "Cette classe n'a pas encore été mise en cache locale. Connectez-vous une première fois pour la synchroniser."
              );
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Erreur chargement élèves:", err);
          toast.error("Impossible de charger la liste des élèves.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudents(false);
        }
      }
    };

    fetchRoster();

    return () => {
      cancelled = true;
    };
  }, [selectedClassId, selectedDate, initialClasses, schoolId]);

  // 3. Actions rapides de pointage
  const updateStudentStatus = (
    studentId: string,
    newStatus: AttendanceStatus,
    extra?: { arrivalTime?: string | null; reason?: string | null }
  ) => {
    triggerHaptic(newStatus);
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        return {
          ...s,
          status: newStatus,
          arrivalTime:
            newStatus === "late"
              ? extra?.arrivalTime ?? s.arrivalTime ?? new Date().toTimeString().slice(0, 5)
              : null,
          reason:
            newStatus === "excused"
              ? extra?.reason ?? s.reason ?? "Motif médical ou familial"
              : null,
        };
      })
    );
  };

  const handleMarkAllPresent = () => {
    triggerHaptic("present");
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: "present",
        arrivalTime: null,
        reason: null,
      }))
    );
    toast.success("Tous les élèves ont été marqués Présents.");
  };

  // 4. Enregistrement de l'appel (Online direct ou Outbox IndexedDB)
  const handleSaveAttendance = async () => {
    if (!selectedClassId || students.length === 0) {
      toast.error("Aucun élève à enregistrer.");
      return;
    }

    setIsSaving(true);
    const recordsPayload = students.map((s) => ({
      studentId: s.studentId,
      status: s.status,
      arrivalTime: s.arrivalTime,
      reason: s.reason,
      updatedAt: new Date().toISOString(),
    }));

    try {
      if (navigator.onLine) {
        // Enregistrement direct côté serveur
        const res = await saveAttendanceBatchAction({
          classId: selectedClassId,
          date: selectedDate,
          records: recordsPayload,
        });

        if (res.success) {
          triggerHaptic("success");
          toast.success("Appel enregistré et synchronisé avec succès !");
        } else {
          // Si échec serveur inattendu, on bascule en sauvegarde outbox de sécurité
          await queueOfflineAttendance({
            localId: `${selectedClassId}_${selectedDate}_${Date.now()}`,
            schoolId,
            academicYearId: "",
            classId: selectedClassId,
            date: selectedDate,
            timetableSlotId: null,
            records: recordsPayload,
          });
          const count = await getPendingQueueCount();
          setPendingQueueCount(count);
          triggerHaptic("warning");
          toast.warning(
            "Le serveur est indisponible : l'appel a été sécurisé dans la file d'attente locale."
          );
        }
      } else {
        // Mode hors-ligne direct : stockage dans IndexedDB
        await queueOfflineAttendance({
          localId: `${selectedClassId}_${selectedDate}_${Date.now()}`,
          schoolId,
          academicYearId: "",
          classId: selectedClassId,
          date: selectedDate,
          timetableSlotId: null,
          records: recordsPayload,
        });

        const count = await getPendingQueueCount();
        setPendingQueueCount(count);
        triggerHaptic("success");
        toast.success(
          "Appel sauvegardé hors-ligne. Il sera synchronisé dès le retour du réseau."
        );
      }
    } catch (err) {
      console.error("Erreur sauvegarde appel:", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  // Statistiques calculées en temps réel sur la liste courante
  const totalCount = students.length;
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const excusedCount = students.filter((s) => s.status === "excused").length;
  const presenceRate =
    totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 100;

  // Filtrage recherche
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matricule = s.matricule.toLowerCase();
    return fullName.includes(query) || matricule.includes(query);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* 1. Barre d'état réseau et synchronisation */}
      <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Wifi className="h-3.5 w-3.5" />
              <span>Connecté au réseau</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Mode Hors-Ligne</span>
            </div>
          )}

          {pendingQueueCount > 0 && (
            <Badge variant="warning" className="text-[11px] animate-pulse">
              {pendingQueueCount} en attente
            </Badge>
          )}
        </div>

        {isOnline && pendingQueueCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={runOutboxSync}
            disabled={isSyncing}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Synchroniser</span>
          </Button>
        )}
      </div>

      {/* 2. Sélecteurs Classe et Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1">
            Classe
          </label>
          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-surface text-sm font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {initialClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.totalEnrolled} élèves)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none text-foreground-muted" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1">
            Date de la séance
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
      </div>

      {/* 3. Bandeau de statistiques rapides */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-surface p-2.5 rounded-xl border border-border">
          <p className="text-[11px] text-foreground-muted font-medium">Présents</p>
          <p className="text-lg font-bold text-emerald-600">{presentCount}</p>
        </div>
        <div className="bg-surface p-2.5 rounded-xl border border-border">
          <p className="text-[11px] text-foreground-muted font-medium">Absents</p>
          <p className="text-lg font-bold text-rose-600">{absentCount}</p>
        </div>
        <div className="bg-surface p-2.5 rounded-xl border border-border">
          <p className="text-[11px] text-foreground-muted font-medium">Retards</p>
          <p className="text-lg font-bold text-amber-600">{lateCount}</p>
        </div>
        <div className="bg-surface p-2.5 rounded-xl border border-border">
          <p className="text-[11px] text-foreground-muted font-medium">Taux</p>
          <p className="text-lg font-bold text-brand-primary">{presenceRate}%</p>
        </div>
      </div>

      {/* 4. Barre d'action rapide : Tout Présent + Recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleMarkAllPresent}
          className="h-10 text-xs font-semibold gap-1.5 justify-center bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
        >
          <CheckCheck className="h-4 w-4" />
          <span>Tout marquer Présent</span>
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-foreground-muted pointer-events-none" />
          <Input
            type="text"
            placeholder="Rechercher élève ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      {/* 5. Liste des élèves pour le pointage tactile */}
      {isLoadingStudents ? (
        <div className="p-8 text-center bg-surface rounded-xl border border-border space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-primary" />
          <p className="text-xs text-foreground-muted">Chargement de la liste d&apos;élèves...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-8 text-center bg-surface rounded-xl border border-border space-y-2">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
          <p className="text-sm font-semibold text-foreground">Aucun élève trouvé</p>
          <p className="text-xs text-foreground-muted">
            Vérifiez vos filtres ou assurez-vous que des élèves sont inscrits dans cette classe.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredStudents.map((student, index) => {
            const isPresent = student.status === "present";
            const isAbsent = student.status === "absent";
            const isLate = student.status === "late";
            const isExcused = student.status === "excused";

            const isEditingLate = editingLateStudentId === student.studentId;
            const isEditingExcused = editingExcusedStudentId === student.studentId;

            return (
              <div
                key={student.studentId}
                className="bg-surface rounded-xl p-3.5 border border-border shadow-2xs space-y-3 transition-colors hover:border-slate-300"
              >
                {/* Ligne d'en-tête de l'élève */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-slate-100 text-[#002B5B] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {index + 1}. {student.lastName} {student.firstName}
                      </p>
                      <p className="text-[11px] font-mono text-foreground-muted">
                        {student.matricule} • {student.gender === "M" ? "Garçon" : "Fille"}
                      </p>
                    </div>
                  </div>

                  {/* Badge récapitulatif du statut */}
                  <div>
                    {isPresent && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        Présent
                      </span>
                    )}
                    {isAbsent && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                        Absent
                      </span>
                    )}
                    {isLate && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        Retard {student.arrivalTime ? `(${student.arrivalTime})` : ""}
                      </span>
                    )}
                    {isExcused && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                        Justifié
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Boutons tactiles (min 44px de hauteur pour confort mobile) */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateStudentStatus(student.studentId, "present")}
                    className={`h-11 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isPresent
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Présent
                  </button>

                  <button
                    type="button"
                    onClick={() => updateStudentStatus(student.studentId, "absent")}
                    className={`h-11 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isAbsent
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Absent
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateStudentStatus(student.studentId, "late");
                      setEditingLateStudentId(
                        editingLateStudentId === student.studentId ? null : student.studentId
                      );
                    }}
                    className={`h-11 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isLate
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Retard
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateStudentStatus(student.studentId, "excused");
                      setEditingExcusedStudentId(
                        editingExcusedStudentId === student.studentId ? null : student.studentId
                      );
                    }}
                    className={`h-11 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isExcused
                        ? "bg-sky-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Justifié
                  </button>
                </div>

                {/* Saisie de l'heure de retard si sélectionné */}
                {isLate && (isEditingLate || !student.arrivalTime) && (
                  <div className="pt-2 flex items-center gap-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-800 font-medium">Heure d&apos;arrivée :</span>
                    <input
                      type="time"
                      value={student.arrivalTime || "08:15"}
                      onChange={(e) =>
                        updateStudentStatus(student.studentId, "late", {
                          arrivalTime: e.target.value,
                        })
                      }
                      className="h-8 px-2 rounded border border-amber-300 bg-white text-xs font-mono font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                )}

                {/* Saisie du motif si justifié */}
                {isExcused && (isEditingExcused || !student.reason) && (
                  <div className="pt-2 flex items-center gap-2 bg-sky-50/50 p-2.5 rounded-lg border border-sky-200/60">
                    <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                    <input
                      type="text"
                      placeholder="Motif (ex: Maladie, Convocation, Famille)..."
                      value={student.reason || ""}
                      onChange={(e) =>
                        updateStudentStatus(student.studentId, "excused", {
                          reason: e.target.value,
                        })
                      }
                      className="flex-1 h-8 px-2 rounded border border-sky-300 bg-white text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Barre d'action fixe en bas (Sticky Bottom Bar) */}
      <div className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md border-t border-border p-3.5 z-30 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-foreground-muted">
            <span className="font-bold text-foreground">{students.length}</span> élève
            {students.length > 1 ? "s" : ""} •{" "}
            <span className="text-emerald-600 font-semibold">{presentCount} P</span>,{" "}
            <span className="text-rose-600 font-semibold">{absentCount} A</span>,{" "}
            <span className="text-amber-600 font-semibold">{lateCount} R</span>,{" "}
            <span className="text-sky-600 font-semibold">{excusedCount} J</span>
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleSaveAttendance}
            disabled={isSaving || students.length === 0}
            className="text-xs font-bold px-5 bg-[#002B5B] hover:bg-[#002047] gap-2"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            <span>Enregistrer l&apos;Appel</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
