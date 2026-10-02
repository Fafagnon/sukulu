"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  GraduationCap,
  Calendar,
  Phone,
  AlertCircle,
  Eye,
  Archive,
  RefreshCw,
  X,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import {
  createStudentAction,
  archiveStudentAction,
  getNextMatricule,
} from "@/features/students/student-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { type StudentStatus, type Gender } from "@/types/database";

interface StudentParentInfo {
  id: string;
  relationship: string;
  is_primary: boolean;
  parent: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  } | null;
}

interface EnrollmentInfo {
  id: string;
  academic_year_id: string;
  class_id: string;
  status: string;
  is_repeater: boolean;
  classes: {
    id: string;
    name: string;
    level: string;
    cycle: string;
    series: string | null;
  } | null;
}

interface StudentItem {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string;
  birth_place: string | null;
  nationality: string | null;
  address: string | null;
  blood_group: string | null;
  medical_notes: string | null;
  status: StudentStatus;
  enrollments: EnrollmentInfo[];
  student_parents: StudentParentInfo[];
}

interface ClassItem {
  id: string;
  name: string;
  level: string;
  cycle: string;
}

interface AcademicYearItem {
  id: string;
  name: string;
  is_active: boolean;
}

interface StatsData {
  totalActive: number;
  boys: number;
  girls: number;
  repeaters: number;
  enrolledTotal: number;
  cycleCounts: Record<string, number>;
}

