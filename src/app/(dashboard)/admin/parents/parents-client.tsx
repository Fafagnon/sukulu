"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Phone,
  Mail,
  AlertCircle,
  X,
} from "lucide-react";
import { createParentAction } from "@/features/parents/parent-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface StudentLink {
  id: string;
  relationship: string;
  is_primary: boolean;
  can_pickup: boolean;
  student: {
    id: string;
    matricule: string;
    first_name: string;
    last_name: string;
    gender: string;
    status: string;
    enrollments: Array<{
      id: string;
      academic_year_id: string;
      classes: {
        id: string;
        name: string;
        level: string;
      } | null;
    }>;
  } | null;
}

interface ParentItem {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_secondary: string | null;
  email: string | null;
  profession: string | null;
  address: string | null;
  student_parents: StudentLink[];
}

import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/ui/phone-input";

export function ParentsClient({
  initialParents,
  loadError,
  schoolCountry = "Togo",
}: {
  initialParents: ParentItem[];
  loadError?: string;
  schoolCountry?: string;
}) {
  const router = useRouter();
  const [parents, setParents] = React.useState<ParentItem[]>(initialParents);
  const [prevInitialParents, setPrevInitialParents] = React.useState(initialParents);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Resynchronisation pendant le rendu (pattern React "adjusting state when props change")
  // au lieu d'un setState synchrone dans un useEffect.
  if (prevInitialParents !== initialParents) {
    setPrevInitialParents(initialParents);
    setParents(initialParents);
  }

  const filteredParents = React.useMemo(() => {
    if (!searchQuery.trim()) return parents;
    const q = searchQuery.toLowerCase().trim();
    return parents.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      const phone = p.phone.toLowerCase();
      const email = p.email?.toLowerCase() || "";
      const childMatch = p.student_parents.some((sp) => {
        if (!sp.student) return false;
        const childName = `${sp.student.first_name} ${sp.student.last_name}`.toLowerCase();
        return childName.includes(q) || sp.student.matricule.toLowerCase().includes(q);
      });
      return name.includes(q) || phone.includes(q) || email.includes(q) || childMatch;
    });
  }, [parents, searchQuery]);

  const handleCreateParent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await createParentAction(formData);

      if (res?.error) {
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Responsable légal ajouté avec succès !");
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
            Total Responsables
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{parents.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">
            Parents et tuteurs répertoriés
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Enfants Rattachés
          </span>
          <p className="text-2xl font-bold text-[#002B5B] mt-2">
            {parents.reduce((acc, p) => acc + (p.student_parents?.length || 0), 0)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Relations parent-enfant actives
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Familles Multi-enfants
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {parents.filter((p) => (p.student_parents?.length || 0) > 1).length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Parents avec au moins 2 enfants
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
            aria-label="Recherche parents"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
          />
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2 shadow-xs shrink-0 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nouveau responsable
        </Button>
      </div>

      {/* Liste des parents */}
      {filteredParents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8">
          <EmptyState
            title="Aucun parent répertorié"
            description="Les fiches de responsables légaux sont créées automatiquement lors de l'inscription des élèves ou manuellement."
            action={
              <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouveau responsable
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParents.map((parent) => (
            <div
              key={parent.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-[#002B5B]/30 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {parent.first_name[0]}
                    {parent.last_name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {parent.last_name} {parent.first_name}
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {parent.profession || "Responsable légal"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${parent.phone}`}
                      className="font-medium text-[#002B5B] hover:underline"
                    >
                      {parent.phone}
                    </a>
                  </div>

                  {parent.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{parent.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enfants rattachés */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Enfant(s) scolarisé(s) ({parent.student_parents?.length || 0})
                </span>
                {parent.student_parents && parent.student_parents.length > 0 ? (
                  <div className="space-y-1.5">
                    {parent.student_parents.map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100"
                      >
                        <div>
                          {sp.student ? (
                            <Link
                              href={`/admin/students/${sp.student.id}`}
                              className="font-semibold text-slate-900 hover:text-[#FF6B00] block"
                            >
                              {sp.student.last_name} {sp.student.first_name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              Élève
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {sp.relationship}
                          </span>
                        </div>

                        {sp.student?.enrollments?.[0]?.classes?.name && (
                          <Badge variant="outline" className="text-[10px]">
                            {sp.student.enrollments[0].classes.name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Aucun élève actuellement lié
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nouveau Parent */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">
                Nouveau responsable légal
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParent} className="p-6 space-y-4">
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
                  Téléphone principal (WhatsApp/SMS) *
                </label>
                <PhoneInput
                  name="phone"
                  required
                  defaultCountry={schoolCountry}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone secondaire
                  </label>
                  <PhoneInput
                    name="phoneSecondary"
                    defaultCountry={schoolCountry}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    name="profession"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse / Domicile
                </label>
                <input
                  type="text"
                  name="address"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002B5B]"
                />
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
                  Enregistrer le responsable
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
