import type { Metadata } from "next";
import { VoltarLink } from "@/components/ui";
import { listarModelos, obterVenda } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { brl } from "@/lib/format";
import { EditorPlano } from "./editor";

export async function generateMetadata({ params }: PageProps<"/vendas/[id]/plano">): Promise<Metadata> {
  const { id } = await params;
  const v = await obterVenda(id);
  return { title: `Montar plano · ${v.cliente?.nome ?? ""} · Tech Imóveis` };
}

export default async function MontarPlanoPage({ params }: PageProps<"/vendas/[id]/plano">) {
  const { id } = await params;
  const v = await obterVenda(id);
  const modelos = await listarModelos(v.construtora_id, v.construtora?.nome ?? null);
  const imovel = [v.empreendimento?.nome ?? v.imovel_descricao, v.unidade && `unid. ${v.unidade}`].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <VoltarLink href={`/vendas/${v.id}`}>Venda</VoltarLink>
      <header className="pt-5 pb-6">
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.02em]">{v.plano_series.length ? "Editar plano" : "Montar plano"}</h1>
        <p className="mt-2 text-[15px] text-label-2">
          {[v.cliente?.nome, imovel, v.construtora?.nome].filter(Boolean).join(" · ")}
          {" · "}
          <span className="sensivel">{brl(v.valor_venda_centavos)}</span>
        </p>
      </header>
      <EditorPlano
        vendaId={v.id}
        valorVenda={v.valor_venda_centavos}
        dataVenda={v.data_venda}
        hoje={hojeISO()}
        banco={v.banco_financiamento}
        construtora={v.construtora?.nome ?? null}
        seriesAtuais={v.plano_series}
        modelos={modelos}
        renda={v.renda_centavos ?? v.cliente?.renda_centavos ?? null}
        aprovado={v.financiamento_aprovado_centavos}
        desconto={v.desconto_financiamento_percentual}
      />
    </div>
  );
}
