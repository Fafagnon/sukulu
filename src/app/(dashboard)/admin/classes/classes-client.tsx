"use client";

import * as React from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Search,
  Users,
  AlertCircle,
  Building2,
  Sparkles,
} from "lucide-react";
import { createClassAction, deleteClassAction } from "@/features/academic/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface ClassItem {
  id: string;
  name: string;
  cycle: string;
  level: string;
  series: string | null;
  capacity: number | null;
}

interface AcademicYearItem {
  id: string;
  name: string;
  is_active: boolean;
}

export function ClassesClient({
  initialClasses,
  activeYearId,
  years,
  loadError,
}: {
  initialClasses: ClassItem[];
  activeYearId: string | null;
  years: AcademicYearItem[];
  loadError?: string;
}) {
  const [selectedCycle, setSelectedCycle] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states pour la création
  const [formCycle, setFormCycle] = React.useState("Collège");
  const [formLevel, setFormLevel] = React.useState("6ème");
  const [formDivision, setFormDivision] = React.useState("A");
  const [formSeries, setFormSeries] = React.useState("");
  const [formCapacity, setFormCapacity] = React.useState("45");

  // Niveaux par cycle
  const levelsByCycle: Record<string, string[]> = {
    Maternelle: ["Petite Section", "Moyenne Section", "Grande Section"],
    Primaire: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
    Collège: ["6ème", "5ème", "4ème", "3ème"],
    Lycée: ["Seconde", "Première", "Terminale"],
    Supérieur: ["BTS 1", "BTS 2", "Licence 1", "Licence 2", "Licence 3"],
  };

  const seriesByCycle: Record<string, string[]> = {
    Lycée: ["Générale", "A4 (Littéraire)", "C4 (Scientifique)", "D (Sciences & Biologie)", "G2 (Gestion)"],
  };

  const handleCycleChange = (cycle: string) => {
    setFormCycle(cycle);
    const availableLevels = levelsByCycle[cycle] || [];
    setFormLevel(availableLevels[0] || "");
    if (cycle !== "Lycée") {
      setFormSeries("");
    } else {
      setFormSeries(seriesByCycle.Lycée[0]);
    }
  };

  // Filtrage des classes
  const filteredClasses = initialClasses.filter((c) => {
    const matchesCycle = selectedCycle === "all" || c.cycle.toLowerCase() === selectedCycle.toLowerCase();
    const matchesQuery =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.level.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.series && c.series.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCycle && matchesQuery;
  });

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeYearId) {
      toast.error("Veuillez d'abord activer une année scolaire dans les paramètres.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("academicYearId", activeYearId);

    // Calcul automatique du nom si désiré, ex: "6ème A" ou "Terminale D 1"
    const seriesSuffix = formCycle === "Lycée" && formSeries && !formSeries.includes("Générale")
      ? ` ${formSeries.split(" ")[0]}`
      : "";
    const computedName = `${formLevel}${seriesSuffix} ${formDivision}`.trim();
    formData.set("name", computedName);
    formData.set("cycle", formCycle);
    formData.set("level", formLevel);
    formData.set("series", formCycle === "Lycée" ? formSeries : "");
    formData.set("capacity", formCapacity);

    const result = await createClassAction(formData);

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success(`La classe ${computedName} a été créée avec succès.`);
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Confirmez-vous la suppression de la classe « ${className} » ?`)) {
      return;
    }

    toast.promise(deleteClassAction(classId), {
      loading: "Suppression de la classe...",
      success: `La classe « ${className} » a été supprimée.`,
      error: "Impossible de supprimer cette classe.",
    });
  };

  const totalCapacity = initialClasses.reduce((acc, curr) => acc + (curr.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {!activeYearId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Aucune année scolaire active sélectionnée</p>
            <p className="mt-0.5">
              Rendez-vous dans la rubrique « Années &amp; Périodes » pour activer l&apos;année scolaire courante (ex: 2026-2027) avant de configurer vos classes.
            </p>
          </div>
        </div>
      )}

      {/* Cartes d'indicateurs rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Classes Actives
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {initialClasses.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#002B5B]/5 text-[#002B5B] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 stroke-[1.8]" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Capacité Totale
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {totalCapacity} <span className="text-xs font-normal text-slate-400">places</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-5 h-5 stroke-[1.8]" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cycles Déployés
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {new Set(initialClasses.map((c) => c.cycle)).size}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
            <Building2 className="w-5 h-5 stroke-[1.8]" />
          </div>
        </div>
      </div>

      {/* Barre d'outils : Filtres & Bouton d'ajout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Onglets de cycles */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Toutes les classes" },
            { id: "Collège", label: "Collège" },
            { id: "Lycée", label: "Lycée" },
            { id: "Primaire", label: "Primaire" },
            { id: "Maternelle", label: "Maternelle" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCycle(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedCycle === tab.id
                  ? "bg-[#002B5B] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Recherche */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une classe..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!activeYearId}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une classe</span>
          </button>
        </div>
      </div>

      {/* Tableau des classes */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune classe répertoriée"
          description={
            initialClasses.length === 0
              ? "Commencez par ajouter la première classe de votre établissement (ex: 6ème A, 3ème B ou Terminale D)."
              : "Aucune classe ne correspond à vos filtres actuels."
          }
          action={
            activeYearId ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Créer une classe
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Classe</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4">Niveau</th>
                  <th className="py-3 px-4">Série</th>
                  <th className="py-3 px-4 text-center">Capacité</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cls.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {cls.cycle}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {cls.level}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {cls.series || "—"}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {cls.capacity ? `${cls.capacity} élèves` : "Non définie"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Supprimer la classe"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.8]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'ajout d'une classe */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Ajouter une nouvelle classe
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sélectionnez le cycle et le niveau pour paramétrer la classe.
              </p>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Cycle
                </label>
                <select
                  value={formCycle}
                  onChange={(e) => handleCycleChange(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="Maternelle">Maternelle</option>
                  <option value="Primaire">Primaire</option>
                  <option value="Collège">Collège</option>
                  <option value="Lycée">Lycée (Second cycle)</option>
                  <option value="Supérieur">Supérieur / Professionnel</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Niveau
                  </label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  >
                    {(levelsByCycle[formCycle] || []).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Division / Lettre
                  </label>
                  <input
                    type="text"
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value.toUpperCase())}
                    placeholder="ex: A, B, 1"
                    maxLength={5}
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold uppercase text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>
              </div>

              {formCycle === "Lycée" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Série
                  </label>
                  <select
                    value={formSeries}
                    onChange={(e) => setFormSeries(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  >
                    {seriesByCycle.Lycée.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Capacité maximale d&apos;élèves
                </label>
                <input
                  type="number"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  min={1}
                  max={150}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {isSubmitting ? "Création..." : "Enregistrer la classe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
