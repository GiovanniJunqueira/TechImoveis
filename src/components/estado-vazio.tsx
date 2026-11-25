"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { carregarExemplos } from "@/app/(app)/actions";
import { Card } from "@/components/ui";

export function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  return (
    <Card className="px-6 py-8 text-center">
      <div className="text-[20px] font-semibold">{titulo}</div>
      <p className="mx-auto mt-2 max-w-sm text-[15px] text-label-2">{texto}</p>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await carregarExemplos();
            setErro(r.erro);
          })
        }
        className="mx-auto mt-6 flex h-11 items-center gap-2 rounded-full bg-surface-2 px-5 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60"
      >
        <Sparkles className="size-4 text-accent" />
        {pendente ? "Carregando…" : "Ver com dados de exemplo"}
      </button>
      {erro && <p className="mt-3 text-[13px] text-negative">{erro}</p>}
    </Card>
  );
}
