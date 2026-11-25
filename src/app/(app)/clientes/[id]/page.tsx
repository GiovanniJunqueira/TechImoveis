import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Mail, MessageCircle, Pencil, Phone, Plus, Upload } from "lucide-react";
import { Badge, Card, Money, PrimaryButton, SectionTitle, VoltarLink } from "@/components/ui";
import { LinhaVenda } from "@/components/vendas-por-ano";
import { BotaoExcluir } from "@/components/botao-excluir";
import { excluirCliente } from "../../cadastro-actions";
import { obterCliente } from "@/lib/dal";
import { dataCurta, iniciais, mascaraCpf, mascaraTelefone, plural } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/clientes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await obterCliente(id);
  return { title: `${c.nome} · Tech Imóveis` };
}

function Acao({ href, icone, rotulo, externo }: { href: string; icone: React.ReactNode; rotulo: string; externo?: boolean }) {
  return (
    <a
      href={href}
      {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex flex-1 flex-col items-center gap-1 rounded-[16px] bg-surface py-3 text-[12px] text-accent transition active:scale-[0.97] active:bg-surface-3"
    >
      {icone}
      {rotulo}
    </a>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="px-4 py-3 md:px-5">
      <div className="text-[13px] text-label-2">{rotulo}</div>
      <div className="mt-0.5 text-[16px] break-words whitespace-pre-line">{valor}</div>
    </div>
  );
}

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const c = await obterCliente(id);
  const tel = c.telefone?.replace(/\D/g, "");
  const comissao = c.vendas.reduce((s, v) => s + v.comissao, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/clientes">Clientes</VoltarLink>

      <header className="flex flex-col items-center pt-4 pb-6 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-surface-3 text-[28px] font-semibold">{iniciais(c.nome)}</span>
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">{c.nome}</h1>
        <div className="mt-1 text-[15px] text-label-2">Cliente desde {dataCurta(c.criado_em)}</div>
      </header>

      <div className="flex gap-2">
        {tel && <Acao href={`https://wa.me/55${tel}`} externo icone={<MessageCircle className="size-5" />} rotulo="WhatsApp" />}
        {tel && <Acao href={`tel:+55${tel}`} icone={<Phone className="size-5" />} rotulo="Ligar" />}
        {c.email && <Acao href={`mailto:${c.email}`} icone={<Mail className="size-5" />} rotulo="E-mail" />}
        <Link
          href={`/clientes/${c.id}/editar`}
          className="flex flex-1 flex-col items-center gap-1 rounded-[16px] bg-surface py-3 text-[12px] text-accent transition active:scale-[0.97] active:bg-surface-3"
        >
          <Pencil className="size-5" />
          Editar
        </Link>
      </div>

      <SectionTitle>Dados</SectionTitle>
      <Card className="divide-y divide-separator overflow-hidden">
        <Linha rotulo="Telefone" valor={c.telefone ? mascaraTelefone(c.telefone) : <span className="text-label-3">Não informado</span>} />
        <Linha rotulo="E-mail" valor={c.email ?? <span className="text-label-3">Não informado</span>} />
        <Linha rotulo="CPF" valor={c.cpf ? mascaraCpf(c.cpf) : <span className="text-label-3">Não informado</span>} />
        <Linha rotulo="Nascimento" valor={c.data_nascimento ? dataCurta(c.data_nascimento) : <span className="text-label-3">Não informado</span>} />
        {c.observacoes && <Linha rotulo="Observações" valor={c.observacoes} />}
      </Card>

      <SectionTitle action={c.vendas.length > 0 && <Money cents={comissao} signed whole className="text-[17px] font-semibold" />}>
        {c.vendas.length > 0 ? plural(c.vendas.length, "Venda", "Vendas") : "Vendas"}
      </SectionTitle>
      {c.vendas.length > 0 ? (
        <div className="flex flex-col gap-2">
          {c.vendas.map((v) => (
            <LinhaVenda key={v.id} venda={v} mostrarCliente={false} />
          ))}
        </div>
      ) : (
        <Card className="px-5 py-5 text-[15px] text-label-2">Nenhuma venda para este cliente ainda.</Card>
      )}
      <PrimaryButton href={`/vendas/nova?cliente=${c.id}`} className="mt-3">
        <Plus className="size-5" /> Nova venda para {c.nome.split(" ")[0]}
      </PrimaryButton>

      <SectionTitle>Documentos</SectionTitle>
      {c.documentos.length > 0 ? (
        <Card className="divide-y divide-separator overflow-hidden">
          {c.documentos.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
              <FileText className="size-5 shrink-0 text-label-2" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px]">{d.nome}</div>
                <div className="text-[13px] text-label-2">
                  {d.pasta}, {dataCurta(d.criado_em)}
                  {d.enviado_por === "cliente" && ", enviado pelo cliente"}
                </div>
              </div>
              {d.status === "pendente" && <Badge tone="pending">Revisar</Badge>}
              {d.status === "recusado" && <Badge tone="negative">Recusado</Badge>}
            </div>
          ))}
        </Card>
      ) : (
        <Card className="flex items-center gap-3 px-5 py-5">
          <Upload className="size-5 shrink-0 text-label-2" />
          <div className="text-[15px] text-label-2">
            Nenhum documento ainda. O envio de arquivos (RG, comprovantes, contrato) chega na próxima etapa.
          </div>
        </Card>
      )}

      {c.vendas.length === 0 && (
        <BotaoExcluir
          className="mt-10"
          acao={excluirCliente.bind(null, c.id)}
          rotulo="Excluir cliente"
          confirmacao="O cliente e os documentos dele serão apagados. Não dá para desfazer."
        />
      )}
    </div>
  );
}
