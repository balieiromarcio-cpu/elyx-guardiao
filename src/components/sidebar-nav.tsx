"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconRadar, IconBox, IconBook, IconClock, IconAlert, IconKey, IconSettings } from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: IconRadar, exact: true },
  { href: "/dashboard/produtos", label: "Produtos", icon: IconBox },
  { href: "/dashboard/marca", label: "Guia da marca", icon: IconBook },
  { href: "/dashboard/tarefas", label: "Tarefas de revisão", icon: IconAlert },
  { href: "/dashboard/changelog", label: "Changelog", icon: IconClock },
  { href: "/dashboard/chaves", label: "Chaves e assinantes", icon: IconKey },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: IconSettings },
];

export function SidebarNav({ variant }: { variant: "sidebar" | "bar" }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  if (variant === "bar") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href} className={`chip shrink-0 ${isActive(href, exact) ? "chip-active" : ""}`}>
            <Icon size={14} /> {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, exact }) => (
        <Link key={href} href={href} className={`nav-item ${isActive(href, exact) ? "nav-item-active" : ""}`}>
          <Icon size={16} className="shrink-0 opacity-80" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
