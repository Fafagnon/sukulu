"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

interface AuthShellProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export function AuthShell({ children, showLogo = true }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#F4F6F9] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Logo SUKULU en haut si demandé */}
      {showLogo && (
        <div className="mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block relative w-36 h-10 transition-transform hover:scale-105">
            <Image
              src="/logo.svg"
              alt="SUKULU"
              fill
              priority
              className="object-contain"
            />
          </Link>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 mt-1">
            Gestion Scolaire Numérique
          </span>
        </div>
      )}

      {/* Cadre de l'écran mobile / carte centrale inspirée de la référence visuelle */}
      <div className="w-full max-w-[420px] bg-white rounded-[32px] border border-slate-100/80 shadow-[0_20px_50px_rgba(0,43,91,0.07)] p-6 sm:p-8 relative overflow-hidden transition-all">
        {/* Simulateur barre d'état discrète pour le rendu mobile-first premium */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-6 px-1 select-none">
          <span>SUKULU OS</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-medium">En ligne</span>
          </div>
        </div>

        {children}
      </div>

      {/* Mention de conformité et sécurité */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <p>SUKULU &bull; Sécurisé avec chiffrement de bout en bout &bull; Afrique de l&apos;Ouest</p>
      </div>
    </div>
  );
}
