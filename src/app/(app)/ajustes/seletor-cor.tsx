"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card, cn } from "@/components/ui";
import { ACCENT_PRESETS, previewAccent } from "@/lib/accent";
import { salvarCor } from "../actions";

export function SeletorCor({ inicial, podeEditar }: { inicial: string; podeEditar: boolean }) {
  const [cor, setCor] = useState(inicial);
  const [erro, setErro] = useState<string>();
  const [, iniciar] = useTransition();

  const escolher = (valor: string) => {
    setCor(valor);
    previewAccent(valor);
    iniciar(async () => {
      const r = await salvarCor(valor);
      setErro(r.erro);
      if (r.erro) previewAccent(inicial);
    });
  };

  return (
    <Card className="px-5 py-5">
      <fieldset disabled={!podeEditar} className="grid grid-cols-4 gap-4 disabled:opacity-50 sm:grid-cols-8">
        <legend className="sr-only">Cor de destaque</legend>
        {ACCENT_PRESETS.map((p) => {
          const ativa = cor.toLowerCase() === p.value;
          return (
            <button key={p.value} type="button" onClick={() => escolher(p.value)} aria-label={p.name} aria-pressed={ativa} className="flex flex-col items-center gap-2">
              <span
                className={cn("grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-surface transition", ativa && "ring-2 ring-white")}
                style={{ background: p.value }}
              >
                {ativa && <Check className="size-5 text-white" strokeWidth={3} />}
              </span>
              <span className="text-[12px] text-label-2">{p.name}</span>
            </button>
          );
        })}
      </fieldset>
      <label className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4 text-[16px]">
        Outra cor
        <input
          type="color"
          value={cor}
          disabled={!podeEditar}
          onChange={(e) => {
            setCor(e.target.value);
            previewAccent(e.target.value);
          }}
          onBlur={(e) => e.target.value !== inicial && escolher(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
        />
      </label>
      {erro && <p className="mt-3 text-[13px] text-negative">{erro}</p>}
    </Card>
  );
}
