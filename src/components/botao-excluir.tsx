"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { EstadoForm } from "@/app/(auth)/actions";
import { cn } from "@/components/ui";

/**
 * Botão de exclusão em dois toques: o primeiro pede confirmação, o segundo exclui.
 * Evita diálogo nativo (feio no celular) e exclusão acidental.
 */
export function BotaoExcluir({
  acao,
  rotulo,
  confirmacao,
  className,
}: {
  acao: () => Promise<EstadoForm | void>;
  rotulo: string;
  confirmacao: string;
  className?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {confirmando && <p className="px-1 text-center text-[13px] text-label-2">{confirmacao}</p>}
      <div className="flex gap-2">
        {confirmando && (
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="h-[50px] flex-1 rounded-full bg-surface-2 text-[17px] font-semibold transition active:scale-[0.98]"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          disabled={pendente}
          onClick={() => {
            if (!confirmando) return setConfirmando(true);
            iniciar(async () => {
              const r = await acao();
              if (r?.erro) {
                setErro(r.erro);
                setConfirmando(false);
              }
            });
          }}
          className={cn(
            "flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-60",
            confirmando ? "bg-negative text-white" : "bg-surface text-negative",
          )}
        >
          <Trash2 className="size-[18px]" />
          {pendente ? "Excluindo…" : confirmando ? "Confirmar" : rotulo}
        </button>
      </div>
      {erro && <p className="text-center text-[13px] text-negative">{erro}</p>}
    </div>
  );
}
