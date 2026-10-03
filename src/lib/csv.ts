/**
 * Export CSV sûr (RFC 4180) via Blob.
 *
 * Remplace l'approche `data:... + encodeURI()` qui corrompt le fichier dès
 * qu'une valeur contient `#`, `"`, `%`, `&` ou des accents mal encodés.
 */

/** Échappe un champ CSV (guillemets doublés, champ entre guillemets si besoin). */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Construit le contenu CSV (avec BOM UTF-8 pour Excel). */
export function buildCsv(headers: string[], rows: unknown[][], delimiter = ","): string {
  const lines = [
    headers.map(csvEscape).join(delimiter),
    ...rows.map((row) => row.map(csvEscape).join(delimiter)),
  ];
  // BOM UTF-8 : Excel ouvre correctement les accents
  return "\uFEFF" + lines.join("\r\n");
}

/** Déclenche le téléchargement d'un fichier texte dans le navigateur. */
export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Révoquer après un court délai pour laisser le navigateur démarrer le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
