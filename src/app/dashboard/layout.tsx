import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/components/sidebar-nav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // JWT vive por semanas — revalida a cada acesso que o usuário ainda existe
  // e não foi removido, senão alguém desligado continuaria entrando até expirar.
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { removedAt: true, name: true, role: true } });
  if (!me || me.removedAt) redirect("/login");

  const initials = me.name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/60 backdrop-blur lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-5 pt-5 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Élyx" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Guardião Élyx</p>
            <p className="text-[11px] text-muted">Marca · produtos · fatos</p>
          </div>
        </Link>
        <div className="px-3">
          <SidebarNav variant="sidebar" />
        </div>
        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-semibold text-fg-2">{initials}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm">{me.name}</p>
              <p className="text-[11px] text-muted">{me.role === "ADMIN" ? "administrador" : "equipe"}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Header (mobile) */}
      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="Élyx" className="h-8 w-8 object-contain" />
              <span className="text-sm font-semibold">Guardião Élyx</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{me.name}</span>
              <SignOutButton />
            </div>
          </div>
          <SidebarNav variant="bar" />
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
