import type { Metadata } from "next";
import { Badge, Card, PageHeader, VoltarLink } from "@/components/ui";
import { BotaoExcluir } from "@/components/botao-excluir";
import { obterModelo } from "@/lib/construtoras";
import { GRUPO_LABEL, GRUPO_SERIE, TIPO_SERIE_LABEL, type GrupoSerie } from "@/lib/plano";
import { excluirModeloConstrutora } from "../../../actions";
import { percentuaisPorGrupo, pctTexto, resumoSerieModelo } from "../../../resumo";
import { ModeloEditor } from "../modelo-editor";
import { CopiarModelo } from "../copiar-modelo";

export async function generateMetadata({ params }: PageProps<"/construtoras/[id]/modelos/[modeloId]">): Promise<Metadata> {
  const { id, modeloId } = await params;
  const { modelo } = await obterModelo(id, modeloId);
  return { title: `${modelo.nome} · Tech Imóveis` };
}

export default async function ModeloPage({ params }: PageProps<"/construtoras/[id]/modelos/[modeloId]">) {
  const { id, modeloId } = await params;
  const { construtora: c, modelo } = await obterModelo(id, modeloId);

  if (!modelo.sistema) {
    return (
      <div className="mx-auto max-w-xl">
        <VoltarLink href={`/construtoras/${c.id}`}>{c.nome}</VoltarLink>
        <PageHeader title="Plano de pagamento" subtitle={c.nome} />
        <ModeloEditor construtoraId={c.id} modelo={modelo} />
        <BotaoExcluir
          className="mt-10"
          acao={excluirModeloConstrutora.bind(null, c.id, modelo.id)}
          rotulo="Excluir plano"
          confirmacao="O plano será apagado. Propostas e vendas já montadas com ele não mudam."
        />
      </div>
    );
  }

  // Modelo do sistema: só leitura, com opção de copiar para a conta.
  const pct = percentuaisPorGrupo(modelo.series);
  const grupos: GrupoSerie[] = ["entrada", "banco"];
  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={`/construtoras/${c.id}`}>{c.nome}</VoltarLink>
      <PageHeader title={modelo.nome} subtitle={<Badge tone="neutral">Modelo Tech Imóveis</Badge>} />

      {modelo.descricao && <Card className="px-5 py-4 text-[15px] whitespace-pre-line text-label-2">{modelo.descricao}</Card>}

      {grupos.map((g) => {
        const series = modelo.series.filter((s) => GRUPO_SERIE[s.tipo] === g);
        if (!series.length) return null;
        return (
          <section key={g} className="mt-8">
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-[20px] font-bold tracking-[-0.01em]">{GRUPO_LABEL[g]}</h2>
              {pct[g] > 0 && <span className="shrink-0 text-[15px] text-label-2 tabular-nums">{pctTexto(pct[g])} do imóvel</span>}
            </div>
            <Card className="divide-y divide-separator overflow-hidden">
              {series.map((s, i) => (
                <div key={i} className="px-4 py-3 md:px-5">
                  <div className="text-[16px] font-medium">{s.descricao || TIPO_SERIE_LABEL[s.tipo]}</div>
                  <div className="text-[13px] text-label-2">
                    {s.descricao && `${TIPO_SERIE_LABEL[s.tipo]}. `}
                    {resumoSerieModelo(s)}
                  </div>
                </div>
              ))}
            </Card>
          </section>
        );
      })}

      <p className="mt-8 mb-3 px-1 text-[13px] text-label-2">
        Este é um modelo de referência e não pode ser editado. Copie para sua conta para ajustar e usar nas propostas.
      </p>
      <CopiarModelo construtoraId={c.id} modeloId={modelo.id} />
    </div>
  );
}
