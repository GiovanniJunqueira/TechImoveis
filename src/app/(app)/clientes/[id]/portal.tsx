"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Link2, MessageCircle, Pencil } from "lucide-react";
import { Badge, Card, SectionTitle, cn } from "@/components/ui";
import { Expande } from "@/components/expande";
import { gerarLinkPortal, revogarLinkPortal } from "./portal-actions";
import type { LinkPortalAtivo } from "./portal-dados";

const FUSO = "America/Sao_Paulo";
const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO });
const dataHora = (iso: string) =>
  `${new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" })} às ${new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })}`;

const botao =
  "flex h-[50px] w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-60";

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3 md:px-5">
      <span className="text-[15px] text-label-2">{rotulo}</span>
      <span className="text-right text-[15px]">{valor}</span>
    </div>
  );
}

/** Portal do cliente: gera o link (mostrado uma única vez), mostra o status e permite revogar. */
export function PortalCliente({
  clienteId,
  nome,
  telefone,
  podeGerar,
  link,
}: {
  clienteId: string;
  nome: string;
  telefone: string | null;
  podeGerar: boolean;
  link: LinkPortalAtivo | null;
}) {
  const [url, setUrl] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);
  const [revogando, setRevogando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [gerando, iniciarGerar] = useTransition();
  const [revogandoPend, iniciarRevogar] = useTransition();

  // Confirmações de dois toques voltam ao normal sozinhas.
  useEffect(() => {
    if (!revogando) return;
    const t = setTimeout(() => setRevogando(false), 3000);
    return () => clearTimeout(t);
  }, [revogando]);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  function gerar() {
    if (link && !confirmando) return setConfirmando(true);
    setConfirmando(false);
    setErro(undefined);
    iniciarGerar(async () => {
      const r = await gerarLinkPortal(clienteId);
      if (r.erro) setErro(r.erro);
      else if (r.url) setUrl(r.url);
    });
  }

  function revogar() {
    if (!link) return;
    if (!revogando) return setRevogando(true);
    setRevogando(false);
    setErro(undefined);
    iniciarRevogar(async () => {
      const r = await revogarLinkPortal(link.id);
      if (r.erro) setErro(r.erro);
      else setUrl(undefined);
    });
  }

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setErro("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  const primeiroNome = nome.split(" ")[0];
  const tel = telefone?.replace(/\D/g, "");
  const mensagem = url ? `Olá, ${primeiroNome}! Acompanhe sua proposta e envie seus documentos por aqui: ${url}` : "";
  const whatsapp = `https://wa.me/${tel ? `55${tel}` : ""}?text=${encodeURIComponent(mensagem)}`;

  return (
    <>
      <SectionTitle action={link && <Badge tone="positive">Ativo</Badge>}>Portal do cliente</SectionTitle>
      <p className="-mt-1 mb-3 px-1 text-[15px] text-label-2">
        O cliente vê a proposta e envia documentos. Ele confirma os 4 últimos dígitos do CPF para entrar.
      </p>

      {!podeGerar ? (
        <Card className="px-5 py-4">
          <p className="text-[15px] text-label-2">Cadastre o CPF ou a data de nascimento do cliente para gerar o link.</p>
          <Link href={`/clientes/${clienteId}/editar`} className="mt-3 inline-flex items-center gap-1.5 text-[17px] text-accent">
            <Pencil className="size-[18px]" /> Editar cliente
          </Link>
        </Card>
      ) : (
        <>
          <Expande aberto={!!url}>
            <Card className="mb-3 p-4">
              <div className="rounded-xl bg-surface-2 px-3 py-2.5 font-mono text-[13px] break-all select-all">{url}</div>
              <div className="mt-3 flex flex-col gap-2">
                <button type="button" onClick={copiar} className={cn(botao, "bg-surface-2 text-accent active:bg-surface-3")}>
                  {copiado ? <Check className="size-5" /> : <Copy className="size-5" />}
                  {copiado ? "Copiado" : "Copiar"}
                </button>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(botao, "bg-positive text-white active:opacity-80")}
                >
                  <MessageCircle className="size-5" /> Enviar no WhatsApp
                </a>
              </div>
              <p className="mt-2 text-center text-[12px] text-label-3">Guarde: por segurança, o link completo só aparece agora.</p>
            </Card>
          </Expande>

          {link && (
            <Card className={cn("mb-3 divide-y divide-separator overflow-hidden", revogandoPend && "opacity-50")}>
              <Linha rotulo="Criado em" valor={data(link.criado_em)} />
              <Linha rotulo="Válido até" valor={data(link.expira_em)} />
              <Linha
                rotulo="Último acesso"
                valor={link.ultimo_acesso ? dataHora(link.ultimo_acesso) : <span className="text-label-3">Ainda não abriu</span>}
              />
              <button
                type="button"
                disabled={revogandoPend}
                onClick={revogar}
                className={cn(
                  "w-full px-4 py-3 text-left text-[17px] transition active:bg-surface-3 md:px-5",
                  revogando ? "font-semibold text-negative" : "text-negative",
                )}
              >
                {revogandoPend ? "Revogando…" : revogando ? "Toque de novo para revogar" : "Revogar link"}
              </button>
            </Card>
          )}

          {confirmando && <p className="mb-2 px-1 text-center text-[13px] text-label-2">O link atual deixa de funcionar e um novo é criado.</p>}
          <div className="flex gap-2">
            {confirmando && (
              <button type="button" onClick={() => setConfirmando(false)} className={cn(botao, "flex-1 bg-surface-2")}>
                Cancelar
              </button>
            )}
            <button type="button" disabled={gerando} onClick={gerar} className={cn(botao, "flex-1 bg-accent text-white active:opacity-80")}>
              <Link2 className="size-5" />
              {gerando ? "Gerando…" : confirmando ? "Confirmar" : link ? "Gerar novo link" : "Gerar link"}
            </button>
          </div>
        </>
      )}

      {erro && <p className="mt-2 rounded-xl bg-negative/15 px-3 py-2 text-[14px] text-negative">{erro}</p>}
    </>
  );
}
