import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { Badge, Card, Chevron, PrimaryButton, SectionTitle, VoltarLink } from "@/components/ui";
import { BotaoExcluir } from "@/components/botao-excluir";
import { obterConstrutora, type ModeloResumo } from "@/lib/construtoras";
import { plural } from "@/lib/format";
import { excluirConstrutora } from "../actions";
import { ConstrutoraForm } from "../construtora-form";
import { resumoModelo } from "../resumo";

export async function generateMetadata({ params }: PageProps<"/construtoras/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await obterConstrutora(id);
  return { title: `${c.nome} · Tech Imóveis` };
}

function LinhaModelo({ construtoraId, m }: { construtoraId: string; m: ModeloResumo }) {
  return (
    <Link href={`/construtoras/${construtoraId}/modelos/${m.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-3 md:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[16px] font-medium">{m.nome}</span>
          {m.sistema && <Badge tone="neutral">Tech Imóveis</Badge>}
        </div>
        <div className="truncate text-[13px] text-label-2">{resumoModelo(m.series)}</div>
        {m.descricao && <div className="truncate text-[13px] text-label-3">{m.descricao}</div>}
      </div>
      <Chevron />
    </Link>
  );
}

export default async function ConstrutoraPage({ params }: PageProps<"/construtoras/[id]">) {
  const { id } = await params;
  const c = await obterConstrutora(id);
  const total = c.modelos.length + c.modelosSistema.length;

  const avisos = [
    c.modelos.length > 0 && `${plural(c.modelos.length, "plano de pagamento seu será apagado", "planos de pagamento seus serão apagados")} junto.`,
    c.vendas > 0 && `${plural(c.vendas, "venda continua", "vendas continuam")} salva${c.vendas === 1 ? "" : "s"}, mas sem construtora.`,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/construtoras">Construtoras</VoltarLink>

      <header className="flex flex-col items-center pt-4 pb-6 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-surface-3 text-label-2">
          <Building2 className="size-9" />
        </span>
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">{c.nome}</h1>
        <div className="mt-1 text-[15px] text-label-2">{total > 0 ? plural(total, "plano de pagamento", "planos de pagamento") : "Sem planos de pagamento"}</div>
      </header>

      <SectionTitle>Planos de pagamento</SectionTitle>
      {total > 0 ? (
        <Card className="divide-y divide-separator overflow-hidden">
          {c.modelos.map((m) => (
            <LinhaModelo key={m.id} construtoraId={c.id} m={m} />
          ))}
          {c.modelosSistema.map((m) => (
            <LinhaModelo key={m.id} construtoraId={c.id} m={m} />
          ))}
        </Card>
      ) : (
        <Card className="px-5 py-5 text-[15px] text-label-2">
          Cadastre como a {c.nome} divide a entrada (ato, mensais, intercaladas, chaves) e o que fica para o financiamento.
        </Card>
      )}
      {c.modelosSistema.length > 0 && (
        <p className="mt-2 px-1 text-[13px] text-label-2">Os planos marcados Tech Imóveis são de referência. Abra um e copie para sua conta para editar.</p>
      )}
      <PrimaryButton href={`/construtoras/${c.id}/modelos/novo`} className="mt-3">
        <Plus className="size-5" /> Novo plano de pagamento
      </PrimaryButton>

      <SectionTitle>Dados</SectionTitle>
      <ConstrutoraForm inicial={c} />

      <BotaoExcluir
        className="mt-10"
        acao={excluirConstrutora.bind(null, c.id)}
        rotulo="Excluir construtora"
        confirmacao={["A construtora será apagada.", ...avisos, "Não dá para desfazer."].join(" ")}
      />
    </div>
  );
}
