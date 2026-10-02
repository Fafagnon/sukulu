/**
 * Utilitaires pour les indicatifs téléphoniques par pays
 */

export const COUNTRY_DIALING_CODES: Record<string, { code: string; flag: string; name: string }> = {
  "Togo": { code: "+228", flag: "🇹🇬", name: "Togo" },
  "Bénin": { code: "+229", flag: "🇧🇯", name: "Bénin" },
  "Côte d'Ivoire": { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  "Sénégal": { code: "+221", flag: "🇸🇳", name: "Sénégal" },
  "Burkina Faso": { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  "Mali": { code: "+223", flag: "🇲🇱", name: "Mali" },
  "Niger": { code: "+227", flag: "🇳🇪", name: "Niger" },
  "Guinée": { code: "+224", flag: "🇬🇳", name: "Guinée" },
  "Cameroun": { code: "+237", flag: "🇨🇲", name: "Cameroun" },
  "Gabon": { code: "+241", flag: "🇬🇦", name: "Gabon" },
  "Congo": { code: "+242", flag: "🇨🇬", name: "Congo" },
  "RDC": { code: "+243", flag: "🇨🇩", name: "RDC" },
  "Tchad": { code: "+235", flag: "🇹🇩", name: "Tchad" },
  "France": { code: "+33", flag: "🇫🇷", name: "France" },
  "Ghana": { code: "+233", flag: "🇬🇭", name: "Ghana" },
  "Nigeria": { code: "+234", flag: "🇳🇬", name: "Nigeria" },
};

export function getDialingCodeForCountry(countryName?: string | null): string {
  if (!countryName) return "+228";
  const found = COUNTRY_DIALING_CODES[countryName];
  if (found) return found.code;

  // Recherche insensible à la casse
  const normalized = countryName.trim().toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_DIALING_CODES)) {
    if (key.toLowerCase() === normalized) {
      return value.code;
    }
  }

  return "+228";
}
