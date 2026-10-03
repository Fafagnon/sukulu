import * as React from "react";
import Link from "next/link";
import { CheckSquare, ArrowRight } from "lucide-react";
import { getDailyAttendanceOverviewAction } from "@/features/attendance/attendance-actions";
import { AttendanceDirectionDashboard } from "@/features/attendance/attendance-direction-dashboard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage() {
  const res = await getDailyAttendanceOverviewAction();

  if (res.error || !res.data) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <CheckSquare className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Tableau de bord d&apos;assiduité</h1>
        <p className="text-xs text-foreground-muted">
          {res.error || "Impossible de charger les données d'assiduité."}
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-medium border border-border bg-surface text-foreground hover:bg-surface-subtle transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px] bg-[#002B5B]">
              DIRECTION & VIE SCOLAIRE
            </Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Suivi de l&apos;Assiduité & Présences
          </h1>
          <p className="text-xs text-foreground-muted">
            Vue consolidée des présences, retards, absences et alertes de décrochage scolaire
          </p>
        </div>

        <div>
          <Link
            href="/teacher/attendance"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-bold text-white bg-[#002B5B] hover:bg-[#002047] transition-colors shadow-xs"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Faire un appel de classe</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Dashboard interactif */}
      <AttendanceDirectionDashboard initialData={res.data} />
    </div>
  );
}
