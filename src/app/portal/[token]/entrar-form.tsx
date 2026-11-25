"use client";

import { useActionState, useState } from "react";
import { entrar, type EstadoEntrada } from "./actions";

/** Confirmação de identidade: 4 últimos dígitos do CPF ou data de nascimento. */
export function EntrarForm({ token, pergunta }: { token: string; pergunta: "cpf" | "nascimento" }) {
  const [estado, acao, pendente] = useActionState<EstadoEntrada, FormData>(entrar.bind(null, token), undefined);
  const [valor, setValor] = useState("");

  // Nascimento: o input de data devolve AAAA-MM-DD; o banco compara com DDMMAAAA.
  const resposta = pergunta === "nascimento" ? valor.split("-").reverse().join("") : valor;
  const completo = pergunta === "nascimento" ? /^\d{8}$/.test(resposta) : /^\d{4}$/.test(resposta);

  return (
    <form action={acao} className="mt-6">
      <input type="hidden" name="resposta" value={resposta} />
      <label htmlFor="portal-resposta" className="sr-only">
        {pergunta === "cpf" ? "4 últimos dígitos do CPF" : "Data de nascimento"}
      </label>
      {pergunta === "cpf" ? (
        <input
          id="portal-resposta"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          autoFocus
          placeholder="0000"
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="h-16 w-full rounded-2xl border border-neutral-200 bg-neutral-50 text-center text-[32px] font-semibold tracking-[0.5em] tabular-nums text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-[var(--accent)] focus:bg-white"
        />
      ) : (
        <input
          id="portal-resposta"
          type="date"
          autoComplete="off"
          max={new Date().toISOString().slice(0, 10)}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="h-16 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-center text-[22px] font-semibold text-neutral-900 outline-none focus:border-[var(--accent)] focus:bg-white"
        />
      )}
      {estado?.erro && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center text-[15px] text-red-700">
          {estado.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={!completo || pendente}
        className="mt-4 h-[54px] w-full rounded-full bg-[var(--accent)] text-[17px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {pendente ? "Conferindo…" : "Entrar"}
      </button>
    </form>
  );
}
