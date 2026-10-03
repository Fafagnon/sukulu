import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

/**
 * Callback d'authentification (OAuth Google + liens email Supabase).
 *
 * Supabase renvoie l'utilisateur ici avec un `code` (flow PKCE) ou un
 * `token_hash` (vérification email). On échange le code contre une session
 * puis on redirige vers le chemin `next` validé (anti open-redirect).
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : null,
    "/admin"
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Laisse le proxy (ex-middleware) appliquer la redirection selon le rôle
      // si next pointe vers la racine ; sinon on suit la demande explicite.
      redirect(next);
    }
  }

  // Code absent ou échange échoué : retour sécurisé à la connexion.
  redirect("/login");
}
