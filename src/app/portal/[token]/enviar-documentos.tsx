"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Upload } from "lucide-react";
import { ACCEPT, PASTAS } from "@/lib/documentos";

// Mesmo limite e tipos do servidor (lib/arquivos), conferidos antes para dar resposta rápida.
const MAXIMO = 20 * 1024 * 1024;
const MAX_ARQUIVOS = 10;
const TIPO_OK = /^(application\/pdf|image\/(jpeg|png|webp|heic|heif)|application\/(msword|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)))$/;

const DESCRICAO: Record<string, string> = {
  Pessoais: "RG, CPF, CNH, certidões, comprovante de endereço",
  Renda: "Holerites, extratos, imposto de renda",
  Contrato: "Contratos e documentos assinados",
  Outros: "Qualquer outro documento",
};

/** Envio de documentos pelo cliente: escolhe a pasta, tira foto ou escolhe arquivos. */
export function EnviarDocumentos({ token }: { token: string }) {
  const router = useRouter();
  const arquivosRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [pasta, setPasta] = useState<string>("Pessoais");
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string>();
  const [sucesso, setSucesso] = useState<string>();
  const [, iniciar] = useTransition();

  async function enviar(lista: FileList | null) {
    const arquivos = Array.from(lista ?? []).filter((f) => f.size > 0);
    if (!arquivos.length) return;
    setErro(undefined);
    setSucesso(undefined);
    if (arquivos.length > MAX_ARQUIVOS) return setErro(`Envie até ${MAX_ARQUIVOS} arquivos por vez.`);
    for (const f of arquivos) {
      if (f.size > MAXIMO) return setErro(`"${f.name}" é maior que 20 MB.`);
      if (!TIPO_OK.test(f.type)) return setErro(`"${f.name}": envie PDF, foto, Word ou Excel.`);
    }

    setEnviando(arquivos.length);
    const dados = new FormData();
    dados.set("pasta", pasta);
    for (const f of arquivos) dados.append("arquivos", f);
    try {
      const r = await fetch(`/api/portal/${encodeURIComponent(token)}/documentos`, { method: "POST", body: dados });
      const json = (await r.json().catch(() => ({}))) as { erro?: string; enviados?: string[] };
      if (r.status === 401) setErro("Sua sessão terminou. Recarregue a página e entre de novo.");
      else if (!r.ok) setErro(json.erro ?? "Não foi possível enviar. Tente de novo.");
      else setSucesso(json.enviados?.length === 1 ? "Documento enviado!" : `${json.enviados?.length ?? arquivos.length} documentos enviados!`);
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(0);
      if (arquivosRef.current) arquivosRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      iniciar(() => router.refresh());
    }
  }

  const ocupado = enviando > 0;
  const botao =
    "flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-50";

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="text-[15px] font-semibold text-neutral-900">1. Que tipo de documento?</div>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de documento">
        {PASTAS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={pasta === p}
            onClick={() => setPasta(p)}
            className={`min-h-[48px] rounded-2xl border px-3 text-[16px] font-medium transition active:scale-[0.98] ${
              pasta === p ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-neutral-200 bg-neutral-50 text-neutral-900"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-neutral-500">{DESCRICAO[pasta]}</p>

      <div className="mt-5 text-[15px] font-semibold text-neutral-900">2. Envie</div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => enviar(e.target.files)} />
      <input ref={arquivosRef} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => enviar(e.target.files)} />
      <div className="mt-3 space-y-2">
        <button type="button" disabled={ocupado} onClick={() => cameraRef.current?.click()} className={`${botao} bg-[var(--accent)] text-white`}>
          <Camera className="size-5" />
          Tirar foto
        </button>
        <button type="button" disabled={ocupado} onClick={() => arquivosRef.current?.click()} className={`${botao} bg-neutral-100 text-neutral-900`}>
          <Upload className="size-5" />
          Escolher arquivos
        </button>
      </div>
      <p className="mt-2 text-center text-[12px] text-neutral-500">PDF, foto, Word ou Excel, até 20 MB cada.</p>

      <div aria-live="polite">
        {ocupado && (
          <div className="mt-3 rounded-xl bg-neutral-100 px-4 py-3 text-[15px] text-neutral-700">
            Enviando {enviando === 1 ? "1 arquivo" : `${enviando} arquivos`}…
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--accent)]" />
            </div>
          </div>
        )}
        {erro && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[15px] text-red-700">{erro}</p>}
        {sucesso && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-[15px] text-green-800">
            <CheckCircle2 className="size-5 shrink-0" />
            {sucesso} Seu corretor vai conferir.
          </p>
        )}
      </div>
    </div>
  );
}
