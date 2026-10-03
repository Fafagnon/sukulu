import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckSquare } from "lucide-react";
import { getTeacherAttendanceContext } from "@/features/attendance/attendance-actions";
import { AttendanceSheet } from "@/features/attendance/attendance-sheet";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const contextRes = await getTeacherAttendanceContext();

  if (contextRes.error || !contextRes.data) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <CheckSquare className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Feuille d&apos;appel indisponible</h1>
        <p className="text-xs text-foreground-muted">
          {contextRes.error || "Impossible de charger vos classes actuelles."}
        </p>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour à mon espace</span>
        </Link>
      </div>
    );
  }

  const { classes, academicYear, teacherProfile, today } = contextRes.data;

  return (
    <div className="space-y-4">
      {/* En-tête de la page */}
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/teacher"
              className="text-foreground-muted hover:text-foreground transition-colors p-1 -ml-1 rounded-md"
              title="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Badge variant="default" className="text-[10px] bg-[#002B5B]">
              APPEL EN DIRECT
            </Badge>
            {academicYear && (
              <span className="text-[11px] text-foreground-muted font-mono">
                {academicYear.name}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Feuille d&apos;Appel
          </h1>
          <p className="text-xs text-foreground-muted">
            Enseignant : {teacherProfile.fullName}
          </p>
        </div>
      </div>

      {/* Interface interactive d'appel (Online/Offline) */}
      <AttendanceSheet
        initialClasses={classes}
        initialToday={today}
        currentUserId={teacherProfile.id}
      />
    </div>
  );
}
