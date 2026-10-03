import * as React from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { getFinancialDashboardOverviewAction } from "@/features/payments/payment-actions";
import { PaymentsDashboard } from "@/features/payments/payments-dashboard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const res = await getFinancialDashboardOverviewAction();

  if (res.error || !res.data) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Coins className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Trésorerie indisponible</h1>
        <p className="text-xs text-foreground-muted">
          {res.error || "Impossible d'accéder au module financier."}
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
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-[10px] bg-[#002B5B]">
            TRÉSORERIE & COMPTABILITÉ
          </Badge>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Trésorerie Scolaire & Encaissements
        </h1>
        <p className="text-xs text-foreground-muted">
          Gestion des frais scolaires, suivi des impayés et émission des reçus officiels certifiés
        </p>
      </div>

      {/* Dashboard financier interactif */}
      <PaymentsDashboard initialData={res.data} />
    </div>
  );
}
