"use client";

import * as React from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  GraduationCap,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  createSubjectAction,
  deleteSubjectAction,
  seedStandardSubjectsAction,
  getClassSubjects,
  assignSubjectToClassAction,
  updateClassSubjectCoefficientAction,
  removeClassSubjectAction,
} from "@/features/academic/subjects-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

interface ClassItem {
  id: string;
  name: string;
  cycle: string;
  level: string;
}

interface TeacherItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ClassSubjectItem {
  id: string;
  class_id: string;
  subject_id: string;
  coefficient: number;
  subjects?: SubjectItem;
  profiles?: TeacherItem | null;
}

export function SubjectsClient({
  initialSubjects,
  classes,
  teachers,
  loadError,
}: {
  initialSubjects: SubjectItem[];
  classes: ClassItem[];
  teachers: TeacherItem[];
  loadError?: string;
}) {
  const [activeTab, setActiveTab] = React.useState<"catalogue" | "matrix">("catalogue");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal création matière catalogue
  const [isSubjectModalOpen, setIsSubjectModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // État onglet Matrice
  const [selectedClassId, setSelectedClassId] = React.useState<string>(
    classes[0]?.id || ""
  );
  const [classAssignments, setClassAssignments] = React.useState<ClassSubjectItem[]>([]);
  const [loadedForClass, setLoadedForClass] = React.useState<string>("");
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);

  // Spinner dérivé : true tant que la classe sélectionnée n'a pas encore été chargée
  const isLoadingAssignments = Boolean(selectedClassId) && selectedClassId !== loadedForClass;

  const loadClassAssignments = React.useCallback(async (classId: string) => {
    const res = await getClassSubjects(classId);
    setClassAssignments((res.data as unknown as ClassSubjectItem[]) || []);
    setLoadedForClass(classId);
  }, []);

  // Chargement des affectations quand la classe sélectionnée change
  React.useEffect(() => {
    if (!selectedClassId) return;
    let cancelled = false;
    void (async () => {
      const res = await getClassSubjects(selectedClassId);
      if (cancelled) return;
      setClassAssignments((res.data as unknown as ClassSubjectItem[]) || []);
      setLoadedForClass(selectedClassId);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await createSubjectAction(formData);

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Matière ajoutée au catalogue.");
    setIsSubmitting(false);
    setIsSubjectModalOpen(false);
  };

  const handleSeedStandard = async () => {
    if (
      !confirm(
        "Initialiser les matières du programme officiel (Français, Maths, SVT, PC, Anglais, HG, etc.) ?"
      )
    ) {
      return;
    }

    toast.promise(seedStandardSubjectsAction(), {
      loading: "Génération du programme officiel...",
      success: (data) =>
        `Le catalogue officiel (${data.count} matières) a été configuré avec succès !`,
      error: "Erreur lors de l'initialisation.",
    });
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Supprimer définitivement la matière « ${subjectName} » ?`)) {
      return;
    }

    toast.promise(deleteSubjectAction(subjectId), {
      loading: "Suppression en cours...",
      success: `Matière « ${subjectName} » supprimée.`,
      error: "Impossible de supprimer cette matière.",
    });
  };

  const handleAssignSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("classId", selectedClassId);

    const result = await assignSubjectToClassAction(formData);

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Matière et coefficient affectés à la classe.");
    setIsSubmitting(false);
    setIsAssignModalOpen(false);
    loadClassAssignments(selectedClassId);
  };

  const handleUpdateCoeff = async (assignmentId: string, newCoeffStr: string) => {
    const coeff = parseFloat(newCoeffStr);
    if (isNaN(coeff) || coeff <= 0) {
      toast.error("Veuillez saisir un coefficient valide supérieur à 0.");
      return;
    }

    const res = await updateClassSubjectCoefficientAction(assignmentId, coeff);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Coefficient mis à jour.");
      loadClassAssignments(selectedClassId);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, subjectName: string) => {
    if (!confirm(`Retirer la matière « ${subjectName} » de cette classe ?`)) {
      return;
    }

    const res = await removeClassSubjectAction(assignmentId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Matière retirée de la classe.");
      loadClassAssignments(selectedClassId);
    }
  };

  const filteredSubjects = initialSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const totalCoefficients = classAssignments.reduce(
    (acc, curr) => acc + (Number(curr.coefficient) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Onglets principaux */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("catalogue")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "catalogue"
              ? "border-[#002B5B] text-[#002B5B]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catalogue des Disciplines ({initialSubjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "matrix"
              ? "border-[#002B5B] text-[#002B5B]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matrice des Coefficients par Classe</span>
        </button>
      </div>

      {/* VUE 1 : CATALOGUE DES MATIÈRES */}
      {activeTab === "catalogue" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Recherche matière"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
              />
            </div>

            <div className="flex items-center gap-2">
              {initialSubjects.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedStandard}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#002B5B] text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Programme Officiel Togo/MENFP</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Matière</span>
              </button>
            </div>
          </div>

          {filteredSubjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Aucune matière dans le catalogue"
              description="Initialisez le programme officiel en un clic ou ajoutez votre première discipline scolaire."
              action={
                <button
                  type="button"
                  onClick={handleSeedStandard}
                  className="px-4 py-2 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                  <span>Initialiser le programme officiel (Togo / MENFP)</span>
                </button>
              }
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Intitulé de la Matière</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#002B5B]">
                        {sub.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {sub.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {sub.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer la matière"
                        >
                          <Trash2 className="w-4 h-4 stroke-[1.8]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : MATRICE DES COEFFICIENTS PAR CLASSE */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {classes.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Aucune classe disponible"
              description="Vous devez d'abord créer des classes dans la section « Cycles & Classes » avant d'attribuer des matières."
            />
          ) : (
            <div className="space-y-4">
              {/* Sélecteur de classe & Bandeau d'état */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    Classe sélectionnée :
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#002B5B]"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.cycle} • {cls.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs">
                    <span className="text-slate-500">Total Coefficients : </span>
                    <span className="font-bold text-[#002B5B] text-sm">
                      {totalCoefficients}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Affecter une matière</span>
                  </button>
                </div>
              </div>

              {/* Tableau des matières de la classe */}
              {isLoadingAssignments ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                  Chargement des matières de la classe...
                </div>
              ) : classAssignments.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title={`Aucune matière affectée à ${selectedClass?.name || "cette classe"}`}
                  description="Associez les matières du catalogue à cette classe et réglez les coefficients officiels."
                  action={
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      Affecter la première matière
                    </button>
                  }
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Matière</th>
                        <th className="py-3 px-4">Enseignant Responsable</th>
                        <th className="py-3 px-4 text-center w-36">Coefficient</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classAssignments.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#002B5B]">
                            {item.subjects?.code}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {item.subjects?.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.profiles ? (
                              <span>
                                {item.profiles.first_name} {item.profiles.last_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Non assigné</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              defaultValue={item.coefficient}
                              min="0.5"
                              max="20"
                              step="0.5"
                              onBlur={(e) => handleUpdateCoeff(item.id, e.target.value)}
                              className="w-20 h-8 text-center font-bold text-[#002B5B] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#002B5B]"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAssignment(item.id, item.subjects?.name || "Matière")
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Retirer de la classe"
                            >
                              <Trash2 className="w-4 h-4 stroke-[1.8]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Création d'une matière dans le catalogue */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Ajouter une matière au catalogue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Créez une discipline réutilisable dans toutes vos classes.
              </p>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Intitulé de la matière
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Code unique / Sigle
                </label>
                <input
                  name="code"
                  type="text"
                  required
                  maxLength={10}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold uppercase text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description (optionnel)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-xs font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? "Création..." : "Enregistrer la matière"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Affectation d'une matière à une classe */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Affecter à {selectedClass?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choisissez la matière et fixez son coefficient pour cette division.
              </p>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Matière
                </label>
                <select
                  name="subjectId"
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  {initialSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Coefficient officiel
                </label>
                <input
                  name="coefficient"
                  type="number"
                  defaultValue="2"
                  min="0.5"
                  max="20"
                  step="0.5"
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enseignant titulaire (optionnel)
                </label>
                <select
                  name="teacherId"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="">Non assigné pour l&apos;instant</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-xs font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? "Affectation..." : "Affecter la matière"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
