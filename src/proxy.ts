import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { type Database } from "@/types/database";

/**
 * Proxy SUKULU (ex-« middleware » — convention renommée en Next 16) :
 * 1. Rafraîchit les sessions chiffrées Supabase Auth via cookies.
 * 2. Bloque l'accès aux espaces privés (/admin, /teacher, /parent) si l'utilisateur n'est pas connecté.
 * 3. Redirige un utilisateur déjà authentifié loin des pages de login/register
 *    vers son espace de travail (rôle lu dans profiles, pas dans app_metadata).
 *
 * Note : la redirection post-login utilise `redirectTo` validé côté client et
 * côté serveur par safeRedirectPath (anti open-redirect).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-sukulu.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key-sukulu-dev-only";

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/parent");

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Cas 1 : Utilisateur non connecté tentant d'accéder à un espace privé
  if (!user && isProtectedArea) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Cas 2 : Utilisateur déjà connecté se rendant sur /login ou /register
  if (user && isAuthRoute) {
    let role = (user.app_metadata?.role as string) || "";

    if (!role) {
      // Le rôle vit dans profiles (app_metadata n'est renseigné que parfois)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = profile?.role || "direction";
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";

    if (role === "enseignant") {
      redirectUrl.pathname = "/teacher";
    } else if (role === "parent") {
      redirectUrl.pathname = "/parent";
    } else {
      redirectUrl.pathname = "/admin";
    }

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exclut les assets statiques et l'optimisation d'images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|jfif)$).*)",
  ],
};
