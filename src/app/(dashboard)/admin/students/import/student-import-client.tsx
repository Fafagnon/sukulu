"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  importStudentsBatchAction,
  type StudentImportRow,
} from "@/features/students/import-actions";
import { toast } from "sonner";
import { type Gender } from "@/types/database";

interface ClassItem {
  id: string;
  name: string;
  level: string;
  cycle: string;
}

interface AcademicYearItem {
  id: string;
  name: string;
  is_active: boolean;
}

interface ValidatedRow {
  rowNumber: number;
  data: StudentImportRow;
  isValid: boolean;
  errors: string[];
}

export function StudentImportClient({
  classes,
  years,
  activeYearId,
}: {
  classes: ClassItem[];
  years: AcademicYearItem[];
  activeYearId: string | null;
}) {
  const router = useRouter();

  // Wizard Step: 1 -> 2 -> 3 -> 4 -> 5
  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [targetYearId, setTargetYearId] = React.useState<string>(activeYearId || years[0]?.id || "");

  // File & Raw Data
  const [fileName, setFileName] = React.useState<string>("");
  const [fileHeaders, setFileHeaders] = React.useState<string[]>([]);
  const [rawRows, setRawRows] = React.useState<Record<string, unknown>[]>([]);

  // Column Mapping
  const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({
    matricule: "",
    lastName: "",
    firstName: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    className: "",
    parentName: "",
    parentPhone: "",
    isRepeater: "",
  });

  // Validation Results
  const [validatedRows, setValidatedRows] = React.useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [importResult, setImportResult] = React.useState<{
    importedCount: number;
    errorsCount: number;
  } | null>(null);

  // Téléchargement du Modèle Officiel SUKULU
  const handleDownloadTemplate = () => {
    const headers = [
      "matricule",
      "nom",
      "prenom",
      "sexe",
      "date_naissance",
      "lieu_naissance",
      "classe",
      "nom_parent",
      "telephone_parent",
      "redoublant",
    ];

    const sampleRow = [
      "SUK-2026-0001",
      "MENSAH",
      "Koffi Emmanuel",
      "M",
      "2012-05-14",
      "Lomé",
      classes[0]?.name || "6ème A",
      "MENSAH Jean-Paul",
      "+22890123456",
      "non",
    ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), sampleRow.join(";")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modele_import_eleves_sukulu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Traitement du fichier uploadé (XLSX, XLS ou CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          dateNF: "yyyy-mm-dd",
        });

        if (json.length === 0) {
          toast.error("Le fichier sélectionné est vide.");
          return;
        }

        const headers = Object.keys(json[0]);
        setFileHeaders(headers);
        setRawRows(json);

        // Auto-détection intelligente du mapping des colonnes
        const autoMap: Record<string, string> = { ...columnMapping };
        headers.forEach((h) => {
          const norm = h.toLowerCase().trim();
          if (norm.includes("matr") || norm.includes("id")) autoMap.matricule = h;
          else if (norm.includes("nom") && !norm.includes("prenom") && !norm.includes("par"))
            autoMap.lastName = h;
          else if (norm.includes("prenom")) autoMap.firstName = h;
          else if (norm.includes("sexe") || norm.includes("gender")) autoMap.gender = h;
          else if (norm.includes("naiss") && !norm.includes("lieu")) autoMap.birthDate = h;
          else if (norm.includes("lieu")) autoMap.birthPlace = h;
          else if (norm.includes("class")) autoMap.className = h;
          else if (norm.includes("parent") && (norm.includes("nom") || norm.includes("tut")))
            autoMap.parentName = h;
          else if (norm.includes("tel") || norm.includes("phone")) autoMap.parentPhone = h;
          else if (norm.includes("redoub")) autoMap.isRepeater = h;
        });

        setColumnMapping(autoMap);
        setCurrentStep(2);
        toast.success(`Fichier "${file.name}" chargé : ${json.length} lignes détectées.`);
      } catch {
        toast.error("Format de fichier non reconnu ou corrompu.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // Étape 3 : Validation stricte des données
  const handleValidateMapping = () => {
    // Vérifier que les colonnes obligatoires sont mappées
    if (
      !columnMapping.lastName ||
      !columnMapping.firstName ||
      !columnMapping.gender ||
      !columnMapping.birthDate ||
      !columnMapping.className
    ) {
      toast.error(
        "Veuillez mapper au minimum : Nom, Prénom, Sexe, Date de naissance et Classe."
      );
      return;
    }

    setIsProcessing(true);

    const classNamesSet = new Set(classes.map((c) => c.name.trim().toLowerCase()));
    const seenMatricules = new Set<string>();

    const results: ValidatedRow[] = rawRows.map((row, index) => {
      const rowNum = index + 1;
      const errors: string[] = [];

      // Matricule
      let matricule = columnMapping.matricule
        ? String(row[columnMapping.matricule] || "").trim()
        : "";
      if (!matricule) {
        matricule = `SUK-TEMP-${String(rowNum).padStart(4, "0")}`;
      } else {
        if (seenMatricules.has(matricule.toUpperCase())) {
          errors.push(`Matricule doublon dans le fichier : "${matricule}"`);
        }
        seenMatricules.add(matricule.toUpperCase());
      }

      // Nom & Prénom
      const lastName = String(row[columnMapping.lastName] || "").trim();
      const firstName = String(row[columnMapping.firstName] || "").trim();
      if (!lastName) errors.push("Nom de famille manquant");
      if (!firstName) errors.push("Prénom manquant");

      // Sexe
      const rawGender = String(row[columnMapping.gender] || "").trim().toUpperCase();
      let gender: Gender = "M";
      if (rawGender === "F" || rawGender === "FEMININ" || rawGender === "FILLE") {
        gender = "F";
      } else if (rawGender === "M" || rawGender === "MASCULIN" || rawGender === "GARCON") {
        gender = "M";
      } else {
        errors.push(`Sexe invalide ("${rawGender}"). Valeurs autorisées : M ou F`);
      }

      // Date de naissance
      const rawDate = String(row[columnMapping.birthDate] || "").trim();
      let birthDate = rawDate;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birthDate)) {
        // Essai conversion si format JJ/MM/AAAA
        const parts = rawDate.split(/[-/]/);
        if (parts.length === 3 && parts[2].length === 4) {
          birthDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
      if (isNaN(new Date(birthDate).getTime())) {
        errors.push(`Format de date invalide ("${rawDate}"). Attendu : AAAA-MM-JJ`);
      }

      // Classe
      const className = String(row[columnMapping.className] || "").trim();
      if (!className) {
        errors.push("Classe non renseignée");
      } else if (!classNamesSet.has(className.toLowerCase())) {
        errors.push(
          `Classe introuvable dans l'école : "${className}". Vérifiez l'orthographe.`
        );
      }

      // Redoublant
      const rawRepeater = columnMapping.isRepeater
        ? String(row[columnMapping.isRepeater] || "").trim().toLowerCase()
        : "";
      const isRepeater =
        rawRepeater === "oui" ||
        rawRepeater === "true" ||
        rawRepeater === "1" ||
        rawRepeater === "o";

      const studentRow: StudentImportRow = {
        matricule,
        lastName,
        firstName,
        gender,
        birthDate,
        birthPlace: columnMapping.birthPlace
          ? String(row[columnMapping.birthPlace] || "").trim()
          : undefined,
        className,
        parentName: columnMapping.parentName
          ? String(row[columnMapping.parentName] || "").trim()
          : undefined,
        parentPhone: columnMapping.parentPhone
          ? String(row[columnMapping.parentPhone] || "").trim()
          : undefined,
        isRepeater,
      };

      return {
        rowNumber: rowNum,
        data: studentRow,
        isValid: errors.length === 0,
        errors,
      };
    });

    setValidatedRows(results);
    setIsProcessing(false);
    setCurrentStep(4);
  };

  // Télécharger le rapport d'erreurs
  const handleDownloadErrorReport = () => {
    const errorRows = validatedRows.filter((r) => !r.isValid);
    if (errorRows.length === 0) return;

    const headers = ["Ligne", "Matricule", "Nom", "Prénoms", "Erreurs Détectées"];
    const rows = errorRows.map((r) => [
      r.rowNumber,
      `"${r.data.matricule}"`,
      `"${r.data.lastName}"`,
      `"${r.data.firstName}"`,
      `"${r.errors.join(" | ")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_erreurs_import_sukulu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Étape 5 : Lancement de l'import effectif
  const handleExecuteImport = async () => {
    const validRows = validatedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validRows.length === 0) {
      toast.error("Aucune ligne valide à importer.");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await importStudentsBatchAction(validRows, targetYearId);

      if (!res.success || !res.result) {
        toast.error(res.error || "Erreur lors de l'importation.");
        setIsProcessing(false);
        return;
      }

      setImportResult({
        importedCount: res.result.importedCount,
        errorsCount: res.result.errors.length,
      });

      setCurrentStep(5);
      toast.success(`${res.result.importedCount} élèves importés avec succès !`);
    } catch {
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Retour navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#002B5B] hover:text-[#FF6B00] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;annuaire des élèves
        </Link>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Assistant d&apos;Importation des Élèves
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Importez massivement vos listes scolaires depuis un fichier Excel (.xlsx, .xls) ou CSV en 5 étapes sécurisées.
        </p>
      </div>

      {/* Barre d'étapes (Stepper) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between relative">
          {[
            { num: 1, label: "Upload" },
            { num: 2, label: "Mapping" },
            { num: 3, label: "Validation" },
            { num: 4, label: "Aperçu" },
            { num: 5, label: "Terminé" },
          ].map((s, idx) => (
            <div key={s.num} className="flex flex-col items-center gap-1.5 z-10">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  currentStep === s.num
                    ? "bg-[#002B5B] text-white ring-4 ring-[#002B5B]/10"
                    : currentStep > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {currentStep > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-[11px] font-medium hidden sm:inline ${
                  currentStep >= s.num ? "text-slate-900 font-semibold" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
          {/* Ligne de connexion */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
        </div>
      </div>

      {/* ÉTAPE 1 : UPLOAD */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-200/60">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-[#002B5B]" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Besoin du modèle type pour votre rentrée ?
                </h4>
                <p className="text-xs text-slate-600">
                  Téléchargez le gabarit normalisé SUKULU avec les colonnes prêtes à l&apos;emploi.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 shrink-0 bg-white"
            >
              <Download className="h-4 w-4" />
              Télécharger le modèle CSV
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Année scolaire cible pour les inscriptions *
            </label>
            <select
              value={targetYearId}
              onChange={(e) => setTargetYearId(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-[#002B5B] transition-colors bg-slate-50/50">
            <Upload className="h-10 w-10 text-slate-400 mb-3" />
            <h3 className="font-bold text-slate-800 text-base">
              Glissez-déposez votre fichier ici
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Formats acceptés : <strong>.xlsx</strong>, <strong>.xls</strong>, ou <strong>.csv</strong>.
            </p>
            <label className="mt-5">
              <span className="px-4 py-2 rounded-xl bg-[#002B5B] hover:bg-[#002047] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                Parcourir les fichiers
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : MAPPING DES COLONNES */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Associez les colonnes de votre fichier ({fileName})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Associez chaque colonne détectée dans votre tableau aux champs obligatoires du système.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "lastName", label: "Nom de famille *", required: true },
              { key: "firstName", label: "Prénom(s) *", required: true },
              { key: "gender", label: "Sexe (M ou F) *", required: true },
              { key: "birthDate", label: "Date de naissance (AAAA-MM-JJ) *", required: true },
              { key: "className", label: "Classe d'affectation *", required: true },
              { key: "matricule", label: "Matricule (optionnel)", required: false },
              { key: "birthPlace", label: "Lieu de naissance", required: false },
              { key: "parentName", label: "Nom & Prénom du Parent", required: false },
              { key: "parentPhone", label: "Téléphone du Parent", required: false },
              { key: "isRepeater", label: "Redoublant (oui/non)", required: false },
            ].map((f) => (
              <div key={f.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  {f.label}
                </label>
                <select
                  value={columnMapping[f.key] || ""}
                  onChange={(e) =>
                    setColumnMapping({ ...columnMapping, [f.key]: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">-- Ignorer ou non présent --</option>
                  {fileHeaders.map((h) => (
                    <option key={h} value={h}>
                      Colonne : &quot;{h}&quot;
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              Retour
            </Button>
            <Button
              size="sm"
              onClick={handleValidateMapping}
              className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2"
            >
              Lancer la validation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 : PRÉVISUALISATION & RAPPORT D'ERREURS */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          {/* Résumé de validation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-base">{validCount} lignes valides</h4>
                  <p className="text-xs text-emerald-700">Prêtes à être importées</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <div>
                  <h4 className="font-bold text-base">{invalidCount} lignes erronées</h4>
                  <p className="text-xs text-amber-700">Ignorées lors de l&apos;import</p>
                </div>
              </div>

              {invalidCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrorReport}
                  className="bg-white gap-1.5 text-xs text-amber-800 border-amber-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  Rapport d&apos;erreurs
                </Button>
              )}
            </div>
          </div>

          {/* Tableau d'aperçu des lignes */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="p-2.5">Ligne</th>
                  <th className="p-2.5">Statut</th>
                  <th className="p-2.5">Matricule</th>
                  <th className="p-2.5">Nom &amp; Prénoms</th>
                  <th className="p-2.5">Sexe</th>
                  <th className="p-2.5">Classe</th>
                  <th className="p-2.5">Détails / Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validatedRows.slice(0, 100).map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={r.isValid ? "hover:bg-slate-50" : "bg-rose-50/40"}
                  >
                    <td className="p-2.5 font-mono text-slate-500">{r.rowNumber}</td>
                    <td className="p-2.5">
                      {r.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Valide
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <AlertCircle className="h-3.5 w-3.5" /> Erreur
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono">{r.data.matricule}</td>
                    <td className="p-2.5 font-semibold text-slate-900">
                      {r.data.lastName} {r.data.firstName}
                    </td>
                    <td className="p-2.5">{r.data.gender}</td>
                    <td className="p-2.5">{r.data.className}</td>
                    <td className="p-2.5">
                      {r.isValid ? (
                        <span className="text-slate-500">Conforme</span>
                      ) : (
                        <span className="text-rose-600 font-medium">
                          {r.errors.join(", ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
              Modifier le mapping
            </Button>
            <Button
              size="sm"
              disabled={validCount === 0 || isProcessing}
              isLoading={isProcessing}
              onClick={handleExecuteImport}
              className="bg-[#002B5B] hover:bg-[#002047] text-white gap-2 shadow-xs"
            >
              Importer les {validCount} élèves valides
            </Button>
          </div>
        </div>
      )}

      {/* ÉTAPE 5 : TERMINÉ */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900">
            Importation finalisée avec succès !
          </h3>

          <p className="text-sm text-slate-600 max-w-md mx-auto">
            <strong>{importResult?.importedCount || 0} élèves</strong> ont été créés et inscrits dans leurs classes respectives pour l&apos;année scolaire sélectionnée.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link href="/admin/students">
              <Button className="bg-[#002B5B] hover:bg-[#002047] text-white">
                Accéder à l&apos;annuaire des élèves
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
