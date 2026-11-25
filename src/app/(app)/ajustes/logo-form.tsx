"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, cn } from "@/components/ui";

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "TI";

export function LogoForm({ logoUrl, nome, podeEditar }: { logoUrl: string | null; nome: string; podeEditar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState(logoUrl);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  const enviar = (metodo: "POST" | "DELETE", arquivo?: File) =>
    iniciar(async () => {
      setErro(undefined);
      if (arquivo && arquivo.size > 2 * 1024 * 1024) {
        setErro("O logo pode ter no máximo 2 MB.");
        return;
      }
      let corpo: FormData | undefined;
      if (arquivo) {
        corpo = new FormData();
        corpo.append("arquivo", arquivo);
      }
      try {
        const r = await fetch("/api/logo", { method: metodo, body: corpo });
        const dados = (await r.json().catch(() => ({}))) as { logoUrl?: string | null; erro?: string };
        if (!r.ok) {
          setErro(dados.erro ?? "Não foi possível salvar o logo.");
          return;
        }
        setLogo(dados.logoUrl ?? null);
        router.refresh();
      } catch {
        setErro("Sem conexão. Tente de novo.");
      }
    });

  const botao = "h-9 rounded-full px-4 text-[15px] font-semibold transition active:scale-[0.97] disabled:opacity-50";

  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Logo" className="size-16 shrink-0 rounded-[14px] bg-white/5 object-contain" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-surface-3 text-[20px] font-bold text-label-2">
            {iniciais(nome)}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <button
            type="button"
            disabled={!podeEditar || pendente}
            onClick={() => input.current?.click()}
            className={cn(botao, "bg-accent text-white")}
          >
            {pendente ? "Salvando…" : logo ? "Trocar logo" : "Enviar logo"}
          </button>
          {logo && (
            <button type="button" disabled={!podeEditar || pendente} onClick={() => enviar("DELETE")} className={cn(botao, "bg-surface-3 text-negative")}>
              Remover
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) enviar("POST", arquivo);
          }}
        />
      </div>
      {erro && <p className="mt-3 text-[13px] text-negative">{erro}</p>}
    </Card>
  );
}
