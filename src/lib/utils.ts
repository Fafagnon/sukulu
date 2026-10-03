import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine et fusionne proprement les classes Tailwind CSS
 * sans doublons ni conflits de spécificité.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valide une redirection interne pour éviter les open redirects (//evil.com, https://evil.com).
 * N'accepte que les chemins relatifs commençant par "/" (et non "//").
 * Retourne `fallback` si la valeur est absente ou invalide.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Bloque les caractères de contrôle et les backslashes utilisés pour contourner
  if (/[\\\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
