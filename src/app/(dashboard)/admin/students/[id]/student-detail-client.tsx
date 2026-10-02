"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertCircle,
  Clock,
  Printer,
  Edit,
  Archive,
  RefreshCw,
  Plus,
  CheckCircle2,
  X,
  QrCode,
  Shield,
  FileText,
} from "lucide-react";
import {
  updateStudentAction,
  enrollStudentAction,
  archiveStudentAction,
} from "@/features/students/student-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { type StudentStatus, type Gender } from "@/types/database";

interface ParentDetail {
  id: string;
  relationship: string;
  is_primary: boolean;
  can_pickup: boolean;
  parent: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    phone_secondary: string | null;
    email: string | null;
    profession: string | null;
    address: string | null;
  } | null;
}

interface EnrollmentDetail {
  id: string;
  academic_year_id: string;
  class_id: string;
  enrollment_date: string;
  status: string;
  is_repeater: boolean;
  notes: string | null;
  academic_years: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  classes: {
    id: string;
    name: string;
    level: string;
    cycle: string;
    series: string | null;
  } | null;
}

interface StudentDetail {
  id: string;
  school_id: string;
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
  created_at: string;
  enrollments: EnrollmentDetail[];
  student_parents: ParentDetail[];
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

export function StudentDetailClient({
  student,
  classes,
  years,
}: {
  student: StudentDetail;
  classes: ClassItem[];
  years: AcademicYearItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"dossier" | "parcours" | "parents" | "carte">("dossier");

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Inscription active (année scolaire active)
  const activeYear = years.find((y) => y.is_active);
  const currentEnrollment = student.enrollments.find(
    (e) => e.academic_year_id === activeYear?.id
  ) || student.enrollments[0];

  const primaryParent = student.student_parents.find((p) => p.is_primary)?.parent;

  // Calcul âge
  const calculateAge = (dateStr: string) => {
    try {
      const birth = new Date(dateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age > 0 ? `${age} ans` : "-";
    } catch {
      return "-";
    }
  };

  // Mise à jour de l'élève
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await updateStudentAction(student.id, formData);

      if (res?.error) {
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Informations de l'élève mises à jour avec succès.");
      setIsEditModalOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur inattendue.");
      setIsSubmitting(false);
    }
  };

  // Réinscription
  const handleEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const classId = formData.get("classId") as string;
      const academicYearId = formData.get("academicYearId") as string;
      const isRepeater = formData.get("isRepeater") === "true";
      const notes = formData.get("notes") as string;

      if (!classId || !academicYearId) {
        toast.error("Veuillez choisir une classe et une année scolaire.");
        setIsSubmitting(false);
        return;
      }

      const res = await enrollStudentAction(
        student.id,
        classId,
        academicYearId,
        isRepeater,
        notes
      );

      if (res?.error) {
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Inscription enregistrée avec succès !");
      setIsEnrollModalOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur inattendue.");
      setIsSubmitting(false);
    }
  };

  // Impression de la carte scolaire
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Navigation retour */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#002B5B] hover:text-[#FF6B00] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;annuaire des élèves
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimer Carte / Fiche</span>
            <span className="sm:hidden">Imprimer</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsEnrollModalOpen(true)}
            className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2 shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Inscrire / Réinscrire</span>
            <span className="sm:hidden">Inscrire</span>
          </Button>
        </div>
      </div>

