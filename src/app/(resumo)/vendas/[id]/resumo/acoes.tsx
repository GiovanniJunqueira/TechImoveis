"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronLeft, Copy, Printer } from "lucide-react";

const botao = "flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition active:scale-[0.98]";

/** Voltar, imprimir/salvar PDF e copiar o texto para o WhatsApp. Some na impressão. */
export function AcoesResumo({ vendaId, texto }: { vendaId: string; texto: string }) {
  const [copiado, setCopiado] = useState<"ok" | "erro" | null>(null);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado("ok");
    } catch {
      setCopiado("erro");
    }
    setTimeout(() => setCopiado(null), 2500);
  };

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <Link href={`/vendas/${vendaId}`} className="-ml-1.5 inline-flex items-center self-start text-[17px] text-[var(--accent)]">
        <ChevronLeft className="size-6" /> Venda
      </Link>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className={`${botao} bg-[var(--accent)] text-white`}>
          <Printer className="size-[18px]" /> Imprimir / salvar PDF
        </button>
        <button type="button" onClick={copiar} className={`${botao} bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]`}>
          {copiado === "ok" ? <Check className="size-[18px] text-green-600" /> : <Copy className="size-[18px]" />}
          {copiado === "ok" ? "Copiado" : copiado === "erro" ? "Não foi possível copiar" : "Copiar para WhatsApp"}
        </button>
      </div>
    </div>
  );
}
