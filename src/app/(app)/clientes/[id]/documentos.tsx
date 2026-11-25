"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileImage, FileSpreadsheet, FileText, Upload, X } from "lucide-react";
import { LixeiraConfirmar } from "@/components/botao-excluir";
import { excluirDocumento } from "../../cadastro-actions";
import { definirStatusDocumento } from "./portal-actions";
import { Segmented } from "@/components/form";
import { Badge, Card, SectionTitle, cn } from "@/components/ui";
import { ACCEPT, PASTAS, tamanhoLegivel } from "@/lib/documentos";
import { dataCurta, plural } from "@/lib/format";

export type Documento = {
  id: string;
  nome: string;
  pasta: string;
  status: "ok" | "pendente" | "recusado";
  enviado_por: "corretor" | "cliente";
  criado_em: string;
  mime: string | null;
  tamanho_bytes: number | null;
};

function Icone({ mime }: { mime: string | null }) {
  const cls = "size-5 shrink-0";
  if (mime?.startsWith("image/")) return <FileImage className={cn(cls, "text-accent")} />;
  if (mime?.includes("sheet") || mime?.includes("excel")) return <FileSpreadsheet className={cn(cls, "text-positive")} />;
  return <FileText className={cn(cls, "text-negative")} />;
}

function LinhaDocumento({ d }: { d: Documento }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const status = (s: "ok" | "recusado") =>
    iniciar(async () => {
      setErro(undefined);
      const r = await definirStatusDocumento(d.id, s);
      if (r.erro) setErro(r.erro);
    });

  return (
    <div className={cn("py-3 pr-2 pl-4 md:pl-5", pendente && "opacity-50")}>
      <div className="flex items-center gap-3">
        <a href={`/api/documentos/${d.id}`} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-3">
          <Icone mime={d.mime} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px]">{d.nome}</div>
            <div className="text-[13px] text-label-2">{[tamanhoLegivel(d.tamanho_bytes), dataCurta(d.criado_em)].filter(Boolean).join(" · ")}</div>
            {d.enviado_por === "cliente" && <div className="text-[12px] text-accent">Enviado pelo cliente</div>}
          </div>
          {d.status === "pendente" && <Badge tone="pending">Em análise</Badge>}
          {d.status === "recusado" && <Badge tone="negative">Recusado</Badge>}
        </a>
        <LixeiraConfirmar rotulo={`Excluir ${d.nome}`} pendente={pendente} aoConfirmar={() => iniciar(async () => void (await excluirDocumento(d.id)))} />
      </div>
      {d.status === "pendente" && (
        <div className="mt-2 flex gap-2 pr-2 pl-8">
          <button
            type="button"
            disabled={pendente}
            onClick={() => status("ok")}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-positive/15 text-[15px] font-semibold text-positive transition active:scale-[0.97] disabled:opacity-60"
          >
            <Check className="size-4" /> Aprovar
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => status("recusado")}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-negative/15 text-[15px] font-semibold text-negative transition active:scale-[0.97] disabled:opacity-60"
          >
            <X className="size-4" /> Recusar
          </button>
        </div>
      )}
      {erro && <p className="mt-2 pr-2 pl-8 text-[13px] text-negative">{erro}</p>}
    </div>
  );
}

/** Pasta de documentos do cliente: envio por pasta e lista agrupada. */
export function Documentos({ clienteId, documentos }: { clienteId: string; documentos: Documento[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pasta, setPasta] = useState<string>("Pessoais");
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string>();
  const [, iniciar] = useTransition();

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro(undefined);
    setEnviando(arquivos.length);
    const dados = new FormData();
    dados.set("cliente_id", clienteId);
    dados.set("pasta", pasta);
    for (const f of arquivos) dados.append("arquivos", f);
    try {
      const r = await fetch("/api/documentos", { method: "POST", body: dados });
      const json = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) setErro(json.erro ?? "Não foi possível enviar.");
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(0);
      if (input.current) input.current.value = "";
      iniciar(() => router.refresh());
    }
  }

  const grupos = PASTAS.map((p) => ({ pasta: p, docs: documentos.filter((d) => d.pasta === p) }))
    .concat([{ pasta: "Geral" as never, docs: documentos.filter((d) => !(PASTAS as readonly string[]).includes(d.pasta)) }])
    .filter((g) => g.docs.length > 0);

  return (
    <>
      <SectionTitle action={documentos.length > 0 && <span className="text-[15px] text-label-2">{plural(documentos.length, "arquivo", "arquivos")}</span>}>
        Documentos
      </SectionTitle>

      <Card className="p-3">
        <Segmented name="pasta" options={PASTAS.map((p) => ({ value: p, label: p }))} value={pasta} onChange={setPasta} />
        <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => enviar(e.target.files)} />
        <button
          type="button"
          disabled={enviando > 0}
          onClick={() => input.current?.click()}
          className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-surface-2 text-[17px] font-semibold text-accent transition active:scale-[0.98] active:bg-surface-3 disabled:opacity-60"
        >
          <Upload className="size-5" />
          {enviando > 0 ? `Enviando ${plural(enviando, "arquivo", "arquivos")}…` : `Enviar para ${pasta}`}
        </button>
        <p className="mt-2 text-center text-[12px] text-label-3">PDF, foto, Word ou Excel, até 20 MB cada.</p>
        {erro && <p className="mt-2 rounded-xl bg-negative/15 px-3 py-2 text-[14px] text-negative">{erro}</p>}
      </Card>

      {grupos.map((g) => (
        <div key={g.pasta} className="mt-4">
          <div className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">{g.pasta}</div>
          <Card className="divide-y divide-separator overflow-hidden">
            {g.docs.map((d) => (
              <LinhaDocumento key={d.id} d={d} />
            ))}
          </Card>
        </div>
      ))}
    </>
  );
}