      {/* En-tête profil élève */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[#002B5B] text-white font-bold text-xl flex items-center justify-center shadow-md">
            {student.first_name[0]}
            {student.last_name[0]}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {student.last_name} {student.first_name}
              </h1>
              <Badge
                variant={student.status === "active" ? "success" : "warning"}
                className="capitalize text-xs font-semibold"
              >
                {student.status === "active" ? "Inscrit actif" : student.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span className="font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {student.matricule}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-800">
                {currentEnrollment?.classes?.name || "Non affecté"}
              </span>
              <span>•</span>
              <span>{student.gender === "M" ? "Garçon" : "Fille"}</span>
              <span>•</span>
              <span>{calculateAge(student.birth_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier le dossier
          </Button>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("dossier")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "dossier"
              ? "text-[#002B5B] border-b-2 border-[#002B5B]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Dossier &amp; État Civil
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("parcours")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "parcours"
              ? "text-[#002B5B] border-b-2 border-[#002B5B]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Parcours Scolaire ({student.enrollments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("parents")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "parents"
              ? "text-[#002B5B] border-b-2 border-[#002B5B]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Responsables Légaux ({student.student_parents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("carte")}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === "carte"
              ? "text-[#002B5B] border-b-2 border-[#002B5B]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Carte Scolaire Officielle
        </button>
      </div>

      {/* CONTENU ONGLET 1 : DOSSIER & ÉTAT CIVIL */}
      {activeTab === "dossier" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identité */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-[#002B5B]" />
              État Civil &amp; Informations Personnelles
            </h3>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Nom officiel :</span>
                <span className="font-semibold text-slate-900">{student.last_name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Prénoms :</span>
                <span className="font-semibold text-slate-900">{student.first_name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Sexe :</span>
                <span className="font-semibold text-slate-900">
                  {student.gender === "M" ? "Masculin (Garçon)" : "Féminin (Fille)"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Date de naissance :</span>
                <span className="font-semibold text-slate-900">
                  {new Date(student.birth_date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  ({calculateAge(student.birth_date)})
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Lieu de naissance :</span>
                <span className="font-semibold text-slate-900">
                  {student.birth_place || "Non spécifié"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Nationalité :</span>
                <span className="font-semibold text-slate-900">
                  {student.nationality || "Togolaise"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Adresse / Domicile :</span>
                <span className="font-semibold text-slate-900">
                  {student.address || "Non spécifiée"}
                </span>
              </div>
            </div>
          </div>

          {/* Santé & Urgence */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-600" />
              Santé &amp; Contact d&apos;Urgence
            </h3>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Groupe Sanguin :</span>
                <span className="font-bold text-[#002B5B]">
                  {student.blood_group || "Non renseigné"}
                </span>
              </div>
              <div className="py-2.5 flex flex-col gap-1">
                <span className="text-slate-500">Observations médicales / Allergies :</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                  {student.medical_notes || "Aucune contre-indication ou allergie signalée."}
                </p>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Contact d&apos;urgence principal :</span>
                <span className="font-semibold text-slate-900">
                  {primaryParent ? `${primaryParent.first_name} ${primaryParent.last_name}` : "Non renseigné"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Téléphone d&apos;urgence :</span>
                <span className="font-semibold text-[#002B5B]">
                  {primaryParent?.phone || "Non renseigné"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : PARCOURS SCOLAIRE & HISTORIQUE DES INSCRIPTIONS */}
      {activeTab === "parcours" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Historique des inscriptions annuelles
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque année scolaire est conservée pour garantir la traçabilité complète du dossier de l&apos;élève.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
              className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Nouvelle inscription
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Année Scolaire</th>
                  <th className="py-3 px-4">Classe affectée</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4">Statut inscription</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {student.enrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {enr.academic_years?.name}
                      {enr.academic_years?.is_active && (
                        <span className="ml-2 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {enr.classes?.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {enr.classes?.cycle}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {enr.status === "enrolled" ? "Inscrit" : enr.status}
                        </Badge>
                        {enr.is_repeater && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Redoublant
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(enr.enrollment_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {enr.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 3 : RESPONSABLES LÉGAUX */}
      {activeTab === "parents" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Responsables Légaux &amp; Tuteurs rattachés
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Parents, tuteurs ou contacts autorisés à représenter l&apos;élève et à récupérer les bulletins scolaires.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {student.student_parents.map((sp) => (
              <div
                key={sp.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {sp.parent?.first_name} {sp.parent?.last_name}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {sp.relationship}
                    </Badge>
                  </div>
                  {sp.is_primary && (
                    <span className="text-[10px] font-bold bg-[#002B5B] text-white px-2 py-0.5 rounded-full">
                      Contact Principal
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a
                      href={`tel:${sp.parent?.phone}`}
                      className="font-medium text-[#002B5B] hover:underline"
                    >
                      {sp.parent?.phone}
                    </a>
                  </div>

                  {sp.parent?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{sp.parent.email}</span>
                    </div>
                  )}

                  {sp.parent?.profession && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Profession : {sp.parent.profession}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Autorisé à récupérer l&apos;enfant :</span>
                  <span className="font-semibold text-emerald-700">
                    {sp.can_pickup ? "Oui ✓" : "Non ✕"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 4 : VUE CARTE SCOLAIRE OFFICIELLE */}
      {activeTab === "carte" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-200/60">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-[#002B5B]" />
              <p className="text-xs sm:text-sm text-slate-700">
                Format carte d&apos;identité scolaire conforme aux normes scolaires nationales (Togo / Afrique de l&apos;Ouest). Prête pour impression badge PVC ou papier bristol.
              </p>
            </div>
            <Button size="sm" onClick={handlePrint} className="gap-2 shrink-0">
              <Printer className="h-4 w-4" />
              Imprimer le badge
            </Button>
          </div>

          {/* Maquette Carte d'Identité Scolaire */}
          <div className="flex justify-center">
            <div className="w-[420px] bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border-black">
              {/* En-tête Carte */}
              <div className="bg-[#002B5B] text-white p-3.5 flex items-center justify-between border-b-2 border-[#FF6B00]">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs">
                    SK
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Carte d&apos;identité scolaire
                    </h4>
                    <span className="text-[9px] text-slate-300 block tracking-wider">
                      RÉPUBLIQUE DU TOGO
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold block text-[#FF6B00]">
                    {currentEnrollment?.academic_years?.name || "2026-2027"}
                  </span>
                  <span className="text-[9px] text-slate-300">Année Scolaire</span>
                </div>
              </div>

              {/* Corps de la Carte */}
              <div className="p-4 space-y-3">
                <div className="flex gap-4 items-start">
                  {/* Photo / Cadre portrait */}
                  <div className="w-24 h-28 rounded-xl bg-slate-100 border-2 border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0 overflow-hidden shadow-xs">
                    <User className="h-12 w-12 text-[#002B5B]/30" />
                    <span className="text-[9px] font-bold uppercase text-[#002B5B] mt-1">
                      {student.gender === "M" ? "Garçon" : "Fille"}
                    </span>
                  </div>

                  {/* Informations */}
                  <div className="flex-1 space-y-1 text-xs">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                        Matricule
                      </span>
                      <span className="font-mono font-bold text-[#002B5B] text-sm">
                        {student.matricule}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                        Nom &amp; Prénoms
                      </span>
                      <span className="font-bold text-slate-900 text-sm leading-tight block">
                        {student.last_name} {student.first_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                          Classe
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentEnrollment?.classes?.name || "SIL"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                          Lieu de Naiss.
                        </span>
                        <span className="font-semibold text-slate-700 truncate block">
                          {student.birth_place || "Lomé"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pied de Carte avec QR Code institutionnel et signature */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 block">
                      Groupe sanguin : <strong>{student.blood_group || "O+"}</strong>
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Urgence : <strong>{primaryParent?.phone || "+228 90 00 00 00"}</strong>
                    </span>
                  </div>

                  {/* QR Code SVG institutionnel */}
                  <div className="h-12 w-12 border border-slate-200 p-1 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    <QrCode className="h-full w-full text-slate-800" />
                  </div>
                </div>
              </div>

              {/* Bandeau inférieur école */}
              <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-600 uppercase">
                <span>SUKULU — Établissement Pilote</span>
                <span className="text-emerald-600">Valide</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : MODIFIER LE DOSSIER ÉLÈVE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">
                Modifier les informations de l&apos;élève
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    defaultValue={student.last_name}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    defaultValue={student.first_name}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sexe *
                  </label>
                  <select
                    name="gender"
                    defaultValue={student.gender}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="M">Masculin (Garçon)</option>
                    <option value="F">Féminin (Fille)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    defaultValue={student.birth_date}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lieu de naissance
                  </label>
                  <input
                    type="text"
                    name="birthPlace"
                    defaultValue={student.birth_place || ""}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Groupe Sanguin
                  </label>
                  <select
                    name="bloodGroup"
                    defaultValue={student.blood_group || ""}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="">Non précisé</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse / Domicile
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={student.address || ""}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observations médicales / Allergies
                </label>
                <textarea
                  name="medicalNotes"
                  defaultValue={student.medical_notes || ""}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="bg-[#002B5B] hover:bg-[#002047] text-white"
                >
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : NOUVELLE INSCRIPTION / RÉINSCRIPTION */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">
                  Inscrire / Réinscrire l&apos;élève
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Affectez {student.first_name} à une classe pour une année scolaire donnée.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEnroll} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Année Scolaire *
                </label>
                <select
                  name="academicYearId"
                  defaultValue={activeYear?.id || ""}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
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
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                >
                  <option value="">Sélectionner la classe...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.cycle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enrollIsRepeater"
                  name="isRepeater"
                  value="true"
                  className="h-4 w-4 rounded border-slate-300 text-[#002B5B]"
                />
                <label
                  htmlFor="enrollIsRepeater"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Élève redoublant dans cette classe
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes ou observations administratives
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEnrollModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="bg-[#002B5B] hover:bg-[#002047] text-white"
                >
                  Confirmer l&apos;affectation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
