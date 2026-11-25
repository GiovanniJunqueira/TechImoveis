import { NextResponse } from "next/server";
import { lerArquivo } from "@/lib/arquivos";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const TIPO: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/**
 * Logo do corretor, público (é a marca dele, aparece no portal do cliente).
 * A chave tem um uuid aleatório, então não dá para adivinhar; e cada envio gera
 * um nome novo, por isso o cache pode ser eterno.
 */
export async function GET(_: Request, ctx: RouteContext<"/api/logo/[tenant]/[arquivo]">) {
  const { tenant, arquivo } = await ctx.params;
  const m = arquivo.match(new RegExp(`^${UUID}\.(png|jpg|webp)$`));
  if (!new RegExp(`^${UUID}$`).test(tenant) || !m) return new NextResponse("Não encontrado", { status: 404 });

  let r: Response;
  try {
    r = await lerArquivo(`tenants/${tenant}/logo/${arquivo}`);
  } catch {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  return new NextResponse(r.body, {
    headers: {
      "Content-Type": TIPO[m[1]!]!,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
