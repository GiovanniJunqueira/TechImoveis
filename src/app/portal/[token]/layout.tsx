import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { infoPortal } from "@/lib/portal";

// Portal do cliente: fora do app e sem login (o visitante é anônimo). Fundo claro, cor da empresa.
export const metadata: Metadata = {
  title: "Portal do cliente",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer", // o token do link não vaza para sites externos (ex.: WhatsApp)
};

const css = `html:has(#portal-root), html:has(#portal-root) body { background: #f2f2f7; color-scheme: light; }`;

export default async function PortalLayout({ children, params }: LayoutProps<"/portal/[token]">) {
  const { token } = await params;
  const info = await infoPortal(token);
  const cor = info?.cor && /^#[0-9a-fA-F]{3,8}$/.test(info.cor) ? info.cor : "#0a84ff";
  return (
    <div id="portal-root" className="min-h-dvh bg-[#f2f2f7] text-neutral-900" style={{ "--accent": cor } as CSSProperties}>
      <style>{css}</style>
      {children}
    </div>
  );
}
