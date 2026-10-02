"use client";

import * as React from "react";
import { COUNTRY_DIALING_CODES, getDialingCodeForCountry } from "@/lib/country-phone";

interface PhoneInputProps {
  name: string;
  defaultCountry?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInput({
  name,
  defaultCountry = "Togo",
  defaultValue = "",
  required = false,
  className = "",
  id,
}: PhoneInputProps) {
  // Déterminer l'indicatif initial
  const initialDialCode = React.useMemo(() => {
    if (defaultValue && defaultValue.startsWith("+")) {
      for (const item of Object.values(COUNTRY_DIALING_CODES)) {
        if (defaultValue.startsWith(item.code)) {
          return item.code;
        }
      }
    }
    return getDialingCodeForCountry(defaultCountry);
  }, [defaultValue, defaultCountry]);

  const [selectedCode, setSelectedCode] = React.useState(initialDialCode);
  const [localNumber, setLocalNumber] = React.useState(() => {
    if (defaultValue && defaultValue.startsWith(initialDialCode)) {
      return defaultValue.slice(initialDialCode.length).trim();
    }
    return defaultValue.replace(/^\+\d+\s*/, "");
  });

  // Calcul du numéro complet
  const fullNumber = localNumber.trim() ? `${selectedCode} ${localNumber.trim()}` : "";

  return (
    <div className={`relative flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-[#002B5B] focus-within:ring-1 focus-within:ring-[#002B5B] overflow-hidden transition-all ${className}`}>
      {/* Sélecteur d'indicatif avec drapeau */}
      <div className="relative border-r border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
        <select
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="appearance-none bg-transparent pl-3 pr-6 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
          title="Sélectionner l'indicatif pays"
        >
          {Object.entries(COUNTRY_DIALING_CODES).map(([countryKey, val]) => (
            <option key={countryKey} value={val.code}>
              {val.flag} {val.code} ({val.name})
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
          ▼
        </span>
      </div>

      {/* Saisie du numéro local (sans placeholder artificiel) */}
      <input
        type="tel"
        id={id}
        value={localNumber}
        onChange={(e) => setLocalNumber(e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm text-slate-800 bg-transparent focus:outline-none"
      />

      {/* Champ masqué contenant le numéro complet normalisé soumis avec le formulaire */}
      <input type="hidden" name={name} value={fullNumber} />
    </div>
  );
}
