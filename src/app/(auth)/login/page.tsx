"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { FormSkeleton } from "@/components/ui/skeleton";
import { loginAction } from "@/features/auth/actions";
import { toast } from "sonner";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
      return;
    }

    if (result.success) {
      toast.success("Connexion réussie.");
      const target = redirectTo || result.redirectPath || "/admin";
      router.push(target);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Logo SUKULU officiel intégré directement en haut de la carte */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative w-36 h-10 mb-4">
          <Image
            src="/logo.svg"
            alt="SUKULU"
            fill
            priority
            className="object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Ravi de vous revoir
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Connectez-vous pour accéder à votre espace de travail.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Formulaire de connexion épuré */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            required
            autoComplete="email"
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
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
            required
            autoComplete="current-password"
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
          />
        </div>

        {/* Remember me & Mot de passe oublié */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
            <input
              type="checkbox"
              name="rememberMe"
              className="h-4 w-4 rounded border-slate-300 text-[#002B5B] focus:ring-[#002B5B]"
            />
            <span>Se souvenir de moi</span>
          </label>
          <a
            href="#forgot"
            onClick={(e) => {
              e.preventDefault();
              toast.info(
                "Pour réinitialiser vos accès, contactez l'administration de votre établissement ou le support SUKULU."
              );
            }}
            className="font-medium text-slate-600 hover:text-[#002B5B] transition-colors"
          >
            Mot de passe oublié ?
          </a>
        </div>

        {/* Bouton principal de connexion */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#002B5B] hover:bg-[#001f42] active:scale-[0.99] text-white font-medium rounded-xl text-sm transition-all shadow-xs flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Connexion en cours...</span>
            </div>
          ) : (
            "Se connecter"
          )}
        </button>
      </form>

      {/* 3. Séparateur "Ou" */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Ou
        </div>
      </div>

      {/* 4. Connexion Google SEULEMENT (Règle utilisateur : Pas d'Apple ni Facebook) */}
      <div>
        <GoogleSignInButton label="Continuer avec Google" redirectTo={redirectTo || "/admin"} />
      </div>

      {/* 5. Lien vers Créer un compte */}
      <div className="text-center text-xs text-slate-500 pt-1">
        <span>Vous n&apos;avez pas de compte ? </span>
        <Link
          href="/register"
          className="font-semibold text-[#002B5B] hover:underline"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <React.Suspense fallback={<FormSkeleton fieldCount={4} />}>
        <LoginFormContent />
      </React.Suspense>
    </AuthShell>
  );
}
