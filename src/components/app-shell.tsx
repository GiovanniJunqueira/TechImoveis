"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { Home, BadgeDollarSign, Users, Wallet, Settings2, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";
import { sair } from "@/app/(auth)/actions";

const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/vendas", label: "Vendas", icon: BadgeDollarSign },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/ajustes", label: "Ajustes", icon: Settings2 },
];

const iniciais = (nome: string) =>
  nome
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function AppShell({ children, usuario }: { children: ReactNode; usuario: { nome: string; creci: string | null } }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <MotionConfig reducedMotion="user">
      <div className="md:flex">
        {/* Barra lateral (computador) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/[0.06] px-4 py-8 md:flex">
          <div className="mb-10 flex items-center gap-3 px-3">
            <span className="grid size-9 place-items-center rounded-[11px] bg-accent text-[15px] font-bold text-white">TI</span>
            <span className="text-[17px] font-semibold tracking-[-0.01em]">Tech Imóveis</span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-label-2 transition-colors hover:bg-white/5 hover:text-label",
                  active(href) && "bg-white/[0.08] text-label",
                )}
              >
                <Icon className={cn("size-5", active(href) && "text-accent")} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-[13px] font-semibold">
              {iniciais(usuario.nome)}
            </span>
            <div className="min-w-0 flex-1 text-[13px] leading-tight">
              <div className="truncate font-semibold">{usuario.nome}</div>
              <div className="truncate text-label-2">{usuario.creci ? `CRECI ${usuario.creci}` : "CRECI não informado"}</div>
            </div>
            <form action={sair}>
              <button type="submit" aria-label="Sair" className="grid size-8 place-items-center rounded-full text-label-2 hover:bg-white/10 hover:text-negative">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </aside>

        <main className="mx-auto w-full max-w-3xl px-5 pb-32 md:px-10 md:pb-16">{children}</main>

        {/* Barra de abas (celular) */}
        <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] md:hidden">
          <ul className="mx-auto flex max-w-lg justify-around pt-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn("flex w-16 flex-col items-center gap-1 text-[10px] font-medium text-label-3", active(href) && "text-accent")}
                >
                  <Icon className="size-6" strokeWidth={active(href) ? 2.2 : 1.8} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </MotionConfig>
  );
}
