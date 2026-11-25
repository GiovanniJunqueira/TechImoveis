import { NextResponse } from "next/server";
import { destinoPortal, registrarDocumentoPortal } from "@/lib/portal";
import { TAMANHO_MAXIMO, TIPOS_ACEITOS, apagarArquivo, nomeSeguro, salvarArquivo } from "@/lib/arquivos";
import { PASTAS } from "@/lib/documentos";

// lib/portal usa node:crypto.
export const runtime = "nodejs";

const MAX_ARQUIVOS = 10;

// Resposta nunca vai para cache (é de uma sessão do cliente). Nunca registrar o token em log.
const json = (corpo: object, status = 200) => NextResponse.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });

/** Envio de documentos pelo CLIENTE no portal (multipart: pasta, arquivos). Ficam "pendente" para o corretor revisar. */
export async function POST(request: Request, { params }: RouteContext<"/api/portal/[token]/documentos">) {
  const { token } = await params;
  const destino = await destinoPortal(token);
  if (!destino) return json({ erro: "Sua sessão terminou. Entre de novo." }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ erro: "Envio inválido." }, 400);
  }
  const pastaEnviada = String(form.get("pasta") ?? "");
  const pasta = (PASTAS as readonly string[]).includes(pastaEnviada) ? pastaEnviada : "Outros";
  const arquivos = form.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);

  if (arquivos.length === 0) return json({ erro: "Escolha ao menos um arquivo." }, 400);
  if (arquivos.length > MAX_ARQUIVOS) return json({ erro: `Envie até ${MAX_ARQUIVOS} arquivos por vez.` }, 400);
  for (const f of arquivos) {
    if (f.size > TAMANHO_MAXIMO) return json({ erro: `"${f.name}" passa de 20 MB.` }, 400);
    if (!TIPOS_ACEITOS[f.type]) return json({ erro: `"${f.name}": envie PDF, foto, Word ou Excel.` }, 400);
  }

  const enviados: string[] = [];
  for (const f of arquivos) {
    const chave = `${destino}${crypto.randomUUID()}-${nomeSeguro(f.name)}`;
    try {
      await salvarArquivo(chave, await f.arrayBuffer(), f.type);
    } catch (e) {
      console.error("portal: falha ao salvar arquivo", e instanceof Error ? e.message : e);
      return json({ erro: `Não foi possível enviar "${f.name}".`, enviados }, 502);
    }
    try {
      await registrarDocumentoPortal(token, { pasta, nome: f.name, chave, mime: f.type, tamanho: f.size });
    } catch (e) {
      await apagarArquivo(chave).catch(() => {});
      const limite = e instanceof Error && e.message.includes("limite diario");
      return json({ erro: limite ? "Limite de envios do dia atingido." : `Não foi possível registrar "${f.name}".`, enviados }, limite ? 429 : 500);
    }
    enviados.push(f.name);
  }

  return json({ enviados });
}