export function StudentsClient({
  initialStudents,
  stats,
  classes,
  years,
  activeYearId,
  loadError,
}: {
  initialStudents: StudentItem[];
  stats: StatsData;
  classes: ClassItem[];
  years: AcademicYearItem[];
  activeYearId: string | null;
  loadError?: string;
}) {
  const [students, setStudents] = React.useState<StudentItem[]>(initialStudents);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCycle, setSelectedCycle] = React.useState<string>("all");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("active");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [suggestedMatricule, setSuggestedMatricule] = React.useState("");

  // Helper pour calculer l'âge
  const calculateAge = (birthDateString: string) => {
    try {
      const birth = new Date(birthDateString);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? `${age} ans` : "-";
    } catch {
      return "-";
    }
  };

  // Pré-génération du matricule à l'ouverture du modal
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    const activeYear = years.find((y) => y.id === activeYearId);
    const mat = await getNextMatricule(activeYear?.name);
    setSuggestedMatricule(mat);
  };

  // Filtrage combiné en mémoire pour une réactivité instantanée
  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      // 1. Statut
      if (selectedStatus !== "all" && s.status !== selectedStatus) {
        return false;
      }

      // Inscription pour l'année active
      const activeEnrollment = s.enrollments?.find(
        (e) => e.academic_year_id === activeYearId
      );

      // 2. Cycle
      if (selectedCycle !== "all") {
        if (!activeEnrollment?.classes || activeEnrollment.classes.cycle !== selectedCycle) {
          return false;
        }
      }

      // 3. Classe
      if (selectedClassId !== "all") {
        if (!activeEnrollment || activeEnrollment.class_id !== selectedClassId) {
          return false;
        }
      }

      // 4. Recherche texte
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const reversedName = `${s.last_name} ${s.first_name}`.toLowerCase();
        const mat = s.matricule.toLowerCase();
        return (
          fullName.includes(query) ||
          reversedName.includes(query) ||
          mat.includes(query)
        );
      }

      return true;
    });
  }, [students, selectedStatus, selectedCycle, selectedClassId, searchQuery, activeYearId]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error("Aucun élève à exporter.");
      return;
    }

    const headers = [
      "Matricule",
      "Nom",
      "Prénom",
      "Sexe",
      "Date de naissance",
      "Lieu de naissance",
      "Classe",
      "Cycle",
      "Statut",
      "Responsable",
      "Téléphone Responsable",
    ];

    const rows = filteredStudents.map((s) => {
      const activeEnr = s.enrollments?.find((e) => e.academic_year_id === activeYearId);
      const primaryParent = s.student_parents?.find((p) => p.is_primary)?.parent;
      return [
        `"${s.matricule}"`,
        `"${s.last_name}"`,
        `"${s.first_name}"`,
        `"${s.gender}"`,
        `"${s.birth_date}"`,
        `"${s.birth_place || ""}"`,
        `"${activeEnr?.classes?.name || "Non inscrit"}"`,
        `"${activeEnr?.classes?.cycle || ""}"`,
        `"${s.status}"`,
        `"${primaryParent ? `${primaryParent.first_name} ${primaryParent.last_name}` : ""}"`,
        `"${primaryParent?.phone || ""}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `sukulu_eleves_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${filteredStudents.length} élèves exportés avec succès.`);
  };

  // Soumission de création
  const handleCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const res = await createStudentAction(formData);

      if (res?.error) {
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Élève enregistré et inscrit avec succès !");
      setIsModalOpen(false);
      window.location.reload();
    } catch {
      toast.error("Une erreur inattendue est survenue.");
      setIsSubmitting(false);
    }
  };

  // Archivage rapide
  const handleArchive = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir archiver le dossier de l'élève ${studentName} ? Son historique restera consultable.`
      )
    ) {
      return;
    }

    const res = await archiveStudentAction(studentId, "archived");
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Le dossier de ${studentName} a été archivé.`);
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: "archived" } : s))
      );
    }
  };

  const cycles = ["Maternelle", "Primaire", "Collège", "Lycée"];

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm">{loadError}</p>
        </div>
      )}

      {/* Cartes d'indicateurs synthétiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Effectif Total
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#002B5B]/10 flex items-center justify-center text-[#002B5B]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats.totalActive}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {stats.enrolledTotal} inscrits cette année
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Parité G / F
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="text-xs font-bold">
                {stats.totalActive > 0
                  ? `${Math.round((stats.girls / stats.totalActive) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold text-slate-900">
              {stats.boys} G
            </span>
            <span className="text-sm font-semibold text-slate-400">/</span>
            <span className="text-xl font-bold text-slate-900">
              {stats.girls} F
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden flex">
            <div
              className="bg-[#002B5B] h-full"
              style={{
                width: `${
                  stats.totalActive > 0 ? (stats.boys / stats.totalActive) * 100 : 50
                }%`,
              }}
            />
            <div
              className="bg-[#FF6B00] h-full"
              style={{
                width: `${
                  stats.totalActive > 0 ? (stats.girls / stats.totalActive) * 100 : 50
                }%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Redoublants
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats.repeaters}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {stats.enrolledTotal > 0
              ? `${Math.round((stats.repeaters / stats.enrolledTotal) * 100)}% de l'effectif`
              : "0%"}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cycles Déployés
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs font-medium text-slate-700">
            <span>Mat : {stats.cycleCounts.Maternelle || 0}</span>
            <span>Prim : {stats.cycleCounts.Primaire || 0}</span>
            <span>Coll : {stats.cycleCounts.Collège || 0}</span>
            <span>Lyc : {stats.cycleCounts.Lycée || 0}</span>
          </div>
        </div>
      </div>

      {/* Barre d'outils et de filtrage */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Recherche textuelle instantanée */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, prénom ou matricule..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Boutons d'actions principaux */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/admin/students/import">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4 text-slate-600" />
                <span className="hidden sm:inline">Importer Excel/CSV</span>
                <span className="sm:hidden">Import</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">Exporter CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>

            <Button
              onClick={handleOpenModal}
              size="sm"
              className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Inscrire un élève
            </Button>
          </div>
        </div>

        {/* Filtres par Cycle & Classe & Statut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Onglets Cycles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedCycle("all");
                setSelectedClassId("all");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCycle === "all"
                  ? "bg-[#002B5B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tous les cycles
            </button>
            {cycles.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedCycle(c);
                  setSelectedClassId("all");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCycle === c
                    ? "bg-[#002B5B] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Filtres déroulants : Classe & Statut */}
          <div className="flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
            >
              <option value="all">Toutes les classes</option>
              {classes
                .filter((cls) => selectedCycle === "all" || cls.cycle === selectedCycle)
                .map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.cycle})
                  </option>
                ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
            >
              <option value="active">Élèves Actifs</option>
              <option value="all">Tous les statuts</option>
              <option value="archived">Archivés</option>
              <option value="graduated">Diplômés</option>
              <option value="transferred">Transférés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Élèves */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Aucun élève trouvé"
              description={
                searchQuery || selectedCycle !== "all" || selectedClassId !== "all"
                  ? "Aucun élève ne correspond aux critères de recherche actuels."
                  : "Aucun élève n'a encore été inscrit dans votre établissement."
              }
              action={
                <Button
                  onClick={handleOpenModal}
                  size="sm"
                  className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Inscrire le premier élève
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Élève &amp; Matricule</th>
                  <th className="py-3 px-4">Sexe &amp; Âge</th>
                  <th className="py-3 px-4">Classe &amp; Cycle</th>
                  <th className="py-3 px-4">Responsable Légal</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((st) => {
                  const activeEnr = st.enrollments?.find(
                    (e) => e.academic_year_id === activeYearId
                  );
                  const primaryParent = st.student_parents?.find((p) => p.is_primary);

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Élève & Matricule */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#002B5B]/10 text-[#002B5B] font-bold text-xs flex items-center justify-center shrink-0">
                            {st.first_name[0]}
                            {st.last_name[0]}
                          </div>
                          <div>
                            <Link
                              href={`/admin/students/${st.id}`}
                              className="font-bold text-slate-900 hover:text-[#FF6B00] transition-colors block"
                            >
                              {st.last_name} {st.first_name}
                            </Link>
                            <span className="inline-block text-[11px] font-mono font-medium text-slate-500">
                              {st.matricule}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sexe & Âge */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                              st.gender === "M"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {st.gender}
                          </span>
                          <span className="text-xs text-slate-600">
                            {calculateAge(st.birth_date)}
                          </span>
                        </div>
                      </td>

                      {/* Classe & Cycle */}
                      <td className="py-3.5 px-4">
                        {activeEnr?.classes ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-900 text-xs">
                              {activeEnr.classes.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {activeEnr.classes.cycle}
                              {activeEnr.is_repeater && (
                                <span className="ml-1.5 text-amber-600 font-semibold">
                                  (Redoublant)
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Non inscrit
                          </span>
                        )}
                      </td>

                      {/* Responsable Légal */}
                      <td className="py-3.5 px-4">
                        {primaryParent?.parent ? (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium text-slate-800">
                              {primaryParent.parent.first_name}{" "}
                              {primaryParent.parent.last_name}
                            </span>
                            <a
                              href={`tel:${primaryParent.parent.phone}`}
                              className="text-[11px] text-[#002B5B] hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {primaryParent.parent.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Non renseigné
                          </span>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            st.status === "active"
                              ? "success"
                              : st.status === "archived"
                              ? "default"
                              : "warning"
                          }
                          className="capitalize text-[11px]"
                        >
                          {st.status === "active"
                            ? "Inscrit"
                            : st.status === "archived"
                            ? "Archivé"
                            : st.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/admin/students/${st.id}`}>
                            <button
                              type="button"
                              title="Consulter le dossier"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B5B] hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>

                          {st.status === "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleArchive(
                                  st.id,
                                  `${st.first_name} ${st.last_name}`
                                )
                              }
                              title="Archiver l'élève"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal d'inscription d'un nouvel élève */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Inscrire un nouvel élève
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dossier administratif et rattachement pédagogique pour l&apos;année scolaire active.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-6">
              {/* Section 1 : État Civil */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#002B5B] mb-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#002B5B]" />
                  1. État civil &amp; Identité
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Matricule officiel
                    </label>
                    <input
                      type="text"
                      name="matricule"
                      defaultValue={suggestedMatricule}
                      required
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sexe *
                    </label>
                    <select
                      name="gender"
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    >
                      <option value="M">Masculin (Garçon)</option>
                      <option value="F">Féminin (Fille)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom de famille *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Ex: MENSAH"
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prénom(s) *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="Ex: Koffi Emmanuel"
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date de naissance *
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lieu de naissance
                    </label>
                    <input
                      type="text"
                      name="birthPlace"
                      placeholder="Ex: Lomé"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 : Inscription Pédagogique */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#002B5B] mb-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
                  2. Inscription Pédagogique
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Année Scolaire *
                    </label>
                    <select
                      name="academicYearId"
                      defaultValue={activeYearId || ""}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    >
                      {years.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.is_active ? "(Active)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Classe d&apos;affectation *
                    </label>
                    <select
                      name="classId"
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    >
                      <option value="">Sélectionner une classe...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.cycle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="isRepeater"
                      name="isRepeater"
                      value="true"
                      className="h-4 w-4 rounded border-slate-300 text-[#002B5B] focus:ring-[#002B5B]"
                    />
                    <label
                      htmlFor="isRepeater"
                      className="text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      Élève redoublant dans cette classe pour l&apos;année
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 3 : Responsable Légal / Parent */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#002B5B] mb-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  3. Contact du Responsable Légal / Parent
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lien de parenté
                    </label>
                    <select
                      name="parentRelationship"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    >
                      <option value="Père">Père</option>
                      <option value="Mère">Mère</option>
                      <option value="Tuteur légal">Tuteur légal</option>
                      <option value="Oncle">Oncle</option>
                      <option value="Tante">Tante</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom du parent
                    </label>
                    <input
                      type="text"
                      name="parentLastName"
                      placeholder="Ex: MENSAH"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prénom du parent
                    </label>
                    <input
                      type="text"
                      name="parentFirstName"
                      placeholder="Ex: Jean-Paul"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Téléphone joignable (WhatsApp/SMS)
                    </label>
                    <input
                      type="tel"
                      name="parentPhone"
                      placeholder="Ex: +228 90 12 34 56"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Profession
                    </label>
                    <input
                      type="text"
                      name="parentProfession"
                      placeholder="Ex: Enseignant, Commerçant"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="bg-[#002B5B] hover:bg-[#002047] text-white shadow-xs"
                >
                  Valider l&apos;inscription
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
