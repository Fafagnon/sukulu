"use client";

import * as React from "react";
import {
  Calendar,
  AlertTriangle,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AttendanceStatus } from "@/types/database";
import {
  getDailyAttendanceOverviewAction,
  updateAttendanceJustificationAction,
  type DailyAttendanceOverview,
} from "./attendance-actions";

interface AttendanceDirectionDashboardProps {
  initialData: DailyAttendanceOverview;
}

export function AttendanceDirectionDashboard({
  initialData,
}: AttendanceDirectionDashboardProps) {
  const [data, setData] = React.useState<DailyAttendanceOverview>(initialData);
  const [selectedDate, setSelectedDate] = React.useState<string>(initialData.date);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<"classes" | "absents" | "alerts">("classes");
  const [studentSearch, setStudentSearch] = React.useState<string>("");

  // Modale / formulaire de justification
  const [justifyingRecord, setJustifyingRecord] = React.useState<{
    recordId: string;
    studentName: string;
    currentStatus: AttendanceStatus;
    reason: string;
  } | null>(null);
  const [isSubmittingJustification, setIsSubmittingJustification] = React.useState<boolean>(false);

  const fetchOverview = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await getDailyAttendanceOverviewAction({ date });
      if (res.data) {
        setData(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch {
      toast.error("Erreur lors du rechargement de l'assiduité.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    fetchOverview(newDate);
  };

  const handleQuickDate = (deltaDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + deltaDays);
    const dateStr = d.toISOString().split("T")[0];
    handleDateChange(dateStr);
  };

  const handleSaveJustification = async () => {
    if (!justifyingRecord) return;
    setIsSubmittingJustification(true);

    try {
      const res = await updateAttendanceJustificationAction({
        recordId: justifyingRecord.recordId,
        status: "excused",
        reason: justifyingRecord.reason,
      });

      if (res.success) {
        toast.success("Absence justifiée avec succès.");
        setJustifyingRecord(null);
        await fetchOverview(selectedDate);
      } else {
        toast.error(res.error || "Erreur lors de la mise à jour.");
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setIsSubmittingJustification(false);
    }
  };

  const completedClassesCount = data.classesSummary.filter((c) => c.isCompleted).length;
  const totalClassesCount = data.classesSummary.length;

  const filteredAbsents = data.absentAndLateStudents.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase().trim();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.matricule.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Barre de navigation de date */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate(0)}
            className="text-xs h-9 font-semibold"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate(-1)}
            className="text-xs h-9"
          >
            Hier
          </Button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:ring-2 focus:ring-brand-primary outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Calendar className="h-4 w-4 text-brand-primary" />
          <span>
            {new Date(selectedDate).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {isLoading && <span className="animate-spin text-brand-primary">↻</span>}
        </div>
      </div>

      {/* 2. Cartes d'indicateurs clés (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Taux d'assiduité global */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Taux Global</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {data.summary.attendanceRate}%
          </p>
          <p className="text-[11px] text-foreground-muted">
            {data.summary.totalRecorded} pointages enregistrés
          </p>
        </div>

        {/* Absences non justifiées */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Non Justifiées</span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-rose-600">
            {data.summary.absentCount}
          </p>
          <p className="text-[11px] text-foreground-muted">
            {data.summary.unexcusedAbsenceRate}% d&apos;absentéisme brut
          </p>
        </div>

        {/* Retards */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Retards</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-amber-600">
            {data.summary.lateCount}
          </p>
          <p className="text-[11px] text-foreground-muted">
            {data.summary.excusedCount} absences justifiées
          </p>
        </div>

        {/* Classes avec appel effectué */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Appels Effectués</span>
            <div className="h-7 w-7 rounded-lg bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-brand-primary">
            {completedClassesCount} / {totalClassesCount}
          </p>
          <p className="text-[11px] text-foreground-muted">
            {totalClassesCount - completedClassesCount > 0
              ? `${totalClassesCount - completedClassesCount} classe(s) en attente`
              : "Tous les appels sont validés"}
          </p>
        </div>
      </div>

      {/* 3. Onglets de visualisation */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "classes"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Bilan par Classe ({data.classesSummary.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("absents")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "absents"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Absents & Retards du Jour ({data.absentAndLateStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "alerts"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Alertes Assiduité ({data.frequentAbsentAlerts.length})
          </button>
        </nav>
      </div>

      {/* 4. Contenu selon l'onglet actif */}

      {/* ONGLET 1 : SYNTHÈSE PAR CLASSE */}
      {activeTab === "classes" && (
        <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-foreground-muted font-semibold">
                <tr>
                  <th className="p-3.5">Classe</th>
                  <th className="p-3.5 text-center">Effectif</th>
                  <th className="p-3.5 text-center">Présents</th>
                  <th className="p-3.5 text-center">Absents</th>
                  <th className="p-3.5 text-center">Retards</th>
                  <th className="p-3.5 text-center">Taux</th>
                  <th className="p-3.5 text-right">Statut Appel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.classesSummary.map((cls) => (
                  <tr key={cls.classId} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-foreground">{cls.className}</td>
                    <td className="p-3.5 text-center text-foreground-muted">{cls.totalStudents}</td>
                    <td className="p-3.5 text-center font-semibold text-emerald-600">
                      {cls.presentCount}
                    </td>
                    <td className="p-3.5 text-center font-semibold text-rose-600">
                      {cls.absentCount}
                    </td>
                    <td className="p-3.5 text-center font-semibold text-amber-600">
                      {cls.lateCount}
                    </td>
                    <td className="p-3.5 text-center font-bold text-brand-primary">
                      {cls.attendanceRate}%
                    </td>
                    <td className="p-3.5 text-right">
                      {cls.isCompleted ? (
                        <Badge variant="success" className="text-[10px]">
                          Appel Validé
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          En Attente
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ONGLET 2 : ABSENTS ET RETARDS DU JOUR AVEC JUSTIFICATION */}
      {activeTab === "absents" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Filtrer par nom, matricule ou classe..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {filteredAbsents.length === 0 ? (
            <div className="p-8 text-center bg-surface rounded-xl border border-border">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Aucune absence signalée</p>
              <p className="text-xs text-foreground-muted">
                Tous les élèves pointés sont présents pour cette date.
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border shadow-xs divide-y divide-border">
              {filteredAbsents.map((item) => (
                <div
                  key={item.recordId}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{item.studentName}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.className}
                      </Badge>
                      <span className="text-[11px] font-mono text-foreground-muted">
                        {item.matricule}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                      {item.status === "absent" && (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Absent non justifié
                        </span>
                      )}
                      {item.status === "late" && (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Retard ({item.arrivalTime || "heure non spécifiée"})
                        </span>
                      )}
                      {item.status === "excused" && (
                        <span className="text-sky-600 font-semibold flex items-center gap-1">
                          <FileCheck className="h-3.5 w-3.5" /> Justifié : {item.reason || "Sans motif"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {item.status === "absent" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setJustifyingRecord({
                            recordId: item.recordId,
                            studentName: item.studentName,
                            currentStatus: item.status,
                            reason: item.reason || "",
                          })
                        }
                        className="text-xs h-8"
                      >
                        Justifier l&apos;absence
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ONGLET 3 : ALERTES ASSIDUITÉ (DÉCROCHAGE SCOLAIRE) */}
      {activeTab === "alerts" && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-bold">Système d&apos;alerte précoce d&apos;absentéisme (Règle scolaire)</p>
              <p>
                Sont répertoriés ici les élèves ayant accumulé 3 absences ou plus sur l&apos;année scolaire
                active afin d&apos;engager immédiatement une convocation parentale ou un entretien de médiation.
              </p>
            </div>
          </div>

          {data.frequentAbsentAlerts.length === 0 ? (
            <div className="p-8 text-center bg-surface rounded-xl border border-border">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Aucune alerte d&apos;assiduité active</p>
              <p className="text-xs text-foreground-muted">
                Aucun élève n&apos;a dépassé le seuil critique d&apos;absentéisme récurrent.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.frequentAbsentAlerts.map((alert) => (
                <div
                  key={alert.studentId}
                  className="bg-surface p-4 rounded-xl border border-rose-200/80 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{alert.studentName}</p>
                      <p className="text-xs text-foreground-muted font-mono">
                        {alert.matricule} • Classe : {alert.className}
                      </p>
                    </div>
                    <Badge variant="error" className="text-[10px]">
                      Alerte Assiduité
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border">
                    <div>
                      <span className="text-foreground-muted">Total absences :</span>{" "}
                      <span className="font-bold text-rose-600">{alert.totalAbsences}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Consécutives :</span>{" "}
                      <span className="font-bold text-amber-600">
                        {alert.consecutiveAbsences}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Modale / Boîte de dialogue de justification */}
      {justifyingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h2 className="text-base font-bold text-foreground">Justifier l&apos;absence</h2>
              <p className="text-xs text-foreground-muted">
                Élève : <span className="font-semibold text-foreground">{justifyingRecord.studentName}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Motif de justification
              </label>
              <textarea
                rows={3}
                placeholder="Ex : Certificat médical présenté par le tuteur légal, urgence familiale..."
                value={justifyingRecord.reason}
                onChange={(e) =>
                  setJustifyingRecord({
                    ...justifyingRecord,
                    reason: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-brand-primary outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setJustifyingRecord(null)}
                disabled={isSubmittingJustification}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveJustification}
                disabled={isSubmittingJustification}
                className="text-xs bg-[#002B5B] hover:bg-[#002047]"
              >
                {isSubmittingJustification ? "Enregistrement..." : "Valider la justification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
