import "server-only";
import { AwsClient } from "aws4fetch";

// Arquivos dos clientes num armazenamento compatível com S3:
// Supabase Storage no desenvolvimento local, Cloudflare R2 em produção.
// Os arquivos nunca são públicos: só passam pelo servidor depois de checar a permissão.

let cliente: AwsClient | undefined;

function s3() {
  const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env;
  if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) throw new Error("Armazenamento de arquivos não configurado (S3_* no .env).");
  cliente ??= new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, service: "s3", region: S3_REGION || "auto" });
  return cliente;
}

/** URL no estilo path (endpoint/bucket/chave), aceito pelo R2 e pelo Supabase. */
function url(chave: string) {
  const base = process.env.S3_ENDPOINT!.replace(/\/$/, "");
  const caminho = chave.split("/").map(encodeURIComponent).join("/");
  return `${base}/${process.env.S3_BUCKET}/${caminho}`;
}

export const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20 MB por arquivo

export const TIPOS_ACEITOS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "Imagem",
  "image/png": "Imagem",
  "image/webp": "Imagem",
  "image/heic": "Imagem",
  "image/heif": "Imagem",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
};

export async function salvarArquivo(chave: string, corpo: ArrayBuffer, tipo: string) {
  const r = await s3().fetch(url(chave), { method: "PUT", body: corpo, headers: { "Content-Type": tipo } });
  if (!r.ok) throw new Error(`Falha ao salvar arquivo (${r.status}): ${await r.text()}`);
}

export async function lerArquivo(chave: string) {
  const r = await s3().fetch(url(chave), { method: "GET" });
  if (!r.ok) throw new Error(`Falha ao ler arquivo (${r.status})`);
  return r;
}

export async function apagarArquivo(chave: string) {
  const r = await s3().fetch(url(chave), { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`Falha ao apagar arquivo (${r.status})`);
}

/** Nome seguro para a chave: sem acentos, espaços ou barras. */
export function nomeSeguro(nome: string) {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  return limpo || "arquivo";
}
