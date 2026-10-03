"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  GraduationCap,
  User,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  createTimetableSlotAction,
  deleteTimetableSlotAction,
} from "@/features/academic/timetable-actions";
import { toast } from "sonner";

export interface TimetableSlotItem {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  classes?: { id: string; name: string; cycle: string };
  subjects?: { id: string; name: string; code: string };
  profiles?: { id: string; first_name: string; last_name: string; email: string } | null;
}

interface ClassItem {
  id: string;
  name: string;
  cycle: string;
  level: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface TeacherItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const DAYS = [
  { id: 1, name: "Lundi" },
  { id: 2, name: "Mardi" },
  { id: 3, name: "Mercredi" },
  { id: 4, name: "Jeudi" },
  { id: 5, name: "Vendredi" },
  { id: 6, name: "Samedi" },
];

export function TimetableClient({
  classes,
  subjects,
  teachers,
  initialSlots,
  activeYear,
  loadError,
}: {
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  initialSlots: TimetableSlotItem[];
  activeYear: { id: string; name: string } | null;
  loadError?: string;
}) {
  const [viewMode, setViewMode] = React.useState<"class" | "teacher">("class");
  const [selectedClassId, setSelectedClassId] = React.useState<string>(classes[0]?.id || "");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>(teachers[0]?.id || "");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filtrer les créneaux selon la vue sélectionnée
  const currentSlots = initialSlots.filter((slot) => {
    if (viewMode === "class") {
      return slot.class_id === selectedClassId;
    } else {
      return slot.teacher_id === selectedTeacherId;
    }
  });

  const handleCreateSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeYear?.id) {
      toast.error("Veuillez d'abord activer une année scolaire.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("academicYearId", activeYear.id);

    const result = await createTimetableSlotAction(formData);

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Créneau programmé sans conflit !");
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  const handleDeleteSlot = async (slotId: string, subjectName: string) => {
    if (!confirm(`Supprimer ce cours de « ${subjectName} » de l'emploi du temps ?`)) {
      return;
    }

    toast.promise(deleteTimetableSlotAction(slotId), {
      loading: "Suppression du créneau...",
      success: "Créneau supprimé.",
      error: "Erreur lors de la suppression.",
    });
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Barre de contrôle supérieure */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Commutateur de vue : Par classe ou Par enseignant */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("class")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === "class"
                  ? "bg-white text-[#002B5B] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Par Classe</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("teacher")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === "teacher"
                  ? "bg-white text-[#002B5B] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Par Enseignant</span>
            </button>
          </div>

          {/* Sélecteur contextuel */}
          {viewMode === "class" ? (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#002B5B]"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Classe : {cls.name} ({cls.cycle})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#002B5B]"
            >
              {teachers.length === 0 ? (
                <option value="">Aucun enseignant répertorié</option>
              ) : (
                teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    Professeur : {t.first_name} {t.last_name}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        {/* Bouton d'ajout */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={!activeYear || classes.length === 0 || subjects.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002B5B] hover:bg-[#001f42] text-white text-xs font-semibold shadow-xs transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Programmer un cours</span>
        </button>
      </div>

      {/* Grille Hebdomadaire des Emplois du Temps (Lundi au Samedi) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {DAYS.map((day) => {
          const daySlots = currentSlots
            .filter((s) => s.day_of_week === day.id)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div
              key={day.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 flex flex-col min-h-[380px] shadow-xs"
            >
              {/* En-tête du jour */}
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{day.name}</span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {daySlots.length} cours
                </span>
              </div>

              {/* Liste des créneaux du jour */}
              <div className="pt-3 space-y-2.5 flex-1">
                {daySlots.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <span className="text-[11px] text-slate-400 italic">
                      Aucun cours
                    </span>
                  </div>
                ) : (
                  daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2 relative group hover:border-[#002B5B]/30 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-bold text-[#002B5B] font-mono">
                          {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteSlot(slot.id, slot.subjects?.name || "ce cours")
                          }
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-0.5"
                          title="Supprimer ce créneau"
                        >
                          <Trash2 className="w-3 h-3 stroke-[1.8]" />
                        </button>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {slot.subjects?.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {slot.subjects?.code}
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/50 flex flex-col gap-0.5 text-[10px] text-slate-600">
                        {viewMode === "class" && (
                          <div className="flex items-center gap-1 truncate">
                            <User className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {slot.profiles
                                ? `${slot.profiles.first_name} ${slot.profiles.last_name}`
                                : "Non assigné"}
                            </span>
                          </div>
                        )}

                        {viewMode === "teacher" && (
                          <div className="flex items-center gap-1 truncate font-semibold text-slate-800">
                            <GraduationCap className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                            <span className="truncate">{slot.classes?.name}</span>
                          </div>
                        )}

                        {slot.room && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                            <span>{slot.room}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Programmer un créneau (style inspiré de creation emploi temps prof.png) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Planifier un créneau horaire
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Le moteur vérifiera automatiquement l&apos;absence de collision pour l&apos;enseignant, la classe et la salle.
              </p>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Classe
                  </label>
                  <select
                    name="classId"
                    defaultValue={selectedClassId}
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Matière
                  </label>
                  <select
                    name="subjectId"
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enseignant responsable
                </label>
                <select
                  name="teacherId"
                  defaultValue={viewMode === "teacher" ? selectedTeacherId : ""}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="">Sélectionner un enseignant (optionnel)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Jour
                  </label>
                  <select
                    name="dayOfWeek"
                    defaultValue="1"
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  >
                    {DAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Début
                  </label>
                  <input
                    name="startTime"
                    type="time"
                    defaultValue="08:00"
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Fin
                  </label>
                  <input
                    name="endTime"
                    type="time"
                    defaultValue="10:00"
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Salle de cours (optionnel)
                </label>
                <input
                  name="room"
                  type="text"
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
                  {isSubmitting ? "Vérification..." : "Ajouter le créneau"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
