"use client";

import * as React from "react";
import { Check, ChevronDown, X, Plus } from "lucide-react";

const DEFAULT_DISCIPLINES = [
  "Français",
  "Mathématiques",
  "Sciences Physiques & Chimie (PCT)",
  "Sciences de la Vie et de la Terre (SVT)",
  "Histoire-Géographie",
  "Philosophie",
  "Anglais",
  "Espagnol",
  "Allemand",
  "Informatique & TIC",
  "Éducation Civique (ECM)",
  "Éducation Physique et Sportive (EPS)",
  "Arts Plastiques",
  "Musique",
  "Sciences Économiques et Sociales (SES)",
  "Comptabilité & Gestion",
];

interface MultiSelectSpecialtiesProps {
  name?: string;
  defaultValue?: string;
  availableDisciplines?: string[];
  onChange?: (selected: string[]) => void;
}

export function MultiSelectSpecialties({
  name = "specialty",
  defaultValue = "",
  availableDisciplines = DEFAULT_DISCIPLINES,
  onChange,
}: MultiSelectSpecialtiesProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(() => {
    if (!defaultValue) return [];
    return defaultValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  });
  const [customInput, setCustomInput] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fermer la liste déroulante au clic en dehors
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleItem = (item: string) => {
    const updated = selected.includes(item)
      ? selected.filter((s) => s !== item)
      : [...selected, item];
    setSelected(updated);
    onChange?.(updated);
  };

  const removeItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = selected.filter((s) => s !== item);
    setSelected(updated);
    onChange?.(updated);
  };

  const handleAddCustom = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      const updated = [...selected, trimmed];
      setSelected(updated);
      onChange?.(updated);
      setCustomInput("");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Champ masqué contenant les valeurs séparées par virgule */}
      <input type="hidden" name={name} value={selected.join(", ")} />

      {/* Conteneur principal cliquable */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl cursor-pointer flex items-center justify-between gap-2 hover:border-slate-300 focus-within:border-[#002B5B] focus-within:ring-1 focus-within:ring-[#002B5B] transition-all"
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 py-0.5">
          {selected.length === 0 ? (
            <span className="text-xs text-slate-400">
              Sélectionnez une ou plusieurs disciplines...
            </span>
          ) : (
            selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#002B5B]/10 text-[#002B5B] text-xs font-medium"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={(e) => removeItem(item, e)}
                  className="hover:text-red-600 focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180 text-[#002B5B]" : ""
          }`}
        />
      </div>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1">
          {/* Ajout d'une discipline personnalisée */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 mb-1">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleAddCustom}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#002B5B]"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#002B5B] hover:text-white text-slate-600 transition-colors"
              title="Ajouter cette discipline"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Liste des choix prédéfinis */}
          <div className="space-y-0.5">
            {availableDisciplines.map((discipline) => {
              const isChecked = selected.includes(discipline);
              return (
                <div
                  key={discipline}
                  onClick={() => toggleItem(discipline)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-[#002B5B]/10 text-[#002B5B] font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{discipline}</span>
                  {isChecked && <Check className="w-3.5 h-3.5 text-[#002B5B]" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
