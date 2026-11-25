import { PageHeader, VoltarLink } from "@/components/ui";
import { obterVenda, opcoesVenda } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { VendaForm } from "../../nova/venda-form";

export default async function EditarVendaPage({ params }: PageProps<"/vendas/[id]/editar">) {
  const { id } = await params;
  const [v, opcoes] = await Promise.all([obterVenda(id), opcoesVenda()]);

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={`/vendas/${v.id}`}>Venda</VoltarLink>
      <PageHeader title="Editar venda" subtitle="As parcelas da comissão ficam na tela da venda." />
      <VendaForm
        opcoes={opcoes}
        hoje={hojeISO()}
        inicial={{
          id: v.id,
          clienteId: v.cliente?.id ?? "",
          tipo: v.tipo,
          status: v.status,
          data: v.data_venda,
          valor: v.valor_venda_centavos,
          pct: v.comissao_percentual,
          comissao: v.comissao_centavos,
          imovel: v.empreendimento?.nome ?? v.imovel_descricao ?? "",
          construtora: v.construtora?.nome ?? "",
          unidade: v.unidade ?? "",
          imobiliaria: v.imobiliaria?.nome ?? "",
          observacoes: v.observacoes ?? "",
        }}
      />
    </div>
  );
}
