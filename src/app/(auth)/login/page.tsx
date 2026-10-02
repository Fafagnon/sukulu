"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSkeleton } from "@/components/ui/skeleton";
import { loginAction } from "@/features/auth/actions";
import { toast } from "sonner";

function LoginForm() {
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
      toast.success("Connexion réussie. Redirection en cours...");
      const target = redirectTo || result.redirectPath || "/admin";
      router.push(target);
      router.refresh();
    }
  };

  return (
    <div className="bg-surface py-8 px-6 sm:px-10 rounded-xl border border-border shadow-xs space-y-6">
      {errorMessage && (
        <div className="rounded-lg border border-error-border bg-error-bg p-3.5 flex items-start gap-2.5 text-xs text-error">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Adresse Email"
          placeholder="ex: direction@ecole.tg"
          required
          autoComplete="email"
        />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Mot de passe
              <span className="text-error ml-1">*</span>
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                toast.info("Veuillez contacter l'administrateur de votre établissement pour réinitialiser vos accès.");
              }}
              className="text-xs text-brand-primary hover:underline"
            >
              Mot de passe oublié ?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-foreground-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-transparent"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="default"
            className="w-full h-11 text-sm font-semibold justify-center"
            isLoading={isLoading}
          >
            <span>Se connecter</span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </form>

      {/* Séparateur pour l'onboarding établissement */}
      <div className="pt-4 border-t border-border text-center space-y-3">
        <p className="text-xs text-foreground-muted">
          Votre établissement n&apos;utilise pas encore SUKULU ?
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 w-full rounded-md border border-border bg-surface-subtle px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-slate-200/80 transition-colors"
        >
          <Building2 className="h-4 w-4 text-brand-primary" />
          <span>Inscrire un nouvel établissement</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Logo SUKULU */}
        <div className="flex justify-center">
          <Link href="/" className="relative w-44 h-12 block">
            <Image
              src="/logo.svg"
              alt="SUKULU"
              fill
              priority
              className="object-contain"
            />
          </Link>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Connexion à votre espace
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Accédez à la gestion scolaire de votre établissement
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <React.Suspense fallback={<FormSkeleton className="p-6 bg-surface rounded-xl border border-border" />}>
          <LoginForm />
        </React.Suspense>

        {/* Note de sécurité */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground-muted">
          <ShieldCheck className="h-4 w-4 text-brand-primary" />
          <span>Environnement sécurisé multi-tenant avec chiffrement SSL/TLS</span>
        </div>
      </div>
    </div>
  );
}
