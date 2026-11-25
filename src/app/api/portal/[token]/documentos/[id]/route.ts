import { NextResponse, type NextRequest } from "next/server";
import { documentoPortal } from "@/lib/portal";
import { lerArquivo } from "@/lib/arquivos";

// lib/portal usa node:crypto.
export const runtime = "nodejs";

const naoEncontrado = () => new NextResponse("Não encontrado", { status: 404, headers: { "Cache-Control": "private, no-store" } });

/**
 * Cliente no portal abre (ou baixa, com ?baixar=1) um documento: só os que ele enviou ou que
 * o corretor liberou. A função portal_documento confere a sessão e o cliente.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/portal/[token]/documentos/[id]">) {
  const { token, id } = await ctx.params;
  const doc = await documentoPortal(token, id);
  if (!doc) return naoEncontrado();

  let arquivo: Response;
  try {
    arquivo = await lerArquivo(doc.chave_arquivo);
  } catch (e) {
    console.error(e);
    return new NextResponse("Arquivo indisponível", { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }

  const baixar = request.nextUrl.searchParams.has("baixar");
  const nome = encodeURIComponent(doc.nome);
  return new NextResponse(arquivo.body, {
    headers: {
      "Content-Type": doc.mime ?? "application/octet-stream",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename*=UTF-8''${nome}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      // Arquivo enviado por usuário: nunca roda script na origem do app.
      ...(doc.mime === "application/pdf" ? {} : { "Content-Security-Policy": "sandbox" }),
    },
  });
}
