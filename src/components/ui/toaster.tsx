"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Système de notifications Toasts contextuelles (Standard #5)
 * Positionné discrètement en bas à droite avec support d'actions d'annulation (Undo).
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group flex items-center gap-3 w-full rounded-lg border border-border bg-surface p-4 text-foreground shadow-lg font-sans text-sm",
          description: "text-foreground-muted text-xs",
          actionButton:
            "rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary-hover transition-colors",
          cancelButton:
            "rounded-md bg-surface-subtle px-3 py-1.5 text-xs font-medium text-foreground hover:bg-slate-200 transition-colors",
          error: "border-error-border bg-error-bg text-error",
          success: "border-success-border bg-success-bg text-success",
          warning: "border-warning-border bg-warning-bg text-warning",
          info: "border-info-border bg-info-bg text-info",
        },
      }}
    />
  );
}
