"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchoolAction } from "@/features/auth/actions";
import { toast } from "sonner";

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerSchoolAction(formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
      return;
    }

    if (result.success) {
      toast.success("Établissement créé avec succès ! Bienvenue sur SUKULU.");
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block relative w-44 h-12">
            <Image
              src="/logo.svg"
              alt="SUKULU"
              fill
              priority
              className="object-contain"
            />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Inscrire votre établissement scolaire
            </h1>
            <p className="text-sm text-foreground-muted max-w-md mx-auto">
              Configurez le tenant privé de votre école et créez le premier compte de Direction.
            </p>
          </div>
        </div>

        {/* Formulaire d'onboarding */}
        <div className="bg-surface rounded-xl border border-border shadow-xs p-6 sm:p-10 space-y-8">
          {errorMessage && (
            <div className="rounded-lg border border-error-border bg-error-bg p-4 flex items-start gap-3 text-xs text-error">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1 : Informations de l'école */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border text-brand-primary">
                <Building2 className="h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  1. Informations sur l&apos;Établissement
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    name="schoolName"
                    label="Nom complet de l'école"
                    placeholder="Ex: Complexe Scolaire La Renaissance"
                    required
                  />
                </div>

                <div>
                  <Input
                    name="schoolCode"
                    label="Code abrégé de l'école"
                    placeholder="Ex: CS-RENAISS"
                    helperText="Identifiant unique pour les matricules"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                    Pays <span className="text-error ml-1">*</span>
                  </label>
                  <select
                    name="country"
                    defaultValue="Togo"
                    className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <option value="Togo">Togo</option>
                    <option value="Cameroun">Cameroun</option>
                    <option value="Bénin">Bénin</option>
                    <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
                    <option value="Sénégal">Sénégal</option>
                    <option value="Burkina Faso">Burkina Faso</option>
                  </select>
                </div>

                <div>
                  <Input
                    name="city"
                    label="Ville / Commune"
                    placeholder="Ex: Lomé"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                    Devise monétaire <span className="text-error ml-1">*</span>
                  </label>
                  <select
                    name="currency"
                    defaultValue="XOF"
                    className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <option value="XOF">Franc CFA (XOF / UEMOA)</option>
                    <option value="XAF">Franc CFA (XAF / CEMAC)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2 : Compte Administrateur Direction */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border text-brand-primary">
                <User className="h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  2. Administrateur Principal (Direction)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    name="firstName"
                    label="Prénom"
                    placeholder="Ex: Martial"
                    required
                  />
                </div>
                <div>
                  <Input
                    name="lastName"
                    label="Nom de famille"
                    placeholder="Ex: Takouam"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    name="email"
                    type="email"
                    label="Adresse Email professionnelle"
                    placeholder="direction@ecole.tg"
                    required
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                    Mot de passe sécurisé <span className="text-error ml-1">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-foreground-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-transparent"
                  />
                  <p className="text-xs text-foreground-muted">
                    Sera utilisé pour vous connecter à l&apos;espace Direction.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                type="submit"
                variant="accent"
                className="w-full h-12 text-base font-semibold justify-center"
                isLoading={isLoading}
              >
                <span>Créer l&apos;établissement et accéder au tableau de bord</span>
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-foreground-muted">
              Votre établissement est déjà inscrit ?{" "}
              <Link
                href="/login"
                className="font-semibold text-brand-primary hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Garanties */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 text-xs text-foreground-muted space-y-1">
            <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
            <div className="font-semibold text-foreground">Multi-tenant étanche</div>
            <div>Vos données sont strictement isolées par RLS.</div>
          </div>
          <div className="p-3 text-xs text-foreground-muted space-y-1">
            <ShieldCheck className="h-4 w-4 text-brand-primary mx-auto" />
            <div className="font-semibold text-foreground">Conforme aux standards</div>
            <div>Aucun partage de données entre établissements.</div>
          </div>
          <div className="p-3 text-xs text-foreground-muted space-y-1">
            <Building2 className="h-4 w-4 text-brand-accent mx-auto" />
            <div className="font-semibold text-foreground">Opérationnel immédiatement</div>
            <div>Accès complet à la configuration scolaire.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
