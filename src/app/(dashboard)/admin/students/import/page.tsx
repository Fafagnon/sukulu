import * as React from "react";
import { getClasses, getAcademicYears } from "@/features/academic/actions";
import { StudentImportClient } from "./student-import-client";

export default async function StudentImportPage() {
  const [classesRes, yearsRes] = await Promise.all([
    getClasses(),
    getAcademicYears(),
  ]);

  return (
    <div className="space-y-6">
      <StudentImportClient
        classes={classesRes.data || []}
        years={yearsRes.data || []}
        activeYearId={classesRes.activeYearId}
      />
    </div>
  );
}
