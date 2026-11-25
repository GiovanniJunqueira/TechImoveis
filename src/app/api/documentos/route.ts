import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/dal";
import { TAMANHO_MAXIMO, TIPOS_ACEITOS, apagarArquivo, nomeSeguro, salvarArquivo } from "@/lib/arquivos";
import { PASTAS } from "@/lib/documentos";

/** Envio de documentos de um cliente pelo corretor (multipart: cliente_id, pasta, arquivos). */
export async function POST(request: NextRequest) {
  const { supabase, tenant } = await getContexto();
  const form = await request.formData();
  const clienteId = String(form.get("cliente_id") ?? "");
  const pastaEnviada = String(form.get("pasta") ?? "");
  const pasta = (PASTAS as readonly string[]).includes(pastaEnviada) ? pastaEnviada : "Outros";
  const arquivos = form.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);

  // O RLS garante que só acha cliente do próprio tenant.
  const { data: cliente } = await supabase.from("clientes").select("id").eq("tenant_id", tenant.id).eq("id", clienteId).maybeSingle();
  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  if (arquivos.length === 0) return NextResponse.json({ erro: "Escolha ao menos um arquivo." }, { status: 400 });

  for (const f of arquivos) {
    if (f.size > TAMANHO_MAXIMO) return NextResponse.json({ erro: `"${f.name}" passa de 20 MB.` }, { status: 400 });
    if (!TIPOS_ACEITOS[f.type]) return NextResponse.json({ erro: `"${f.name}": envie PDF, imagem, Word ou Excel.` }, { status: 400 });
  }

  const enviados: string[] = [];
  for (const f of arquivos) {
    const chave = `tenants/${tenant.id}/clientes/${cliente.id}/${crypto.randomUUID()}-${nomeSeguro(f.name)}`;
    try {
      await salvarArquivo(chave, await f.arrayBuffer(), f.type);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ erro: `Não foi possível enviar "${f.name}".`, enviados }, { status: 502 });
    }
    const { error } = await supabase.from("documentos").insert({
      tenant_id: tenant.id,
      cliente_id: cliente.id,
      pasta,
      nome: f.name.slice(0, 200),
      chave_arquivo: chave,
      mime: f.type,
      tamanho_bytes: f.size,
      enviado_por: "corretor",
      status: "ok",
    });
    if (error) {
      await apagarArquivo(chave).catch(() => {});
      return NextResponse.json({ erro: `Não foi possível registrar "${f.name}".`, enviados }, { status: 500 });
    }
    enviados.push(f.name);
  }

  revalidatePath(`/clientes/${cliente.id}`);
  return NextResponse.json({ enviados });
}
