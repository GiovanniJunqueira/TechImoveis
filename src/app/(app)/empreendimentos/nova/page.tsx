import type { Metadata } from "next";
import { PageHeader, VoltarLink } from "@/components/ui";
import { listarConstrutoras } from "@/lib/construtoras";
import { EmpreendimentoForm } from "../empreendimento-form";

export const metadata: Metadata = { title: "Novo empreendimento · Tech Imóveis" };

export default async function NovoEmpreendimentoPage({ searchParams }: PageProps<"/empreendimentos/nova">) {
  const [{ construtora }, construtoras] = await Promise.all([searchParams, listarConstrutoras()]);
  const padrao = typeof construtora === "string" && construtoras.some((c) => c.id === construtora) ? construtora : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={padrao ? `/empreendimentos?construtora=${padrao}` : "/empreendimentos"}>Empreendimentos</VoltarLink>
      <PageHeader title="Novo empreendimento" subtitle="Só o nome é obrigatório." />
      <EmpreendimentoForm construtoras={construtoras} construtoraPadrao={padrao} />
    </div>
  );
}
