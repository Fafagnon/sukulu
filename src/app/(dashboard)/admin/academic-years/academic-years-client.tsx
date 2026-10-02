"use client";

import * as React from "react";
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  FileCheck,
  ChevronDown,
} from "lucide-react";
import {
  createAcademicYearAction,
  setActiveAcademicYearAction,
  updatePeriodStatusAction,
} from "@/features/academic/actions";
import { type PeriodStatus } from "@/types/database";
import { toast } from "sonner";

interface PeriodItem {
  id: string;
  name: string;
  type: string;
  order_index: number;
  status: PeriodStatus;
  start_date: string;
  end_date: string;
}

interface AcademicYearItem {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  periods?: PeriodItem[];
}

export function AcademicYearsClient({
  initialYears,
  loadError,
}: {
  initialYears: AcademicYearItem[];
  loadError?: string;
}) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSetActive = async (yearId: string, yearName: string) => {
    toast.promise(setActiveAcademicYearAction(yearId), {
      loading: `Bascule vers l'année ${yearName}...`,
      success: `L'année ${yearName} est maintenant l'année active de l'établissement.`,
      error: "Impossible de définir cette année comme active.",
    });
  };

  const handleUpdatePeriodStatus = async (
    periodId: string,
    periodName: string,
    newStatus: PeriodStatus
  ) => {
    const statusLabels: Record<PeriodStatus, string> = {
      open: "ouverte aux saisies",
      review: "en relecture",
      locked: "verrouillée définitivement",
    };

    toast.promise(updatePeriodStatusAction(periodId, newStatus), {
      loading: "Mise à jour du statut de la période...",
      success: `La période « ${periodName} » est désormais ${statusLabels[newStatus]}.`,
      error: "Erreur lors du changement de statut.",
    });
  };

  const handleCreateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await createAcademicYearAction(formData);

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Nouvelle année scolaire initialisée avec succès !");
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Barre d'action supérieure */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{initialYears.length}</span> année(s) scolaire(s) répertoriée(s)
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Année Scolaire</span>
        </button>
      </div>

      {/* Liste des Années scolaires */}
      <div className="grid grid-cols-1 gap-5">
        {initialYears.map((year) => {
          const periods = year.periods || [];
          return (
            <div
              key={year.id}
              className={`rounded-2xl border bg-white p-5 sm:p-6 transition-all shadow-xs ${
                year.is_active
                  ? "border-emerald-300 ring-1 ring-emerald-300/40"
                  : "border-slate-200"
              }`}
            >
              {/* En-tête de la carte de l'année */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      year.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Calendar className="w-5 h-5 stroke-[1.8]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        Année Scolaire {year.name}
                      </h2>
                      {year.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Année active
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Non active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Période du {year.start_date} au {year.end_date}
                    </p>
                  </div>
                </div>

                {!year.is_active && (
                  <button
                    type="button"
                    onClick={() => handleSetActive(year.id, year.name)}
                    className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Définir comme active
                  </button>
                )}
              </div>

              {/* Découpage des Périodes (Trimestres / Semestres) */}
              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Périodes d&apos;évaluation ({periods.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {periods.map((period) => {
                    const statusConfig = {
                      open: {
                        label: "Saisies ouvertes",
                        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        icon: Unlock,
                      },
                      review: {
                        label: "En relecture",
                        badge: "bg-amber-50 text-amber-700 border-amber-200",
                        icon: FileCheck,
                      },
                      locked: {
                        label: "Verrouillé",
                        badge: "bg-slate-100 text-slate-600 border-slate-200",
                        icon: Lock,
                      },
                    }[period.status];

                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={period.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              {period.name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusConfig.badge}`}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Du {period.start_date} au {period.end_date}
                          </p>
                        </div>

                        {/* Actions de changement de statut */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-medium text-slate-400">Modifier statut :</span>
                          <div className="flex items-center gap-1">
                            {period.status !== "open" && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePeriodStatus(period.id, period.name, "open")}
                                title="Rouvrir les saisies de notes"
                                className="px-2 py-1 rounded-md text-[10px] font-medium bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200"
                              >
                                Ouvrir
                              </button>
                            )}
                            {period.status !== "review" && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePeriodStatus(period.id, period.name, "review")}
                                title="Passer en relecture par la direction"
                                className="px-2 py-1 rounded-md text-[10px] font-medium bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200"
                              >
                                Relecture
                              </button>
                            )}
                            {period.status !== "locked" && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePeriodStatus(period.id, period.name, "locked")}
                                title="Verrouiller définitivement"
                                className="px-2 py-1 rounded-md text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200"
                              >
                                Verrouiller
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de création d'une nouvelle année scolaire */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Initialiser une Année Scolaire
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez les dates de l&apos;année scolaire et configurez ses périodes.
              </p>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nom de l&apos;année
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="ex: 2027-2028"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Date de rentrée
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Date de fin
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Type de périodes
                </label>
                <select
                  name="periodType"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="trimestre">Système Trimestriel (3 trimestres)</option>
                  <option value="semestre">Système Semestriel (2 semestres)</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    name="setAsActive"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-[#002B5B] focus:ring-[#002B5B]"
                  />
                  <span>Définir immédiatement comme l&apos;année scolaire active</span>
                </label>
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
                  {isSubmitting ? "Initialisation..." : "Créer l'année"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
