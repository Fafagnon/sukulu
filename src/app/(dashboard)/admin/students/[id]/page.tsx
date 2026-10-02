import * as React from "react";
import { notFound } from "next/navigation";
import { getStudentById } from "@/features/students/student-actions";
import { getClasses, getAcademicYears } from "@/features/academic/actions";
import { StudentDetailClient } from "./student-detail-client";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [studentRes, classesRes, yearsRes] = await Promise.all([
    getStudentById(id),
    getClasses(),
    getAcademicYears(),
  ]);

  if (!studentRes.data) {
    notFound();
  }

  return (
    <StudentDetailClient
      student={studentRes.data}
      classes={classesRes.data || []}
      years={yearsRes.data || []}
    />
  );
}
