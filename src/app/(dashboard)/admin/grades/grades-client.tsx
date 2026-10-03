"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  ClipboardCheck,
  Table2,
  Lock,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { getClassSubjects } from "@/features/academic/subjects-actions";
import {
  createAssessmentAction,
  deleteAssessmentAction,
  getGradesSheet,
  getClassResults,
  saveGradesAction,
  type AssessmentItem,
  type GradeEntry,
  type ClassResultRow,
} from "@/features/grades/grade-actions";

interface ClassItem {
  id: string;
  name: string;
  cycle: string;
  level: string;
}

interface PeriodItem {
  id: string;
  name: string;
  status: "open" | "review" | "locked";
  order_index: number;
}

interface TeacherItem {
  id: string;
  first_name: string;
  last_name: string;
}

interface AssignmentItem {
  id: string;
  subject_id: string;
  coefficient: number;
  subjects?: { id: string; name: string; code: string } | null;
}

interface SheetStudent {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
}

interface ClassStatsData {
  evaluatedCount: number;
  classAverage: number | null;
  highest: number | null;
  lowest: number | null;
  successRate: number | null;
}

/** État local d'une cellule modifiée : assessmentId → studentId → note */
type DirtyMap = Record<string, Record<string, number | null>>;

export function GradesClient({
  classes,
  periods,
  teachers,
  activeYearId,
  loadError,
}: {
  classes: ClassItem[];
  periods: PeriodItem[];
  teachers: TeacherItem[];
  activeYearId: string | null;
  loadError?: string;
}) {
  const [selectedClassId, setSelectedClassId] = React.useState(classes[0]?.id || "");
  const [selectedSubjectId, setSelectedSubjectId] = React.useState("");
  const [selectedPeriodId, setSelectedPeriodId] = React.useState(
    periods.find((p) => p.status === "open")?.id || periods[0]?.id || ""
  );
  const [tab, setTab] = React.useState<"entry" | "results">("entry");

  const [assignments, setAssignments] = React.useState<AssignmentItem[]>([]);
  const [sheet, setSheet] = React.useState<{
    students: SheetStudent[];
    assessments: AssessmentItem[];
    grades: GradeEntry[];
    period: { id: string; name: string; status: "open" | "review" | "locked" } | null;
  } | null>(null);
  const [isLoadingSheet, setIsLoadingSheet] = React.useState(false);
  const [dirty, setDirty] = React.useState<DirtyMap>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Modal création d'évaluation
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    type: "cc" as "cc" | "composition",
    date: new Date().toISOString().split("T")[0],
    maxScore: "20",
    teacherId: "",
  });

  // Onglet résultats
  const [results, setResults] = React.useState<{
    rows: ClassResultRow[];
    stats: ClassStatsData;
  } | null>(null);
  const [isLoadingResults, setIsLoadingResults] = React.useState(false);
  const [expandedStudent, setExpandedStudent] = React.useState<string | null>(null);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || null;
  const isLocked = selectedPeriod?.status === "locked";
  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;
  const selectedAssignment = assignments.find((a) => a.subject_id === selectedSubjectId);

  // Fetch pur (aucun setState) : partagé par l'effet et les handlers
  const fetchSheet = React.useCallback(
    (classId: string, subjectId: string, periodId: string) =>
      getGradesSheet({ classId, subjectId, periodId }),
    []
  );

  // Rechargement explicite depuis un handler d'événement
  const loadSheet = React.useCallback(
    async (classId: string, subjectId: string, periodId: string) => {
      if (!classId || !subjectId || !periodId) return;
      setIsLoadingSheet(true);
      setDirty({});
      const res = await fetchSheet(classId, subjectId, periodId);
      setIsLoadingSheet(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSheet(res.data || null);
    },
    [fetchSheet]
  );

  // Charger les matières de la classe sélectionnée
  // (le réinitialisation de sélection est faite par le onChange du sélecteur)
  React.useEffect(() => {
    let cancelled = false;
    if (!selectedClassId) return;
    void (async () => {
      const res = await getClassSubjects(selectedClassId);
      if (cancelled) return;
      const list = (res.data || []) as unknown as AssignmentItem[];
      setAssignments(list);
      setSelectedSubjectId((current) =>
        list.some((a) => a.subject_id === current) ? current : list[0]?.subject_id || ""
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  // Recharger la grille quand classe / matière / période changent
  React.useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !selectedPeriodId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchSheet(
        selectedClassId,
        selectedSubjectId,
        selectedPeriodId
      );
      if (cancelled) return;
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setDirty({});
      setSheet(res.data || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, selectedSubjectId, selectedPeriodId, fetchSheet]);

  const setCellValue = (assessmentId: string, studentId: string, value: string) => {
    const parsed = value === "" ? null : parseFloat(value);
    if (parsed !== null && !Number.isFinite(parsed)) return;
    setDirty((prev) => ({
      ...prev,
      [assessmentId]: {
        ...(prev[assessmentId] || {}),
        [studentId]: parsed,
      },
    }));
  };

  const cellValue = (assessmentId: string, studentId: string): number | null => {
    if (dirty[assessmentId] && studentId in dirty[assessmentId]) {
      return dirty[assessmentId][studentId];
    }
    const grade = sheet?.grades.find(
      (g) => g.assessment_id === assessmentId && g.student_id === studentId
    );
    return grade ? Number(grade.score) : null;
  };

  const hasDirty = Object.keys(dirty).length > 0;

  const handleSave = async () => {
    if (!sheet) return;
    setIsSaving(true);

    let saved = 0;
    for (const [assessmentId, edits] of Object.entries(dirty)) {
      const scores = sheet.students.map((student) => ({
        studentId: student.id,
        score:
          student.id in edits
            ? edits[student.id]
            : cellValueFromSheet(assessmentId, student.id),
      }));

      const res = await saveGradesAction({ assessmentId, scores });
      if (res.error) {
        toast.error(res.error);
        setIsSaving(false);
        return;
      }
      saved++;
    }

    setIsSaving(false);
    setDirty({});
    toast.success(`${saved} évaluation(s) enregistrée(s).`);
    await loadSheet(selectedClassId, selectedSubjectId, selectedPeriodId);
  };

  const cellValueFromSheet = (
    assessmentId: string,
    studentId: string
  ): number | null => {
    const grade = sheet?.grades.find(
      (g) => g.assessment_id === assessmentId && g.student_id === studentId
    );
    return grade ? Number(grade.score) : null;
  };

  const handleCreateAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeYearId) {
      toast.error("Aucune année scolaire active.");
      return;
    }
    setIsCreating(true);

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("type", form.type);
    formData.set("classId", selectedClassId);
    formData.set("subjectId", selectedSubjectId);
    formData.set("periodId", selectedPeriodId);
    formData.set("academicYearId", activeYearId);
    formData.set("assessmentDate", form.date);
    formData.set("maxScore", form.maxScore);
    if (form.teacherId) formData.set("teacherId", form.teacherId);

    const res = await createAssessmentAction(formData);
    setIsCreating(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success("Évaluation créée.");
    setIsModalOpen(false);
    setForm((f) => ({ ...f, title: "" }));
    await loadSheet(selectedClassId, selectedSubjectId, selectedPeriodId);
  };

  const handleDeleteAssessment = async (assessment: AssessmentItem) => {
    if (
      !window.confirm(
        `Supprimer l'évaluation « ${assessment.title} » et toutes ses notes ?`
      )
    ) {
      return;
    }
    const res = await deleteAssessmentAction(assessment.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Évaluation supprimée.");
    await loadSheet(selectedClassId, selectedSubjectId, selectedPeriodId);
  };

  const handleLoadResults = async () => {
    if (!selectedClassId || !selectedPeriodId) return;
    setIsLoadingResults(true);
    const res = await getClassResults({
      classId: selectedClassId,
      periodId: selectedPeriodId,
    });
    setIsLoadingResults(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setResults(res.data || null);
  };

  const emptyState =
    !loadError &&
    classes.length === 0;

  if (emptyState) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Créez d&apos;abord vos classes et affectez leurs matières
        </p>
        <p className="text-xs text-slate-500 mt-1">
          La saisie des notes nécessite une classe avec au moins une matière affectée.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Barre de filtres */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="grade-class" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Classe
            </label>
            <select
              id="grade-class"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSubjectId("");
                setAssignments([]);
                setSheet(null);
                setDirty({});
              }}
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="grade-subject" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Matière
            </label>
            <select
              id="grade-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
            >
              {assignments.length === 0 && <option value="">Aucune matière affectée</option>}
              {assignments.map((a) => (
                <option key={a.subject_id} value={a.subject_id}>
                  {a.subjects?.name || "Matière"} (coeff. {a.coefficient})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="grade-period" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Période
            </label>
            <select
              id="grade-period"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status === "locked" ? " — verrouillée" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Onglets + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("entry")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === "entry"
                  ? "bg-[#002B5B] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" /> Saisie des notes
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("results")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === "results"
                  ? "bg-[#002B5B] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Table2 className="w-3.5 h-3.5" /> Résultats &amp; Rangs
              </span>
            </button>
          </div>

          {isLocked && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              <Lock className="w-3 h-3" /> Période verrouillée (lecture seule)
            </span>
          )}
        </div>
      </div>

      {/* ================= ONGLET SAISIE ================= */}
      {tab === "entry" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedClass?.name || "Classe"} — {selectedAssignment?.subjects?.name || "Matière"}
              </p>
              <p className="text-[11px] text-slate-500">
                {sheet?.assessments.length || 0} évaluation(s) · {sheet?.students.length || 0} élève(s)
                {selectedAssignment ? ` · coefficient ${selectedAssignment.coefficient}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasDirty && !isLocked && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              )}
              {!isLocked && selectedSubjectId && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white px-3.5 py-2 text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouvelle évaluation
                </button>
              )}
            </div>
          </div>

          {isLoadingSheet ? (
            <div className="p-6 space-y-3">
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ) : !selectedSubjectId ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Aucune matière affectée à cette classe. Rendez-vous dans « Matières &amp; Coeffs ».
            </div>
          ) : (sheet?.assessments.length || 0) === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Aucune évaluation pour cette matière et cette période. Créez-en une pour commencer la
              saisie.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left font-semibold text-slate-600 text-xs px-4 py-2.5 sticky left-0 bg-slate-50 min-w-[200px]">
                      Élève
                    </th>
                    {sheet?.assessments.map((a) => (
                      <th
                        key={a.id}
                        className="text-center font-semibold text-slate-600 text-xs px-2 py-2.5 min-w-[130px]"
                      >
                        <span className="inline-flex items-center gap-1">
                          {a.type === "composition" ? (
                            <span className="rounded-full bg-[#FF6B00]/10 text-[#FF6B00] px-1.5 py-0.5 text-[9px] font-bold uppercase">
                              Comp.
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#002B5B]/10 text-[#002B5B] px-1.5 py-0.5 text-[9px] font-bold uppercase">
                              CC
                            </span>
                          )}
                          <span className="truncate max-w-[110px]">{a.title}</span>
                              {!isLocked && (
                              <button
                                type="button"
                                title="Supprimer l'évaluation"
                                onClick={() => handleDeleteAssessment(a)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        </th>
                      ))}
                    <th className="text-center font-semibold text-slate-600 text-xs px-2 py-2.5 min-w-[80px]">
                      Moy. matière
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sheet?.students.map((student, index) => {
                    const ccScores = sheet.assessments
                      .filter((a) => a.type === "cc")
                      .map((a) => cellValue(a.id, student.id));
                    const composition =
                      sheet.assessments.find((a) => a.type === "composition") || null;
                    const compScore = composition
                      ? cellValue(composition.id, student.id)
                      : null;

                    const validCc = ccScores.filter(
                      (s): s is number => s !== null
                    );
                    const mid =
                      validCc.length > 0
                        ? validCc.reduce((sum, s) => sum + s, 0) / validCc.length
                        : null;
                    const rowAvg =
                      mid === null && compScore === null
                        ? null
                        : compScore === null
                        ? mid
                        : mid === null
                        ? compScore
                        : (mid + compScore) / 2;

                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-slate-100 ${
                          index % 2 === 1 ? "bg-slate-50/50" : ""
                        }`}
                      >
                        <td className="px-4 py-1.5 text-xs sticky left-0 bg-inherit">
                          <span className="font-medium text-slate-800">
                            {student.last_name} {student.first_name}
                          </span>
                          <span className="text-slate-400 ml-2 font-mono text-[10px]">
                            {student.matricule}
                          </span>
                        </td>
                        {sheet.assessments.map((a) => {
                          const value = cellValue(a.id, student.id);
                          return (
                            <td key={a.id} className="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                min={0}
                                max={a.max_score}
                                step={0.25}
                                inputMode="decimal"
                                aria-label={`Note de ${student.last_name} ${student.first_name} — ${a.title}`}
                                value={value ?? ""}
                                disabled={isLocked}
                                onChange={(e) =>
                                  setCellValue(a.id, student.id, e.target.value)
                                }
                                className={`w-20 rounded-lg border px-2 py-1.5 text-center text-xs focus:outline-none focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400 ${
                                  value !== null && value > a.max_score
                                    ? "border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-400"
                                    : "border-slate-200 bg-white text-slate-800 focus:border-[#002B5B] focus:ring-[#002B5B]"
                                }`}
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-center">
                          {rowAvg === null ? (
                            <span className="text-slate-300 text-xs">—</span>
                          ) : (
                            <span
                              className={`text-xs font-bold ${
                                rowAvg >= 10 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {rowAvg.toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= ONGLET RÉSULTATS ================= */}
      {tab === "results" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleLoadResults}
              disabled={isLoadingResults}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60"
            >
              {isLoadingResults ? "Calcul en cours..." : "Calculer les résultats"}
            </button>
          </div>

          {results && (
            <>
              {/* Statistiques de classe */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Moyenne de classe", value: results.stats.classAverage?.toFixed(2) ?? "—" },
                  { label: "Plus forte", value: results.stats.highest?.toFixed(2) ?? "—" },
                  { label: "Plus faible", value: results.stats.lowest?.toFixed(2) ?? "—" },
                  {
                    label: "Taux de réussite",
                    value:
                      results.stats.successRate !== null
                        ? `${results.stats.successRate.toFixed(1)} %`
                        : "—",
                  },
                  { label: "Élèves évalués", value: String(results.stats.evaluatedCount) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {stat.label}
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Tableau des résultats */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left font-semibold text-slate-600 text-xs px-4 py-2.5 w-16">
                          Rang
                        </th>
                        <th className="text-left font-semibold text-slate-600 text-xs px-4 py-2.5">
                          Élève
                        </th>
                        <th className="text-right font-semibold text-slate-600 text-xs px-4 py-2.5">
                          Moyenne générale
                        </th>
                        <th className="text-left font-semibold text-slate-600 text-xs px-4 py-2.5">
                          Mention
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows
                        .slice()
                        .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
                        .map((row) => (
                          <React.Fragment key={row.studentId}>
                            <tr
                              className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                              onClick={() =>
                                setExpandedStudent(
                                  expandedStudent === row.studentId ? null : row.studentId
                                )
                              }
                            >
                              <td className="px-4 py-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-[#002B5B]/10 text-[#002B5B] text-xs font-bold">
                                  {row.rank ?? "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className="font-medium text-slate-800">
                                  {row.lastName} {row.firstName}
                                </span>
                                <span className="text-slate-400 ml-2 font-mono text-[10px]">
                                  {row.matricule}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span
                                  className={`font-bold ${
                                    row.overall !== null && row.overall >= 10
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {row.overall !== null ? row.overall.toFixed(2) : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-500">
                                {row.overall !== null
                                  ? row.overall >= 16
                                    ? "Excellent"
                                    : row.overall >= 14
                                    ? "Très bien"
                                    : row.overall >= 12
                                    ? "Bien"
                                    : row.overall >= 10
                                    ? "Assez bien"
                                    : "Insuffisant"
                                  : "Non évalué"}
                              </td>
                            </tr>
                            {expandedStudent === row.studentId && (
                              <tr className="bg-slate-50/70 border-b border-slate-100">
                                <td colSpan={4} className="px-4 py-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {row.subjects.map((subject) => (
                                      <div
                                        key={subject.subjectId}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                                      >
                                        <p className="text-[11px] font-semibold text-slate-700 truncate">
                                          {subject.subjectName}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                          Moy.{" "}
                                          <span className="font-bold text-slate-800">
                                            {subject.average !== null
                                              ? subject.average.toFixed(2)
                                              : "—"}
                                          </span>{" "}
                                          · Points{" "}
                                          <span className="font-bold text-slate-800">
                                            {subject.points !== null
                                              ? subject.points.toFixed(2)
                                              : "—"}
                                          </span>{" "}
                                          (coeff. {subject.coefficient})
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!results && !isLoadingResults && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
              Sélectionnez une classe et une période puis cliquez sur « Calculer les résultats ».
            </div>
          )}
        </div>
      )}

      {/* Modal création d'évaluation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <form
            method="post"
            onSubmit={handleCreateAssessment}
            className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">Nouvelle évaluation</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedClass?.name} · {selectedAssignment?.subjects?.name} · {selectedPeriod?.name}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="assessment-title" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Titre
              </label>
              <input
                id="assessment-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Devoir maison n°1"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="assessment-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Type
                </label>
                <select
                  id="assessment-type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as "cc" | "composition",
                    }))
                  }
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="cc">Contrôle continu</option>
                  <option value="composition">Composition</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assessment-max" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Barème
                </label>
                <input
                  id="assessment-max"
                  type="number"
                  min={1}
                  step={0.5}
                  required
                  value={form.maxScore}
                  onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="assessment-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date
                </label>
                <input
                  id="assessment-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assessment-teacher" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enseignant
                </label>
                <select
                  id="assessment-teacher"
                  value={form.teacherId}
                  onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="">Non assigné</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.last_name} {t.first_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-xl bg-[#002B5B] hover:bg-[#001f42] px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-60"
              >
                {isCreating ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
