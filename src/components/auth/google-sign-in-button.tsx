"use client";

import * as React from "react";
import { GoogleIcon } from "@/components/ui/google-icon";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface GoogleSignInButtonProps {
  label?: string;
  redirectTo?: string;
}

export function GoogleSignInButton({
  label = "Continuer avec Google",
  redirectTo = "/admin",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast.error("La connexion avec Google a échoué : " + error.message);
        setIsLoading(false);
      }
    } catch {
      toast.info("L'authentification Google sera opérationnelle dès l'ajout des identifiants Supabase en production.");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 active:bg-slate-100 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <GoogleIcon className="h-4 w-4 shrink-0" />
      <span>{isLoading ? "Connexion en cours..." : label}</span>
    </button>
  );
}
