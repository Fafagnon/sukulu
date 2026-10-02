"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ShieldCheck,
  Database,
  Layers,
  Sparkles,
  Users,
  Calendar,
  CheckCircle2,
  RefreshCw,
  FolderTree,
  Table as TableIcon,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function Home() {
  const [btnLoading, setBtnLoading] = React.useState(false);
  const [skeletonView, setSkeletonView] = React.useState<"table" | "card" | "form" | "header">("table");
  const [inputValue, setInputValue] = React.useState("");

  const triggerToast = (withUndo = true) => {
    if (withUndo) {
      toast("Note enregistrée avec succès", {
        description: "Mathématiques — 3ème A : 16/20 pour Koffi Mensah",
        action: {
          label: "Annuler",
          onClick: () => toast.info("Action annulée. La note précédente a été restaurée."),
        },
      });
    } else {
      toast.success("Opération validée dans l'établissement");
    }
  };

  const simulateLoadingAction = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      triggerToast(false);
    }, 1500);
  };

  return (
    <div className="flex-1 w-full bg-background min-h-screen">
      {/* Barre de navigation institutionnelle */}
      <header className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-36 h-10">
              <Image
                src="/logo.svg"
                alt="Logo SUKULU"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
              <Badge variant="secondary" className="font-mono text-[11px]">
                SOCLE PHASE 0
              </Badge>
              <Badge variant="success" className="text-[11px]">
                PRÊT
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerToast(true)}
            >
              Tester Toast avec Undo
            </Button>
            <Button
              variant="default"
              size="sm"
              isLoading={btnLoading}
              onClick={simulateLoadingAction}
            >
              Simuler Action Serveur
            </Button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* En-tête de section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
            <ShieldCheck className="h-4 w-4" />
            <span>Fondation Technique & Système de Design</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            SUKULU — Première pierre technique posée
          </h1>
          <p className="text-foreground-muted text-sm sm:text-base max-w-3xl">
            Ce socle réunit les fondations indispensables du logiciel : identité visuelle officielle,
            tokens de design stricts (sans artifice AI), primitives d&apos;interface réutilisables, squelettes
            de chargement et architecture multi-tenant étanche avec Row Level Security.
          </p>
        </div>

        {/* Grille des 4 piliers validés */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-surface p-5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-brand-primary">
              <span className="text-xs font-semibold uppercase tracking-wide">Multi-Tenant</span>
              <Database className="h-4 w-4" />
            </div>
            <div className="text-lg font-bold text-foreground">RLS PostgreSQL</div>
            <p className="text-xs text-foreground-muted">
              Isolation stricte par <code className="text-brand-primary font-mono font-semibold">school_id</code> sur chaque table. Zéro fuite de données inter-écoles.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-brand-primary">
              <span className="text-xs font-semibold uppercase tracking-wide">Design Tokens</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-lg font-bold text-foreground">Charte SUKULU</div>
            <p className="text-xs text-foreground-muted">
              Bleu nuit (#002B5B), Orange éclatant (#FF6B00), typographie Inter, aucun emoji ni gradient artificiel.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-brand-primary">
              <span className="text-xs font-semibold uppercase tracking-wide">UX Résiliente</span>
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="text-lg font-bold text-foreground">Skeletons & Toasts</div>
            <p className="text-xs text-foreground-muted">
              Squelettes anti-CLS sur les tableaux et formulaires. Notifications avec action d&apos;annulation (Undo).
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-brand-primary">
              <span className="text-xs font-semibold uppercase tracking-wide">Architecture</span>
              <Layers className="h-4 w-4" />
            </div>
            <div className="text-lg font-bold text-foreground">Next.js 16 + PWA</div>
            <p className="text-xs text-foreground-muted">
              TypeScript strict, domaines métier étanches (<code className="font-mono text-[11px]">features/</code>) et base de code prête pour le offline.
            </p>
          </div>
        </div>

        {/* Section 1 : Démonstration des Squelettes de Chargement (Demande spécifique utilisateur) */}
        <section className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-brand-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Laboratoire des Squelettes de Chargement (Anti-CLS)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Démonstration visuelle des gabarits de chargement qui pré-allouent la géométrie exacte des pages scolaires.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-surface-subtle">
              <button
                onClick={() => setSkeletonView("table")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  skeletonView === "table"
                    ? "bg-surface text-brand-primary font-semibold shadow-2xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Tableau de données
              </button>
              <button
                onClick={() => setSkeletonView("card")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  skeletonView === "card"
                    ? "bg-surface text-brand-primary font-semibold shadow-2xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Cartes KPI
              </button>
              <button
                onClick={() => setSkeletonView("form")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  skeletonView === "form"
                    ? "bg-surface text-brand-primary font-semibold shadow-2xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Formulaire
              </button>
              <button
                onClick={() => setSkeletonView("header")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  skeletonView === "header"
                    ? "bg-surface text-brand-primary font-semibold shadow-2xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                En-tête page
              </button>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-dashed border-border bg-surface-subtle/30">
            {skeletonView === "table" && (
              <TableSkeleton rowCount={5} columnCount={5} />
            )}
            {skeletonView === "card" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            )}
            {skeletonView === "form" && (
              <div className="max-w-xl mx-auto">
                <FormSkeleton fieldCount={4} />
              </div>
            )}
            {skeletonView === "header" && (
              <PageHeaderSkeleton />
            )}
          </div>
        </section>

        {/* Section 2 : Primitives du Design System */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Boutons et variantes */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5 shadow-xs">
            <h3 className="text-base font-bold text-foreground">
              Composants Boutons &amp; États Fonctionnels
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="default">Bouton Principal</Button>
              <Button variant="accent">Action Clé (Orange)</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="outline">Contour</Button>
              <Button variant="destructive">Supprimer</Button>
              <Button variant="ghost">Fantôme</Button>
            </div>
            <div className="pt-2 border-t border-border flex items-center gap-3">
              <Button variant="default" size="sm" isLoading>
                Enregistrement
              </Button>
              <Button variant="outline" size="sm" disabled>
                Désactivé
              </Button>
              <Button variant="link" size="sm">
                Lien contextuel
              </Button>
            </div>
          </div>

          {/* Badges et saisie */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5 shadow-xs">
            <h3 className="text-base font-bold text-foreground">
              Badges Sémantiques &amp; Champs de Saisie
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Année Active</Badge>
              <Badge variant="success">Présent (Appel)</Badge>
              <Badge variant="warning">Paiement Partiel</Badge>
              <Badge variant="error">Non Justifié</Badge>
              <Badge variant="info">Période Clôturée</Badge>
              <Badge variant="secondary">Archive</Badge>
            </div>
            <div className="pt-2">
              <Input
                label="Matricule Élève"
                placeholder="Ex : SUK-2026-0042"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Généré automatiquement par séquence atomique de l'établissement."
              />
            </div>
          </div>
        </section>

        {/* Section 3 : État Vide & Validation */}
        <section className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">
              Composant d&apos;État Vide Contextuel (Standard #6)
            </h3>
            <Badge variant="outline">EmptyState</Badge>
          </div>
          <EmptyState
            icon={Users}
            title="Aucun élève inscrit dans cette classe"
            description="La classe de 6ème A n'a pas encore reçu d'affectation pour l'année scolaire 2026-2027."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Importer via Excel
                </Button>
                <Button variant="default" size="sm">
                  Inscrire un premier élève
                </Button>
              </div>
            }
          />
        </section>

        {/* Section 4 : Prochaines étapes de la Roadmap */}
        <section className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <FolderTree className="h-4 w-4 text-brand-primary" />
              <span>Séquence de Construction SUKULU</span>
            </div>
            <span className="text-xs font-mono text-foreground-muted">Prochaine étape : Phase 1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-lg border border-success-border bg-success-bg/40 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-foreground">Phase 0 : Socle &amp; Design</div>
                <div className="text-[11px] text-foreground-muted">Initialisation Next.js, Tokens SUKULU, Skeletons, Multi-Tenant RLS.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-brand-primary/20 bg-brand-primary-subtle/30 flex items-start gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-brand-primary flex items-center justify-center text-[10px] font-bold text-brand-primary shrink-0 mt-0.5">
                1
              </div>
              <div>
                <div className="text-xs font-bold text-brand-primary">Phase 1 : Structure Scolaire</div>
                <div className="text-[11px] text-foreground-muted">Années, trimestres, cycles, classes, matières, coefficients &amp; emplois du temps.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-surface-subtle/40 flex items-start gap-3 opacity-60">
              <div className="h-5 w-5 rounded-full border border-foreground-subtle flex items-center justify-center text-[10px] font-semibold text-foreground-subtle shrink-0 mt-0.5">
                2
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Phase 2 : Communauté &amp; SIS</div>
                <div className="text-[11px] text-foreground-muted">Fiches élèves, matricules uniques, inscriptions annuelles et liaisons parents.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
