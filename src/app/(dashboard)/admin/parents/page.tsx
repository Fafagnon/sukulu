import * as React from "react";
import { getParents } from "@/features/parents/parent-actions";
import { getAuthenticatedSchoolContext } from "@/lib/auth-context";
import { ParentsClient } from "./parents-client";

export default async function ParentsPage() {
  const [parentsRes, schoolCtx] = await Promise.all([
    getParents(),
    getAuthenticatedSchoolContext(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Annuaire des Parents &amp; Responsables Légaux
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Coordonnées des tuteurs, liens familiaux multi-enfants et contacts d&apos;urgence pour les notifications et les bulletins.
        </p>
      </div>

      <ParentsClient
        initialParents={parentsRes.data || []}
        loadError={parentsRes.error}
        schoolCountry={schoolCtx.country}
      />
    </div>
  );
}
