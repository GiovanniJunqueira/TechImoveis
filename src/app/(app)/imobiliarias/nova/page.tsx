import type { Metadata } from "next";
import { PageHeader, VoltarLink } from "@/components/ui";
import { ImobiliariaForm } from "../imobiliaria-form";

export const metadata: Metadata = { title: "Nova imobiliária · Tech Imóveis" };

export default function NovaImobiliariaPage() {
  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href="/imobiliarias">Imobiliárias</VoltarLink>
      <PageHeader title="Nova imobiliária" subtitle="Só o nome é obrigatório." />
      <ImobiliariaForm />
    </div>
  );
}
