"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Mail,
  Phone,
  AlertCircle,
  X,
  Briefcase,
} from "lucide-react";
import {
  createTeacherAction,
  type TeacherProfile,
} from "@/features/teachers/teacher-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/ui/phone-input";
import { MultiSelectSpecialties } from "@/components/ui/multi-select-specialties";

export function TeachersClient({
  initialTeachers,
  loadError,
  schoolCountry = "Togo",
}: {
  initialTeachers: TeacherProfile[];
  loadError?: string;
  schoolCountry?: string;
}) {
  const router = useRouter();
  const [teachers, setTeachers] = React.useState<TeacherProfile[]>(initialTeachers);
  const [prevInitialTeachers, setPrevInitialTeachers] = React.useState(initialTeachers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Resynchronisation pendant le rendu (pattern React "adjusting state when props change")
  if (prevInitialTeachers !== initialTeachers) {
    setPrevInitialTeachers(initialTeachers);
    setTeachers(initialTeachers);
  }

  const filteredTeachers = React.useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter((t) => {
      const name = `${t.first_name} ${t.last_name}`.toLowerCase();
      const spec = t.teacher_profiles?.specialty?.toLowerCase() || "";
      const email = t.email.toLowerCase();
      return name.includes(q) || spec.includes(q) || email.includes(q);
    });
  }, [teachers, searchQuery]);

  const handleCreateTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await createTeacherAction(formData);

      if (res?.error) {
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Enseignant ajouté avec succès !");

      // Communiquer les accès provisoires à la direction (jamais stockés côté client)
      const inviteLink = (res as { inviteLink?: string | null })?.inviteLink;
      const tempPassword = (res as { tempPassword?: string | null })?.tempPassword;
      if (inviteLink) {
        toast.info("Lien d'invitation généré — transmettez-le à l'enseignant : " + inviteLink, {
          duration: 20000,
          description: "Ce lien permet à l'enseignant de choisir son propre mot de passe.",
        });
      } else if (tempPassword) {
        toast.info("Mot de passe provisoire : " + tempPassword, {
          duration: 20000,
          description: "Communiquez-le à l'enseignant : il devra le changer à la première connexion.",
        });
      }
      setIsModalOpen(false);
      setIsSubmitting(false);
      router.refresh();
    } catch {
      toast.error("Erreur inattendue.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm">{loadError}</p>
        </div>
      )}

      {/* Cartes d'indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Enseignants
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{teachers.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">
            Membres du corps professoral
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Enseignants Actifs
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {teachers.filter((t) => t.is_active).length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">En poste actuellement</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Affectations actives
          </span>
          <p className="text-2xl font-bold text-[#002B5B] mt-2">
            {teachers.reduce((acc, t) => acc + (t.assignments?.length || 0), 0)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Cours attribués dans les classes
          </span>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Recherche enseignants"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
          />
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2 shadow-xs shrink-0 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Ajouter un enseignant
        </Button>
      </div>

      {/* Grille des enseignants */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8">
          <EmptyState
            title="Aucun enseignant trouvé"
            description="Enregistrez les professeurs de votre établissement pour leur affecter des matières et des classes."
            action={
              <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un enseignant
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-[#002B5B]/30 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#002B5B]/10 text-[#002B5B] font-bold text-sm flex items-center justify-center shrink-0">
                      {teacher.first_name[0]}
                      {teacher.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {teacher.last_name} {teacher.first_name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        {teacher.teacher_profiles?.matricule || "Enseignant"}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={teacher.is_active ? "success" : "default"}
                    className="text-[10px]"
                  >
                    {teacher.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {teacher.teacher_profiles?.specialty || "Spécialité générale"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{teacher.email}</span>
                  </div>

                  {teacher.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Affectations */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Classes &amp; Matières ({teacher.assignments?.length || 0})
                </span>
                {teacher.assignments && teacher.assignments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.assignments.slice(0, 4).map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        <strong>{a.classes?.name}</strong> : {a.subjects?.code}
                      </span>
                    ))}
                    {teacher.assignments.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        +{teacher.assignments.length - 4} de plus
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Aucun cours affecté pour le moment
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajout Enseignant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">
                Ajouter un nouvel enseignant
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002B5B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse Email (Identifiant de connexion) *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Téléphone (WhatsApp/SMS)
                </label>
                <PhoneInput
                  name="phone"
                  defaultCountry={schoolCountry}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discipline(s) / Spécialité(s)
                </label>
                <MultiSelectSpecialties name="specialty" />
              </div>

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
                  className="bg-[#002B5B] hover:bg-[#002047] text-white"
                >
                  Enregistrer l&apos;enseignant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
