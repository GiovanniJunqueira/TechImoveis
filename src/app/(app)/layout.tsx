import type { CSSProperties } from "react";
import { AppShell } from "@/components/app-shell";
import { getContexto } from "@/lib/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { perfil, tenant, email } = await getContexto();
  return (
    <div id="app-root" style={{ "--accent": tenant.cor_destaque } as CSSProperties}>
      <AppShell usuario={{ nome: perfil.nome || email, creci: perfil.creci }}>{children}</AppShell>
    </div>
  );
}
