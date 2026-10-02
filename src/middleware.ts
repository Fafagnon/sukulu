import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { type Database } from "@/types/database";

/**
 * Middleware de sécurité SUKULU :
 * 1. Rafraîchit les sessions chiffrées Supabase Auth via cookies.
 * 2. Bloque l'accès aux espaces privés (/admin, /teacher, /parent) si l'utilisateur n'est pas connecté.
 * 3. Redirige automatiquement un utilisateur déjà authentifié loin des pages de login/register vers son espace de travail.
 */
export async function middleware(request: NextRequest) {
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

  // Ne pas utiliser getSession() pour la sécurité côté serveur, utiliser getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Détection des routes protégées par rôle
  const isProtectedArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/parent");

  // Détection des routes d'accès public
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Cas 1 : Utilisateur non connecté tentant d'accéder à un espace privé
  if (!user && isProtectedArea) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Cas 2 : Utilisateur déjà connecté se rendant sur /login ou /register
  if (user && isAuthRoute) {
    const role = (user.app_metadata?.role as string) || "direction";
    const redirectUrl = request.nextUrl.clone();

    if (role === "enseignant") {
      redirectUrl.pathname = "/teacher";
    } else if (role === "parent") {
      redirectUrl.pathname = "/parent";
    } else {
      // Direction et Superadmin
      redirectUrl.pathname = "/admin";
    }

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.svg & static images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|jfif)$).*)",
  ],
};
