import Link from "next/link";
import type { Metadata } from "next";
import { Building } from "lucide-react";
import { SectionTitle, VoltarLink } from "@/components/ui";
import { BotaoExcluir } from "@/components/botao-excluir";
import { mesEntrega, obterEmpreendimento } from "@/lib/empreendimentos";
import { listarConstrutoras } from "@/lib/construtoras";
import { plural } from "@/lib/format";
import { excluirEmpreendimento } from "../actions";
import { EmpreendimentoForm } from "../empreendimento-form";

export async function generateMetadata({ params }: PageProps<"/empreendimentos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = await obterEmpreendimento(id);
  return { title: `${e.nome} · Tech Imóveis` };
}

export default async function EmpreendimentoPage({ params }: PageProps<"/empreendimentos/[id]">) {
  const { id } = await params;
  const [e, construtoras] = await Promise.all([obterEmpreendimento(id), listarConstrutoras()]);
  const resumo = [e.cidade, e.previsao_entrega && `Entrega ${mesEntrega(e.previsao_entrega)}`, e.vendas > 0 ? plural(e.vendas, "venda", "vendas") : "Nenhuma venda"].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/empreendimentos">Empreendimentos</VoltarLink>

      <header className="flex flex-col items-center pt-4 pb-6 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-surface-3 text-label-2">
          <Building className="size-9" />
        </span>
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">{e.nome}</h1>
        {e.construtora && (
          <Link href={`/construtoras/${e.construtora.id}`} className="mt-1 text-[15px] text-accent">
            {e.construtora.nome}
          </Link>
        )}
        <div className="mt-1 text-[15px] text-label-2">{resumo.join(" · ")}</div>
      </header>

      <SectionTitle>Dados</SectionTitle>
      <EmpreendimentoForm inicial={e} construtoras={construtoras} />

      <BotaoExcluir
        className="mt-10"
        acao={excluirEmpreendimento.bind(null, e.id)}
        rotulo="Excluir empreendimento"
        confirmacao={[
          "O empreendimento será apagado.",
          e.vendas > 0 && "As vendas ligadas a ele continuam, sem o empreendimento.",
          "Não dá para desfazer.",
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}
