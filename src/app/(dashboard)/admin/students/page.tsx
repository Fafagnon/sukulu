import * as React from "react";
import { getStudents, getStudentStats } from "@/features/students/student-actions";
import { getClasses, getAcademicYears } from "@/features/academic/actions";
import { StudentsClient } from "./students-client";

export default async function StudentsPage() {
  const [studentsRes, statsRes, classesRes, yearsRes] = await Promise.all([
    getStudents(),
    getStudentStats(),
    getClasses(),
    getAcademicYears(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Annuaire des Élèves &amp; Inscriptions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gestion de la communauté scolaire, inscriptions annuelles, fiches individuelles et dossiers des responsables légaux.
        </p>
      </div>

      <StudentsClient
        initialStudents={studentsRes.data || []}
        stats={statsRes}
        classes={classesRes.data || []}
        years={yearsRes.data || []}
        activeYearId={studentsRes.activeYearId ?? null}
        loadError={studentsRes.error}
      />
    </div>
  );
}
