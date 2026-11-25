import type { Metadata } from "next";
import { PageHeader, VoltarLink } from "@/components/ui";
import { ConstrutoraForm } from "../construtora-form";

export const metadata: Metadata = { title: "Nova construtora · Tech Imóveis" };

export default function NovaConstrutoraPage() {
  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href="/construtoras">Construtoras</VoltarLink>
      <PageHeader title="Nova construtora" subtitle="Só o nome é obrigatório. Depois você cadastra os planos de pagamento dela." />
      <ConstrutoraForm />
    </div>
  );
}
