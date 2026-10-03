/**
 * Gestion du consentement « Se souvenir de moi ».
 *
 * Les cookies de session Supabase sont des cookies de session (expirent à la
 * fermeture du navigateur) par défaut. Lorsque l'utilisateur coche la case,
 * on pose un cookie marqueur `sukulu_remember=1` (30 jours) et on prolonge
 * l'expiration des cookies auth à chaque écriture tant que ce marqueur est présent.
 */

export const REMEMBER_COOKIE = "sukulu_remember";
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

type CookieOptions = {
  maxAge?: number;
  [key: string]: unknown;
};

/**
 * Prolonge la durée de vie des cookies auth si le marqueur « se souvenir »
 * est actif. Les cookies non-auth (et le marqueur lui-même) sont inchangés.
 */
export function applyRememberMe(
  options: CookieOptions | undefined,
  remembered: boolean
): CookieOptions | undefined {
  if (!remembered || !options) return options;
  if (options.maxAge !== undefined) return options;
  return { ...options, maxAge: REMEMBER_MAX_AGE };
}
