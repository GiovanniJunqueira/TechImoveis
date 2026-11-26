import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader, VoltarLink } from "@/components/ui";
import { obterVenda } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { FecharForm } from "./fechar-form";

export const metadata: Metadata = { title: "Fechar venda · Tech Imóveis" };

/** Fechamento da proposta: onde o corretor registra a comissão, depois do atendimento. */
export default async function FecharVendaPage({ params }: PageProps<"/vendas/[id]/fechar">) {
  const { id } = await params;
  const v = await obterVenda(id);
  if (v.status !== "proposta") redirect(`/vendas/${v.id}`);
  const imovel = v.empreendimento?.nome ?? v.imovel_descricao;

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={`/vendas/${v.id}`}>Proposta</VoltarLink>
      <PageHeader title="Fechar venda" subtitle={[v.cliente?.nome, imovel].filter(Boolean).join(" · ")} />
      <FecharForm vendaId={v.id} valorInicial={v.valor_venda_centavos} hoje={hojeISO()} />
    </div>
  );
}
