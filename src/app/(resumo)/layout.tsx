import type { CSSProperties } from "react";
import { getContexto } from "@/lib/dal";

// Telas para o cliente ver ou imprimir: fora do app (sem barra de navegação), fundo claro.
// Continuam exigindo login: só o corretor abre, e mostra ou envia ao cliente.
const css = `
html:has(#resumo-root), html:has(#resumo-root) body { background: #f2f2f7; color-scheme: light; }
@media print {
  @page { margin: 14mm; }
  html:has(#resumo-root), html:has(#resumo-root) body { background: #fff !important; }
}
`;

export default async function ResumoLayout({ children }: LayoutProps<"/">) {
  const { tenant } = await getContexto();
  return (
    <div id="resumo-root" className="min-h-dvh bg-[#f2f2f7] text-neutral-900 print:min-h-0 print:bg-white" style={{ "--accent": tenant.cor_destaque } as CSSProperties}>
      <style>{css}</style>
      {children}
    </div>
  );
}
