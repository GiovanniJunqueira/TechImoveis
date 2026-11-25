import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { SectionTitle, VoltarLink } from "@/components/ui";
import { BotaoExcluir } from "@/components/botao-excluir";
import { obterImobiliaria } from "@/lib/imobiliarias";
import { plural } from "@/lib/format";
import { excluirImobiliaria } from "../actions";
import { ImobiliariaForm } from "../imobiliaria-form";

export async function generateMetadata({ params }: PageProps<"/imobiliarias/[id]">): Promise<Metadata> {
  const { id } = await params;
  const i = await obterImobiliaria(id);
  return { title: `${i.nome} · Tech Imóveis` };
}

export default async function ImobiliariaPage({ params }: PageProps<"/imobiliarias/[id]">) {
  const { id } = await params;
  const i = await obterImobiliaria(id);

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/imobiliarias">Imobiliárias</VoltarLink>

      <header className="flex flex-col items-center pt-4 pb-6 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-surface-3 text-label-2">
          <Handshake className="size-9" />
        </span>
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">{i.nome}</h1>
        <div className="mt-1 text-[15px] text-label-2">{i.vendas > 0 ? plural(i.vendas, "venda", "vendas") : "Nenhuma venda"}</div>
      </header>

      <SectionTitle>Dados</SectionTitle>
      <ImobiliariaForm inicial={i} />

      <BotaoExcluir
        className="mt-10"
        acao={excluirImobiliaria.bind(null, i.id)}
        rotulo="Excluir imobiliária"
        confirmacao={["A imobiliária será apagada.", i.vendas > 0 && "As vendas ligadas a ela continuam, sem a imobiliária.", "Não dá para desfazer."]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}
