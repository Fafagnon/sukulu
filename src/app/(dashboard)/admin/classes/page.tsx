import * as React from "react";
import { getClasses, getAcademicYears } from "@/features/academic/actions";
import { ClassesClient } from "./classes-client";

export default async function ClassesPage() {
  const [classesRes, yearsRes] = await Promise.all([
    getClasses(),
    getAcademicYears(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organisation Pédagogique &amp; Classes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configurez les cycles, niveaux, séries et divisions de classes de votre établissement pour l&apos;année scolaire active.
        </p>
      </div>

      <ClassesClient
        initialClasses={classesRes.data || []}
        activeYearId={classesRes.activeYearId}
        years={yearsRes.data || []}
        loadError={classesRes.error}
      />
    </div>
  );
}
