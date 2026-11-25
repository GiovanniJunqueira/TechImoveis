import { NextResponse, type NextRequest } from "next/server";
import { getContexto } from "@/lib/dal";
import { lerArquivo } from "@/lib/arquivos";

/** Abre (ou baixa, com ?baixar=1) um documento, depois de checar que é do tenant do usuário. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Não encontrado", { status: 404 });

  const { supabase, tenant } = await getContexto();
  const { data: doc } = await supabase
    .from("documentos")
    .select("nome, mime, chave_arquivo")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (!doc) return new NextResponse("Não encontrado", { status: 404 });

  let arquivo: Response;
  try {
    arquivo = await lerArquivo(doc.chave_arquivo);
  } catch (e) {
    console.error(e);
    return new NextResponse("Arquivo indisponível", { status: 502 });
  }

  const baixar = request.nextUrl.searchParams.has("baixar");
  const nome = encodeURIComponent(doc.nome);
  return new NextResponse(arquivo.body, {
    headers: {
      "Content-Type": doc.mime ?? "application/octet-stream",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename*=UTF-8''${nome}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Arquivo enviado por usuário: nunca roda script na origem do app.
      // (O visualizador de PDF do Chrome não abre com sandbox; o tipo fixo + nosniff já impede HTML.)
      ...(doc.mime === "application/pdf" ? {} : { "Content-Security-Policy": "sandbox" }),
    },
  });
}
