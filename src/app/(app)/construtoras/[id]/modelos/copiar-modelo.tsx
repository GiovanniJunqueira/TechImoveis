"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { copiarModeloSistema } from "../../actions";

/** Copia o modelo do sistema para a conta do corretor (a action redireciona para a cópia). */
export function CopiarModelo({ construtoraId, modeloId }: { construtoraId: string; modeloId: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await copiarModeloSistema(construtoraId, modeloId);
            setErro(r?.erro);
          })
        }
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-accent text-[17px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        <Copy className="size-5" />
        {pendente ? "Copiando…" : "Copiar para minha conta"}
      </button>
      {erro && <p className="text-center text-[13px] text-negative">{erro}</p>}
    </div>
  );
}
