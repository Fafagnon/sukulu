"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  BookOpen,
  Clock,
  ClipboardCheck,
  LogOut,
  Building2,
  Menu,
  X,
  Users,
  UserCheck,
  Contact,
} from "lucide-react";
import { signOutAction } from "@/features/auth/actions";

interface SidebarProps {
  schoolName: string;
  schoolCode: string;
  userName: string;
  userRole: string;
}

const navItems = [
  {
    label: "Tableau de bord",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Élèves & Dossiers",
    href: "/admin/students",
    icon: Users,
  },
  {
    label: "Enseignants",
    href: "/admin/teachers",
    icon: UserCheck,
  },
  {
    label: "Parents & Tuteurs",
    href: "/admin/parents",
    icon: Contact,
  },
  {
    label: "Années & Périodes",
    href: "/admin/academic-years",
    icon: Calendar,
  },
  {
    label: "Cycles & Classes",
    href: "/admin/classes",
    icon: GraduationCap,
  },
  {
    label: "Matières & Coeffs",
    href: "/admin/subjects",
    icon: BookOpen,
  },
  {
    label: "Emplois du temps",
    href: "/admin/timetable",
    icon: Clock,
  },
  {
    label: "Notes & Résultats",
    href: "/admin/grades",
    icon: ClipboardCheck,
  },
];

export function Sidebar({ schoolName, schoolCode, userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = React.useState(false);

  return (
    <>
      {/* Bouton Toggle Mobile */}
      <div className="md:hidden fixed top-3 left-4 z-50">
        <button
          type="button"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 rounded-xl bg-[#002B5B] text-white shadow-md focus:outline-none"
          aria-label="Ouvrir le menu"
        >
          {isOpenMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Overlay Mobile */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Barre latérale complète */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#002047] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Haut de la barre : Logo et Identité Établissement */}
        <div className="flex flex-col">
          <div className="p-5 border-b border-white/10 flex flex-col gap-3">
            <Link href="/admin" className="relative w-32 h-8 block">
              <Image
                src="/logo.svg"
                alt="SUKULU"
                fill
                priority
                className="object-contain object-left brightness-0 invert"
              />
            </Link>

            <div className="flex items-center gap-2 pt-1">
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0 text-[#FF6B00]">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {schoolName || "Établissement Scolaire"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                  {schoolCode || "SCOLAIRE"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation principale */}
          <nav className="p-3 space-y-1">
            <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Gestion Pédagogique
            </p>

            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsOpenMobile(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white/15 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 stroke-[1.8] ${
                      isActive ? "text-[#FF6B00]" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pied de barre : Profil et Déconnexion */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Se déconnecter"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4 stroke-[1.8]" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
