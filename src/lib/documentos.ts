// Constantes de documentos usadas no servidor e no navegador.

export const PASTAS = ["Pessoais", "Renda", "Contrato", "Outros"] as const;
export type Pasta = (typeof PASTAS)[number];

/** Tipos aceitos no seletor de arquivo (o servidor valida de novo). */
export const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,application/pdf,image/*";

export function tamanhoLegivel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
