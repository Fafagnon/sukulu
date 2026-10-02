import * as React from "react";
import { getTeachers } from "@/features/teachers/teacher-actions";
import { TeachersClient } from "./teachers-client";

export default async function TeachersPage() {
  const teachersRes = await getTeachers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Corps Enseignant &amp; Professeurs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gestion des professeurs, profils académiques, matières dispensées et classes affectées.
        </p>
      </div>

      <TeachersClient
        initialTeachers={teachersRes.data || []}
        loadError={teachersRes.error}
      />
    </div>
  );
}
