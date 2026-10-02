import * as React from "react";
import { getAcademicYears } from "@/features/academic/actions";
import { AcademicYearsClient } from "./academic-years-client";

export default async function AcademicYearsPage() {
  const { data: years, error } = await getAcademicYears();

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Années Scolaires &amp; Découpage des Périodes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gérez l&apos;année scolaire active de l&apos;établissement et le cycle de vie de chaque trimestre ou semestre.
        </p>
      </div>

      <AcademicYearsClient initialYears={years} loadError={error} />
    </div>
  );
}
