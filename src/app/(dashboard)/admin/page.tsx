import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Layers,
  BookOpen,
  Clock,
  Users,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Bannière de bienvenue Direction */}
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px]">
                ESPACE DIRECTION
              </Badge>
              <span className="text-xs text-foreground-muted font-medium">
                Gestion Scolaire &amp; Administrative
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Tableau de bord de l&apos;Établissement
            </h1>
            <p className="text-sm text-foreground-muted max-w-2xl">
              Votre environnement scolaire est sécurisé. Vous pouvez désormais configurer l&apos;année
              scolaire active, les périodes d&apos;évaluation, les classes et les emplois du temps (Phase 1).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="accent" size="sm">
              <Calendar className="h-4 w-4" />
              <span>Configurer l&apos;Année Active</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Raccourcis de configuration Phase 1 */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">
          Modules de Configuration Académique (Phase 1)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-surface p-5 space-y-3 hover:border-brand-primary transition-colors group shadow-2xs">
            <div className="h-10 w-10 rounded-md bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground group-hover:text-brand-primary transition-colors">
                Années &amp; Périodes
              </h3>
              <p className="text-xs text-foreground-muted">
                Définir l&apos;année scolaire en cours et paramétrer les trimestres ou semestres.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-brand-primary flex items-center gap-1">
              <span>Gérer les périodes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-3 hover:border-brand-primary transition-colors group shadow-2xs">
            <div className="h-10 w-10 rounded-md bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground group-hover:text-brand-primary transition-colors">
                Cycles &amp; Classes
              </h3>
              <p className="text-xs text-foreground-muted">
                Structurer les cycles (Collège, Lycée), séries et niveaux de l&apos;école.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-brand-primary flex items-center gap-1">
              <span>Gérer les classes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-3 hover:border-brand-primary transition-colors group shadow-2xs">
            <div className="h-10 w-10 rounded-md bg-brand-primary-subtle text-brand-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground group-hover:text-brand-primary transition-colors">
                Matières &amp; Coefficients
              </h3>
              <p className="text-xs text-foreground-muted">
                Catalogue des disciplines et pondération par niveau scolaire.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-brand-primary flex items-center gap-1">
              <span>Configurer les matières</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-3 hover:border-brand-primary transition-colors group shadow-2xs">
            <div className="h-10 w-10 rounded-md bg-brand-accent-subtle text-brand-accent flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground group-hover:text-brand-accent transition-colors">
                Emplois du Temps
              </h3>
              <p className="text-xs text-foreground-muted">
                Planification par créneaux horaires sans conflit enseignant/classe.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-brand-accent flex items-center gap-1">
              <span>Créer la grille horaire</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
