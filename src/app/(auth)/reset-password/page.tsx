"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"checking" | "ready" | "invalid">(
    "checking"
  );

  // Vérifier qu'une session de récupération est bien présente (lien email cliqué)
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setStatus(data.session ? "ready" : "invalid");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirmPassword") || "");

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      setIsLoading(false);
      return;
    }
    if (password !== confirm) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Votre mot de passe a été réinitialisé.");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-6">
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
          Nouveau mot de passe
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Choisissez un mot de passe sécurisé pour votre compte.
        </p>
      </div>

      {status === "checking" && <FormSkeleton fieldCount={2} />}

      {status === "invalid" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>
            Ce lien de réinitialisation est invalide ou a expiré.{" "}
            <Link href="/login" className="font-semibold underline">
              Retour à la connexion
            </Link>
            .
          </span>
        </div>
      )}

      {status === "ready" && (
        <>
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Nouveau mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#002B5B] hover:bg-[#001f42] active:scale-[0.99] text-white font-medium rounded-xl text-sm transition-all shadow-xs flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <React.Suspense fallback={<FormSkeleton fieldCount={2} />}>
        <ResetPasswordForm />
      </React.Suspense>
    </AuthShell>
  );
}
