"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  GraduationCap,
  BookOpen,
  Award,
  Check,
  AlertCircle,
  CalendarDays,
  Coins,
  ClipboardCheck,
  Wallet,
  Users,
} from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { submitOnboardingAction } from "@/features/auth/actions";
import { toast } from "sonner";

const PERIOD_OPTIONS = [
  { id: "trimestre", title: "Trimestres", desc: "3 périodes d'évaluation par an (standard Togo)" },
  { id: "semestre", title: "Semestres", desc: "2 périodes d'évaluation par an" },
] as const;

const CURRENCY_OPTIONS = [
  { id: "XOF", label: "FCFA (XOF)" },
  { id: "XAF", label: "FCFA (XAF)" },
  { id: "GHS", label: "Cedi (GHS)" },
  { id: "EUR", label: "Euro (EUR)" },
] as const;

const PRIORITY_OPTIONS = [
  { id: "notes", label: "Notes & Bulletins", desc: "Saisie des notes, moyennes et rangs", icon: ClipboardCheck },
  { id: "assiduite", label: "Assiduité", desc: "Appel, absences et retards", icon: CalendarDays },
  { id: "caisse", label: "Caisse", desc: "Frais scolaires et reçus", icon: Wallet },
  { id: "inscriptions", label: "Inscriptions", desc: "Dossiers élèves et responsables", icon: Users },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 4;
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Étape 1 — Type d'établissement
  const [schoolType, setSchoolType] = React.useState("complexe");
  // Étape 2 — Identité
  const [schoolName, setSchoolName] = React.useState("");
  const [schoolCode, setSchoolCode] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  // Étape 3 — Organisation académique
  const [periodType, setPeriodType] = React.useState<"trimestre" | "semestre">(
    "trimestre"
  );
  const [currency, setCurrency] = React.useState("XOF");
  // Étape 4 — Modules prioritaires
  const [priorities, setPriorities] = React.useState<string[]>(["notes"]);

  const togglePriority = (id: string) => {
    setPriorities((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    setErrorMessage(null);

    // Validation Étape 1
    if (currentStep === 1) {
      if (!schoolType) {
        setErrorMessage("Veuillez sélectionner le type de votre établissement.");
        return;
      }
      setCurrentStep(2);
      return;
    }

    // Validation Étape 2
    if (currentStep === 2) {
      if (!schoolName.trim() || schoolName.trim().length < 3) {
        setErrorMessage("Le nom de l'établissement doit comporter au moins 3 caractères.");
        return;
      }
      if (!schoolCode.trim() || schoolCode.trim().length < 2) {
        setErrorMessage("Le sigle doit comporter au moins 2 caractères (ex: CNDL).");
        return;
      }
      if (!city.trim()) {
        setErrorMessage("Veuillez renseigner la ville.");
        return;
      }
      if (!country.trim()) {
        setErrorMessage("Veuillez sélectionner le pays.");
        return;
      }
      setCurrentStep(3);
      return;
    }

    // Validation Étape 3
    if (currentStep === 3) {
      if (!periodType) {
        setErrorMessage("Veuillez choisir l'organisation de l'année scolaire.");
        return;
      }
      if (!currency) {
        setErrorMessage("Veuillez sélectionner la devise.");
        return;
      }
      setCurrentStep(4);
      return;
    }

    // Étape 4 : soumission complète
    setIsLoading(true);
    const result = await submitOnboardingAction({
      schoolType,
      schoolName: schoolName.trim(),
      schoolCode: schoolCode.trim().toUpperCase(),
      city: city.trim(),
      country,
      currency,
      periodType,
      priorities: priorities.length > 0 ? priorities : ["notes"],
    });

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
      return;
    }

    if (result.success) {
      toast.success("Établissement configuré avec succès !");
      router.push(result.redirectPath || "/admin");
      router.refresh();
    }
  };

  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <AuthShell>
      <div className="space-y-6">
        {/* 1. Logo SUKULU officiel centré au sommet de la carte */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-32 h-9 mb-1">
            <Image
              src="/logo.svg"
              alt="SUKULU"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* 2. Barre de progression segmentée (4 étapes) */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              Étape {currentStep} sur {totalSteps}
            </span>
            <span className="text-[#002B5B] font-bold">{percentage}%</span>
          </div>

          <div className="flex items-center gap-1.5 w-full">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx < currentStep ? "bg-[#002B5B]" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ÉTAPE 1 : Type d'établissement */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Quel est votre type d&apos;établissement ?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sélectionnez la configuration de votre structure scolaire.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {[
                {
                  id: "complexe",
                  title: "Complexe Scolaire",
                  desc: "Maternelle, Primaire, Collège et Lycée",
                  icon: Building2,
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
                  desc: "Cycles primaire et maternel",
                  icon: BookOpen,
                },
                {
                  id: "superieur",
                  title: "Institut / Centre de formation",
                  desc: "Formations professionnelles ou supérieures",
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
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${
                      isSelected
                        ? "border-[#002B5B] bg-slate-50/70 ring-1 ring-[#002B5B]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 shrink-0 stroke-[1.6] ${
                        isSelected ? "text-[#002B5B]" : "text-slate-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold leading-tight ${
                          isSelected ? "text-[#002B5B]" : "text-slate-900"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#002B5B] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Identité de l'établissement */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Identité de l&apos;établissement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez les coordonnées officielles de votre école.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="schoolName"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Nom de l&apos;établissement
                </label>
                <input
                  id="schoolName"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="schoolCode"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Sigle / Code court
                  </label>
                  <input
                    id="schoolCode"
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold uppercase text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="city"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Ville
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="country"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Pays
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                >
                  <option value="" disabled>
                    Sélectionnez un pays
                  </option>
                  <option value="Togo">Togo</option>
                  <option value="Bénin">Bénin</option>
                  <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
                  <option value="Sénégal">Sénégal</option>
                  <option value="Burkina Faso">Burkina Faso</option>
                  <option value="Mali">Mali</option>
                  <option value="Niger">Niger</option>
                  <option value="Guinée">Guinée</option>
                  <option value="Cameroun">Cameroun</option>
                  <option value="Gabon">Gabon</option>
                  <option value="Congo">Congo</option>
                  <option value="RDC">RDC</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Organisation académique & devise */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Organisation de l&apos;année scolaire
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ces réglages structurent vos périodes d&apos;évaluation et vos bulletins.
              </p>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Rythme académique
              </span>
              {PERIOD_OPTIONS.map((opt) => {
                const isSelected = periodType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPeriodType(opt.id)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${
                      isSelected
                        ? "border-[#002B5B] bg-slate-50/70 ring-1 ring-[#002B5B]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <CalendarDays
                      className={`w-5 h-5 shrink-0 stroke-[1.6] ${
                        isSelected ? "text-[#002B5B]" : "text-slate-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold leading-tight ${
                          isSelected ? "text-[#002B5B]" : "text-slate-900"
                        }`}
                      >
                        {opt.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#002B5B] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="currency"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                <Coins className="w-3.5 h-3.5" /> Devise monétaire
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Utilisée pour la caisse et les reçus de frais scolaires.
              </p>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Modules prioritaires */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Quels modules activez-vous en priorité ?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tous les modules restent disponibles : choisissez vos foyers d&apos;attention.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = priorities.includes(opt.id);
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => togglePriority(opt.id)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${
                      isSelected
                        ? "border-[#FF6B00] bg-orange-50/50 ring-1 ring-[#FF6B00]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 shrink-0 stroke-[1.6] ${
                        isSelected ? "text-[#FF6B00]" : "text-slate-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold leading-tight ${
                          isSelected ? "text-[#FF6B00]" : "text-slate-900"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
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

        {/* 3. Boutons d'action du bas */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="w-full bg-[#FF6B00] hover:bg-[#EA580C] active:scale-[0.99] text-white font-semibold rounded-xl py-3.5 text-sm shadow-xs flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Configuration en cours...</span>
              </div>
            ) : currentStep === totalSteps ? (
              "Finaliser et accéder au tableau de bord"
            ) : (
              "Continuer"
            )}
          </button>

          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={isLoading}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors py-1.5"
            >
              Retour à l&apos;étape précédente
            </button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
