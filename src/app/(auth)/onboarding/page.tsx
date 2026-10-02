"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  GraduationCap,
  BookOpen,
  Award,
  MapPin,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  Clock,
  ShieldCheck,
  AlertCircle,
  Check,
} from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { submitOnboardingAction } from "@/features/auth/actions";
import { toast } from "sonner";

interface Step1Data {
  schoolType: string;
}

interface Step2Data {
  schoolName: string;
  schoolCode: string;
  city: string;
  country: string;
}

interface Step3Data {
  periodType: "trimestre" | "semestre";
  currency: string;
}

interface Step4Data {
  priorities: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 4;
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form states
  const [schoolType, setSchoolType] = React.useState("complexe");
  const [schoolName, setSchoolName] = React.useState("");
  const [schoolCode, setSchoolCode] = React.useState("");
  const [city, setCity] = React.useState("Lomé");
  const [country, setCountry] = React.useState("Togo");
  const [periodType, setPeriodType] = React.useState<"trimestre" | "semestre">("trimestre");
  const [currency, setCurrency] = React.useState("XOF");
  const [priorities, setPriorities] = React.useState<string[]>([
    "bulletins",
    "presence",
    "caisse",
  ]);

  const togglePriority = (id: string) => {
    setPriorities((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    setErrorMessage(null);

    // Validation par étape
    if (currentStep === 1) {
      if (!schoolType) {
        setErrorMessage("Veuillez sélectionner le type de votre établissement.");
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!schoolName.trim() || schoolName.trim().length < 3) {
        setErrorMessage("Le nom de l'établissement doit comporter au moins 3 caractères.");
        return;
      }
      if (!schoolCode.trim() || schoolCode.trim().length < 2) {
        setErrorMessage("Le sigle/code court doit comporter au moins 2 caractères (ex: CPL).");
        return;
      }
      if (!city.trim()) {
        setErrorMessage("La ville est obligatoire.");
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      // Soumission finale de l'onboarding
      setIsLoading(true);
      const result = await submitOnboardingAction({
        schoolType,
        schoolName: schoolName.trim(),
        schoolCode: schoolCode.trim().toUpperCase(),
        city: city.trim(),
        country,
        currency,
        periodType,
        priorities,
      });

      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      if (result.success) {
        toast.success("Votre établissement est prêt ! Bienvenue dans votre espace SUKULU.");
        router.push(result.redirectPath || "/admin");
        router.refresh();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setErrorMessage(null);
      setCurrentStep(currentStep - 1);
    }
  };

  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <AuthShell showLogo={false}>
      <div className="space-y-6">
        {/* 1. Stepper Header : Étape & Barre de progression segmentée (Image 1) */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2.5">
            <span>Étape {currentStep} sur {totalSteps}</span>
            <span className="text-[#FF6B00]">{percentage}% complété</span>
          </div>

          {/* Barre segmentée aux couleurs de l'Image 1 (#FF6B00) */}
          <div className="flex items-center gap-1.5 w-full">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx < currentStep ? "bg-[#FF6B00]" : "bg-slate-100"
                }`}
              />
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ÉTAPE 1 : Type d'établissement (Image 1) */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* Hero Icon dans son carré aux coins arrondis doux */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shadow-2xs">
                <Building2 className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
                Quel est votre type d&apos;établissement ?
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-[300px]">
                Sélectionnez la configuration qui correspond le mieux à votre structure scolaire.
              </p>
            </div>

            {/* Liste de cartes sélectionnables (Style Image 1) */}
            <div className="space-y-2.5">
              {[
                {
                  id: "complexe",
                  title: "Complexe Scolaire",
                  desc: "Maternelle, Primaire, Collège et Lycée réunis",
                  icon: Layers,
                },
                {
                  id: "secondaire",
                  title: "Collège & Lycée",
                  desc: "Enseignement secondaire général ou technique",
                  icon: GraduationCap,
                },
                {
                  id: "primaire",
                  title: "École Primaire",
                  desc: "Classes de la maternelle au CM2",
                  icon: BookOpen,
                },
                {
                  id: "superieur",
                  title: "Institut / Centre de formation",
                  desc: "Enseignement supérieur professionnel ou technique",
                  icon: Award,
                },
              ].map((item) => {
                const isSelected = schoolType === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSchoolType(item.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${
                      isSelected
                        ? "border-[#FF6B00] bg-orange-50/20 ring-1 ring-[#FF6B00] shadow-xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#FF6B00] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <IconComponent className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {item.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Identité de l'école (Image 1) */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shadow-2xs">
                <MapPin className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
                Identité de l&apos;école
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-[300px]">
                Ces informations apparaîtront sur vos bulletins scolaires officiels et reçus.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Nom officiel de l&apos;établissement
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="ex: Collège Protestant de Lomé"
                  className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Sigle / Code court
                  </label>
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="ex: CPL"
                    maxLength={10}
                    className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 uppercase font-semibold transition-all placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="ex: Lomé"
                    className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Pays
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                >
                  <option value="Togo">Togo</option>
                  <option value="Bénin">Bénin</option>
                  <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
                  <option value="Sénégal">Sénégal</option>
                  <option value="Burkina Faso">Burkina Faso</option>
                  <option value="Autre">Autre (Zone Francophone)</option>
                </select>
              </div>

              {/* Astuce SUKULU (Image 1 style) */}
              <div className="rounded-2xl bg-[#002B5B] text-white p-3.5 flex items-center gap-3 shadow-md mt-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-[#FF6B00]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-[11px] text-slate-200 leading-snug">
                  <span className="font-semibold text-white">Astuce SUKULU : </span>
                  Le code court permet de générer automatiquement des matricules élèves clairs et infalsifiables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Découpage académique & Devise (Image 1) */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shadow-2xs">
                <Clock className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
                Rythme scolaire & Devise
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-[300px]">
                Choisissez comment l&apos;année scolaire est divisée et la devise monétaire de gestion.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Découpage des périodes
              </p>

              <button
                type="button"
                onClick={() => setPeriodType("trimestre")}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  periodType === "trimestre"
                    ? "border-[#FF6B00] bg-orange-50/20 ring-1 ring-[#FF6B00] shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Système Trimestriel (3 trimestres)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modèle officiel Togo & Afrique francophone (T1, T2, T3)
                  </p>
                </div>
                {periodType === "trimestre" && (
                  <div className="w-5 h-5 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPeriodType("semestre")}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  periodType === "semestre"
                    ? "border-[#FF6B00] bg-orange-50/20 ring-1 ring-[#FF6B00] shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Système Semestriel (2 semestres)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Utilisé dans le supérieur, instituts ou filières spécifiques
                  </p>
                </div>
                {periodType === "semestre" && (
                  <div className="w-5 h-5 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Devise de gestion
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
              >
                <option value="XOF">Franc CFA UEMOA (FCFA - XOF)</option>
                <option value="XAF">Franc CFA CEMAC (FCFA - XAF)</option>
                <option value="GNF">Franc Guinéen (GNF)</option>
              </select>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Modules prioritaires (Image 1) */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shadow-2xs">
                <CheckCircle2 className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
                Vos modules prioritaires
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-[300px]">
                Sélectionnez les axes prioritaires que vous souhaitez activer pour votre démarrage.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: "bulletins",
                  title: "Notes & Bulletins officiels",
                  desc: "Saisie rapide, coefficients officiels et calculs automatiques",
                },
                {
                  id: "presence",
                  title: "Appel & Suivi d'assiduité",
                  desc: "Pointage horaire des absences et suivi régulier",
                },
                {
                  id: "caisse",
                  title: "Caisse & Frais de scolarité",
                  desc: "Échéanciers, reçus d'encaissement et suivi des impayés",
                },
                {
                  id: "inscriptions",
                  title: "Inscriptions & Dossiers élèves",
                  desc: "Fiches administratives et matricules uniques",
                },
              ].map((item) => {
                const isSelected = priorities.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => togglePriority(item.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-[#FF6B00] bg-orange-50/20 ring-1 ring-[#FF6B00] shadow-xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="pr-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? "bg-[#FF6B00] border-[#FF6B00] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Astuce de fin */}
            <div className="rounded-2xl bg-[#002B5B] text-white p-3.5 flex items-center gap-3 shadow-md">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-[#FF6B00]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-slate-200 leading-snug">
                Votre base sera partitionnée et sécurisée sous le code{" "}
                <span className="font-semibold text-white">
                  {schoolCode || "SCOLAIRE"}
                </span>.
              </p>
            </div>
          </div>
        )}

        {/* 3. Boutons d'action du bas (Image 1 : Grand bouton Orange arrondi + Passer cette étape) */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="w-full bg-[#FF6B00] hover:bg-[#EA580C] active:scale-[0.99] text-white font-semibold rounded-full py-3.5 text-sm shadow-md shadow-orange-500/25 flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Configuration de votre école...</span>
              </div>
            ) : currentStep === totalSteps ? (
              "Finaliser et accéder au tableau de bord"
            ) : (
              "Continuer"
            )}
          </button>

          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isLoading}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              Retour à l&apos;étape précédente
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              Passer cette étape
            </button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
