import Link from "next/link";
import type { Metadata } from "next";
import { Handshake, Pencil } from "lucide-react";
import { Badge, Card, Chevron, SectionTitle, VoltarLink, heroNumber } from "@/components/ui";
import { BotaoExcluir } from "@/components/botao-excluir";
import { excluirVenda } from "../../cadastro-actions";
import { PAGADOR_LABEL, TIPO_LABEL, obterVenda } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { brl, dataCurta, iniciais } from "@/lib/format";
import { Recebimentos } from "./recebimentos";
import { Plano } from "./plano";

export async function generateMetadata({ params }: PageProps<"/vendas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const v = await obterVenda(id);
  return { title: `${v.status === "proposta" ? "Proposta" : "Venda"} · ${v.cliente?.nome ?? ""} · Tech Imóveis` };
}

const STATUS = {
  fechada: { label: "Fechada", tone: "positive" },
  proposta: { label: "Proposta", tone: "pending" },
  distrato: { label: "Distrato", tone: "negative" },
} as const;

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-5">
      <span className="shrink-0 text-[15px] text-label-2">{rotulo}</span>
      <span className="min-w-0 text-right text-[16px] break-words">{valor}</span>
    </div>
  );
}

export default async function VendaPage({ params }: PageProps<"/vendas/[id]">) {
  const { id } = await params;
  const v = await obterVenda(id);
  const hoje = hojeISO();
  const status = STATUS[v.status];
  const imovel = v.empreendimento?.nome ?? v.imovel_descricao;
  const recebido = v.recebimentos.reduce((s, r) => s + (r.valor_recebido_centavos ?? 0), 0);
  // Proposta pode estar aberta na frente do cliente: a tela não mostra nada de comissão.
  const proposta = v.status === "proposta";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <VoltarLink href={proposta && v.cliente ? `/clientes/${v.cliente.id}` : "/vendas"}>{proposta && v.cliente ? v.cliente.nome.split(" ")[0] : "Vendas"}</VoltarLink>
        <Link href={`/vendas/${v.id}/editar`} className="inline-flex items-center gap-1.5 pt-4 text-[17px] text-accent md:pt-8">
          <Pencil className="size-4" /> Editar
        </Link>
      </div>

      <header className="pt-5 pb-6">
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone="neutral">{TIPO_LABEL[v.tipo]}</Badge>
        </div>
        {proposta ? (
          <>
            <div className="mt-4 text-[15px] text-label-2">Valor do imóvel</div>
            <div className={`sensivel mt-1 ${heroNumber} tabular-nums`}>{brl(v.valor_venda_centavos)}</div>
            <div className="mt-2 text-[15px] text-label-2">Proposta de {dataCurta(v.data_venda)}</div>
          </>
        ) : (
          <>
            <div className="mt-4 text-[15px] text-label-2">Comissão</div>
            <div className={`sensivel mt-1 ${heroNumber} tabular-nums`}>{brl(v.comissao_centavos)}</div>
            <div className="mt-2 text-[15px] text-label-2">
              {v.comissao_percentual != null && `${String(v.comissao_percentual).replace(".", ",")}% de `}
              <span className="sensivel">{brl(v.valor_venda_centavos)}</span>, vendido em {dataCurta(v.data_venda)}
            </div>
          </>
        )}
        {!proposta && recebido > 0 && (
          <div className="mt-1 text-[15px] text-positive">
            <span className="sensivel">{brl(recebido)}</span> já recebido
          </div>
        )}
      </header>

      {v.cliente && (
        <Link
          href={`/clientes/${v.cliente.id}`}
          className="flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface px-4 py-3 transition active:bg-surface-3 md:px-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-[15px] font-semibold">{iniciais(v.cliente.nome)}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-label-2">Cliente</div>
            <div className="truncate text-[17px] font-medium">{v.cliente.nome}</div>
          </div>
          <Chevron />
        </Link>
      )}

      <SectionTitle>Imóvel</SectionTitle>
      <Card className="divide-y divide-separator overflow-hidden">
        <Linha rotulo={v.tipo === "lancamento" ? "Empreendimento" : "Imóvel"} valor={imovel ?? <span className="text-label-3">Não informado</span>} />
        {v.construtora && <Linha rotulo="Construtora" valor={v.construtora.nome} />}
        {v.unidade && <Linha rotulo="Unidade" valor={v.unidade} />}
        {!proposta && v.imobiliaria && <Linha rotulo="Imobiliária parceira" valor={v.imobiliaria.nome} />}
        <Linha rotulo={proposta ? "Valor do imóvel" : "Valor da venda"} valor={<span className="sensivel">{brl(v.valor_venda_centavos)}</span>} />
      </Card>

      {!proposta && (
        <>
      <SectionTitle>Comissão</SectionTitle>
      <Recebimentos
        vendaId={v.id}
        comissao={v.comissao_centavos}
        hoje={hoje}
        itens={v.recebimentos.map((r) => ({
          id: r.id,
          pagador: r.pagador_nome ?? PAGADOR_LABEL[r.pagador_tipo],
          valorPrevisto: r.valor_previsto_centavos,
          dataPrevista: r.data_prevista,
          valorRecebido: r.valor_recebido_centavos,
          dataRecebida: r.data_recebida,
          forma: r.forma,
        }))}
      />
        </>
      )}

      <SectionTitle
        action={
          <Link href={`/vendas/${v.id}/plano`} className="text-[15px] text-accent">
            {v.plano_series.length ? "Editar plano" : "Montar plano"}
          </Link>
        }
      >
        Plano de pagamento do cliente
      </SectionTitle>
      <Plano
        vendaId={v.id}
        valorVenda={v.valor_venda_centavos}
        series={v.plano_series}
        banco={v.banco_financiamento}
        construtora={v.construtora?.nome ?? null}
        hoje={hoje}
      />

      {proposta && (
        <Link
          href={`/vendas/${v.id}/fechar`}
          className="mt-8 flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface px-4 py-4 transition active:bg-surface-3 md:px-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
            <Handshake className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold">Fechar venda</div>
            <div className="text-[13px] text-label-2">Quando o cliente fechar. É aqui que você registra a sua comissão.</div>
          </div>
          <Chevron />
        </Link>
      )}

      {!proposta && v.observacoes && (
        <>
          <SectionTitle>Observações</SectionTitle>
          <Card className="px-5 py-4 text-[16px] whitespace-pre-line">{v.observacoes}</Card>
        </>
      )}

      <BotaoExcluir
        className="mt-10"
        acao={excluirVenda.bind(null, v.id)}
        rotulo={proposta ? "Excluir proposta" : "Excluir venda"}
        confirmacao="A venda e as parcelas de comissão serão apagadas. Não dá para desfazer. Se a venda foi desfeita, prefira marcar como Distrato em Editar."
      />
    </div>
  );
}
