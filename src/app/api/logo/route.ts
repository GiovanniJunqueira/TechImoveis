import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/dal";
import { apagarArquivo, salvarArquivo } from "@/lib/arquivos";

const TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB

/** Tipos aceitos para o logo. SVG fica de fora (pode carregar script). */
const EXTENSAO: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Confere a assinatura do arquivo, não só o tipo informado pelo navegador. */
function tipoReal(b: Uint8Array): string | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  const ascii = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  return null;
}

/** Chave no armazenamento a partir do logo_url salvo (`/api/logo/{tenant}/{arquivo}`). */
function chaveDoLogo(tenantId: string, logoUrl: string | null) {
  const m = logoUrl?.match(/^\/api\/logo\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:png|jpg|webp))$/i);
  if (!m || m[1] !== tenantId) return null;
  return `tenants/${tenantId}/logo/${m[2]}`;
}

async function apagarAnterior(chave: string | null) {
  if (!chave) return;
  try {
    await apagarArquivo(chave);
  } catch (e) {
    console.error(e); // Fica um arquivo órfão, mas o logo novo já está valendo.
  }
}

/** Envia (ou troca) o logo do corretor. multipart com o campo "arquivo". */
export async function POST(request: NextRequest) {
  const { supabase, tenant, papel } = await getContexto();
  if (papel !== "dono") return NextResponse.json({ erro: "Só o dono da conta pode mudar o logo." }, { status: 403 });

  let arquivo: FormDataEntryValue | null;
  try {
    arquivo = (await request.formData()).get("arquivo");
  } catch {
    return NextResponse.json({ erro: "Envio inválido." }, { status: 400 });
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) return NextResponse.json({ erro: "Escolha uma imagem." }, { status: 400 });
  if (arquivo.size > TAMANHO_MAXIMO) return NextResponse.json({ erro: "O logo pode ter no máximo 2 MB." }, { status: 400 });

  const corpo = await arquivo.arrayBuffer();
  const tipo = tipoReal(new Uint8Array(corpo.slice(0, 12)));
  if (!tipo) return NextResponse.json({ erro: "Use uma imagem PNG, JPEG ou WebP." }, { status: 400 });

  const nome = `${crypto.randomUUID()}.${EXTENSAO[tipo]}`;
  const chave = `tenants/${tenant.id}/logo/${nome}`;
  try {
    await salvarArquivo(chave, corpo, tipo);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "Não foi possível salvar o logo. Tente de novo." }, { status: 502 });
  }

  const logoUrl = `/api/logo/${tenant.id}/${nome}`;
  const { error } = await supabase.from("tenants").update({ logo_url: logoUrl }).eq("id", tenant.id);
  if (error) {
    await apagarAnterior(chave);
    return NextResponse.json({ erro: "Não foi possível salvar o logo. Tente de novo." }, { status: 500 });
  }

  await apagarAnterior(chaveDoLogo(tenant.id, tenant.logo_url));
  revalidatePath("/", "layout");
  return NextResponse.json({ logoUrl });
}

/** Remove o logo. */
export async function DELETE() {
  const { supabase, tenant, papel } = await getContexto();
  if (papel !== "dono") return NextResponse.json({ erro: "Só o dono da conta pode mudar o logo." }, { status: 403 });

  const { error } = await supabase.from("tenants").update({ logo_url: null }).eq("id", tenant.id);
  if (error) return NextResponse.json({ erro: "Não foi possível remover o logo." }, { status: 500 });

  await apagarAnterior(chaveDoLogo(tenant.id, tenant.logo_url));
  revalidatePath("/", "layout");
  return NextResponse.json({ logoUrl: null });
}
