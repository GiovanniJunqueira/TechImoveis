import { LogOut, MessageCircle } from "lucide-react";
import { ResumoPlano } from "@/components/resumo-plano";
import { dadosPortal, infoPortal, resumoDaVenda, type DocumentoPortal } from "@/lib/portal";
import { PASTAS, tamanhoLegivel } from "@/lib/documentos";
import { dataCurta } from "@/lib/format";
import { EntrarForm } from "./entrar-form";
import { EnviarDocumentos } from "./enviar-documentos";
import { sair } from "./actions";

// Lê o cookie da sessão: sempre dinâmica, nunca em cache.
export const dynamic = "force-dynamic";

const cartao = "rounded-[24px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.06)]";

function Tela({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">{children}</main>;
}

function Cabecalho({ empresa }: { empresa: string }) {
  return (
    <div className="mb-6 text-center">
      <div className="text-[12px] font-semibold tracking-wider text-[var(--accent)] uppercase">{empresa}</div>
      <h1 className="mt-1 text-[28px] font-bold tracking-tight">Portal do cliente</h1>
    </div>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={`${cartao} text-center`}>
      <h2 className="text-[20px] font-semibold">{titulo}</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-neutral-600">{texto}</p>
    </div>
  );
}

const STATUS: Record<DocumentoPortal["status"], { texto: string; cls: string }> = {
  pendente: { texto: "Em análise", cls: "bg-amber-100 text-amber-800" },
  ok: { texto: "Aprovado", cls: "bg-green-100 text-green-800" },
  recusado: { texto: "Recusado — envie de novo", cls: "bg-red-100 text-red-700" },
};

function ListaDocumentos({ documentos }: { documentos: DocumentoPortal[] }) {
  if (!documentos.length) return <p className="mt-4 px-1 text-center text-[15px] text-neutral-500">Você ainda não enviou documentos.</p>;
  const ordem = (p: string) => ((PASTAS as readonly string[]).indexOf(p) + 1 || 99);
  const lista = [...documentos].sort((a, b) => ordem(a.pasta) - ordem(b.pasta) || b.criado_em.localeCompare(a.criado_em));
  return (
    <ul className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-[24px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {lista.map((d) => (
        <li key={d.id} className="px-5 py-3.5">
          <div className="text-[16px] font-medium break-words">{d.nome}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500">
            <span>{[d.pasta, tamanhoLegivel(d.tamanho_bytes), dataCurta(d.criado_em)].filter(Boolean).join(" · ")}</span>
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${STATUS[d.status]?.cls ?? STATUS.pendente.cls}`}>
              {STATUS[d.status]?.texto ?? STATUS.pendente.texto}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function PortalPage({ params }: PageProps<"/portal/[token]">) {
  const { token } = await params;
  const info = await infoPortal(token);

  if (!info)
    return (
      <Tela>
        <Aviso titulo="Link inválido ou expirado" texto="Peça um novo link ao seu corretor." />
      </Tela>
    );

  const dados = await dadosPortal(token);

  // Ainda não entrou: confirma a identidade antes de mostrar qualquer dado.
  if (!dados)
    return (
      <Tela>
        <Cabecalho empresa={info.empresa} />
        {info.pergunta === "nenhuma" ? (
          <Aviso
            titulo="Cadastro incompleto"
            texto={`Para abrir o portal, ${info.corretor || "seu corretor"} precisa completar seu cadastro (CPF ou data de nascimento). Fale com ele.`}
          />
        ) : info.bloqueado ? (
          <Aviso titulo="Acesso pausado" texto="Muitas tentativas. Tente de novo em 15 minutos." />
        ) : (
          <div className={cartao}>
            <p className="text-center text-[17px] leading-relaxed text-neutral-700">
              Para sua segurança, confirme {info.pergunta === "nascimento" ? "sua data de nascimento" : "os 4 últimos dígitos do seu CPF"}.
            </p>
            <EntrarForm token={token} pergunta={info.pergunta} />
          </div>
        )}
      </Tela>
    );

  const primeiroNome = dados.cliente.nome.trim().split(/\s+/)[0];
  const fone = dados.corretor.telefone?.replace(/\D/g, "");
  const whatsapp = fone ? `https://wa.me/${fone.startsWith("55") && fone.length > 11 ? fone : `55${fone}`}` : null;

  return (
    <Tela>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold tracking-wider text-[var(--accent)] uppercase">{dados.empresa}</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight break-words">Olá, {primeiroNome}</h1>
        </div>
        <form action={sair.bind(null, token)}>
          <button type="submit" className="flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[15px] font-medium text-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-[0.97]">
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
      </div>

      <section className={`${cartao} mb-6`}>
        <div className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Seu corretor</div>
        <div className="mt-1 text-[18px] font-semibold">{dados.corretor.nome}</div>
        {dados.corretor.creci && <div className="text-[14px] text-neutral-500">CRECI {dados.corretor.creci}</div>}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-[50px] items-center justify-center gap-2 rounded-full bg-[#25d366] text-[17px] font-semibold text-white active:scale-[0.98]"
          >
            <MessageCircle className="size-5" />
            Falar no WhatsApp
          </a>
        )}
      </section>

      <div className="space-y-6">
        {dados.vendas.length ? (
          dados.vendas.map((v) => <ResumoPlano key={v.id} dados={resumoDaVenda(dados, v)} />)
        ) : (
          <Aviso titulo="Sua proposta" texto="Ainda não há proposta registrada." />
        )}
      </div>

      <section className="mt-10">
        <h2 className="mb-1 px-1 text-[22px] font-bold tracking-tight">Seus documentos</h2>
        <p className="mb-4 px-1 text-[15px] text-neutral-600">Envie aqui os documentos que seu corretor pediu. Pode ser foto do celular.</p>
        <EnviarDocumentos token={token} />
        <ListaDocumentos documentos={dados.documentos} />
      </section>

      <footer className="mt-10 text-center text-[13px] text-neutral-500">Link válido até {dataCurta(dados.expira_em)}</footer>
    </Tela>
  );
}
