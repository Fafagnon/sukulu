"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Plus, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { FormSkeleton } from "@/components/ui/skeleton";
import { signUpAction } from "@/features/auth/actions";
import { toast } from "sonner";

function RegisterFormContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await signUpAction(formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
      return;
    }

    if (result.success) {
      toast.success("Compte créé avec succès ! Bienvenue sur SUKULU.");
      router.push(result.redirectPath || "/onboarding");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Illustration Avatar avec badge "+" (Image 2 - Create Account) */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-[#002B5B]/5 border border-[#002B5B]/15 flex items-center justify-center text-[#002B5B] shadow-inner transition-transform hover:scale-105">
            <User className="w-8 h-8 stroke-[1.8]" />
          </div>
          {/* Badge Plus en superposition */}
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FF6B00] border-2 border-white flex items-center justify-center text-white shadow-xs">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-3">
          Créer un compte
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
          Inscrivez-vous pour démarrer la configuration de votre établissement scolaire.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Formulaire d'inscription épuré (Image 2) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Nom complet
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="ex: Yao Mensah"
            required
            autoComplete="name"
            className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:border-[#002B5B] focus:ring-2 focus:ring-[#002B5B]/10"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="ex: direction@college-notredame.tg"
            required
            autoComplete="email"
            className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:border-[#002B5B] focus:ring-2 focus:ring-[#002B5B]/10"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Au moins 8 caractères sécurisés"
            required
            minLength={8}
            autoComplete="new-password"
            className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:border-[#002B5B] focus:ring-2 focus:ring-[#002B5B]/10"
          />
        </div>

        {/* Bouton principal de création de compte */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#002B5B] hover:bg-[#001f42] active:scale-[0.99] text-white font-medium rounded-2xl text-sm transition-all shadow-md shadow-[#002B5B]/15 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Création du compte...</span>
            </div>
          ) : (
            "Créer mon compte"
          )}
        </button>
      </form>

      {/* 3. Séparateur "Ou" (Image 2) */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Ou
        </div>
      </div>

      {/* 4. Connexion Google SEULEMENT (Règle utilisateur : Pas d'Apple ni Facebook) */}
      <div>
        <GoogleSignInButton label="Continuer avec Google" redirectTo="/onboarding" />
      </div>

      {/* 5. Lien vers Connexion */}
      <div className="text-center text-xs text-slate-500 pt-2">
        <span>Vous avez déjà un compte ? </span>
        <Link
          href="/login"
          className="font-semibold text-[#002B5B] hover:underline"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <React.Suspense fallback={<FormSkeleton fieldCount={4} />}>
        <RegisterFormContent />
      </React.Suspense>
    </AuthShell>
  );
}
