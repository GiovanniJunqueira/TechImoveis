import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { DadosResumo } from "@/components/resumo-plano";
import type { Serie } from "@/lib/plano";

// Portal do cliente: link sem senha + confirmação dos 4 últimos dígitos do CPF.
// O banco só guarda o HASH do token do link e do token da sessão (ver migração portal_cliente).
// O visitante é anônimo: tudo passa pelas funções portal_* do banco, nunca por tabelas.

export const VALIDADE_PADRAO_DIAS = 30;
export const COOKIE_SESSAO = "portal_sessao";
const SESSAO_HORAS = 12;

/** Token aleatório (256 bits) para URL. */
export const novoToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const tokenValido = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

/** URL pública do portal, a partir do domínio da requisição (ou NEXT_PUBLIC_SITE_URL). */
export function urlPortal(origem: string, token: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || origem).replace(/\/$/, "");
  return `${base}/portal/${token}`;
}

export type InfoPortal = {
  empresa: string;
  cor: string;
  corretor: string;
  pergunta: "cpf" | "nascimento" | "nenhuma";
  bloqueado: boolean;
};

export type DocumentoPortal = { id: string; nome: string; pasta: string; status: "ok" | "pendente" | "recusado"; tamanho_bytes: number | null; criado_em: string };

type VendaPortal = {
  id: string;
  status: "proposta" | "fechada" | "distrato";
  unidade: string | null;
  imovel: string | null;
  construtora: string | null;
  valor_venda_centavos: number;
  data_venda: string;
  banco: string | null;
  series: Serie[];
};

export type DadosPortal = {
  empresa: string;
  cor: string;
  expira_em: string;
  cliente: { nome: string };
  corretor: { nome: string; creci: string | null; telefone: string | null };
  vendas: VendaPortal[];
  documentos: DocumentoPortal[];
};

/** Info da tela de entrada. Nulo se o link não existe, expirou ou foi revogado. */
export async function infoPortal(token: string): Promise<InfoPortal | null> {
  if (!tokenValido(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_info", { p_link: hashToken(token) });
  return (data as InfoPortal | null) ?? null;
}

/** Confere a resposta (CPF/nascimento) e, se certa, grava o cookie da sessão. */
export async function entrarPortal(token: string, resposta: string): Promise<"ok" | "invalido" | "bloqueado" | "errado"> {
  if (!tokenValido(token)) return "invalido";
  const sessao = novoToken();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_entrar", { p_link: hashToken(token), p_resposta: resposta, p_sessao: hashToken(sessao) });
  if (error) return "invalido";
  if (data === "ok") {
    (await cookies()).set(COOKIE_SESSAO, sessao, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSAO_HORAS * 3600,
    });
  }
  return data as "ok" | "invalido" | "bloqueado" | "errado";
}

async function sessaoAtual() {
  const valor = (await cookies()).get(COOKIE_SESSAO)?.value;
  return valor && tokenValido(valor) ? valor : null;
}

/** Dados do portal para a sessão atual. Nulo se não entrou (ou a sessão/link venceu). */
export async function dadosPortal(token: string): Promise<DadosPortal | null> {
  const sessao = await sessaoAtual();
  if (!sessao || !tokenValido(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_dados", { p_link: hashToken(token), p_sessao: hashToken(sessao) });
  return (data as DadosPortal | null) ?? null;
}

/** Prefixo da chave para salvar arquivos do cliente. Nulo se a sessão não vale. */
export async function destinoPortal(token: string) {
  const sessao = await sessaoAtual();
  if (!sessao || !tokenValido(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_destino", { p_link: hashToken(token), p_sessao: hashToken(sessao) });
  return data ?? null;
}

/** Registra no banco um arquivo já salvo. Lança erro se a sessão/chave não vale ou passou do limite. */
export async function registrarDocumentoPortal(token: string, doc: { pasta: string; nome: string; chave: string; mime: string; tamanho: number }) {
  const sessao = await sessaoAtual();
  if (!sessao) throw new Error("sessao invalida");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_registrar_documento", {
    p_link: hashToken(token),
    p_sessao: hashToken(sessao),
    p_pasta: doc.pasta,
    p_nome: doc.nome,
    p_chave: doc.chave,
    p_mime: doc.mime,
    p_tamanho: doc.tamanho,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function sairPortal() {
  const jar = await cookies();
  const sessao = jar.get(COOKIE_SESSAO)?.value;
  if (sessao && tokenValido(sessao)) {
    const supabase = await createClient();
    await supabase.rpc("portal_sair", { p_sessao: hashToken(sessao) });
  }
  jar.delete(COOKIE_SESSAO);
}

/** Converte uma venda do portal para o formato do ResumoPlano (o mesmo do corretor). */
export function resumoDaVenda(d: DadosPortal, v: VendaPortal): DadosResumo {
  return {
    proposta: v.status === "proposta",
    cliente: d.cliente.nome,
    imovel: v.imovel,
    unidade: v.unidade,
    construtora: v.construtora,
    valorVenda: v.valor_venda_centavos,
    dataVenda: v.data_venda,
    banco: v.banco,
    series: v.series,
    corretor: d.corretor,
    empresa: d.empresa,
  };
}
