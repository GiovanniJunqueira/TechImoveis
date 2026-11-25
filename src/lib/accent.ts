export const ACCENT_PRESETS = [
  { name: "Azul", value: "#0a84ff" },
  { name: "Índigo", value: "#5e5ce6" },
  { name: "Roxo", value: "#bf5af2" },
  { name: "Rosa", value: "#ff375f" },
  { name: "Laranja", value: "#ff9f0a" },
  { name: "Ciano", value: "#64d2ff" },
  { name: "Menta", value: "#63e6be" },
  { name: "Dourado", value: "#d4af37" },
] as const;

/** Mostra a nova cor na hora, antes de salvar no servidor. */
export function previewAccent(value: string) {
  document.getElementById("app-root")?.style.setProperty("--accent", value);
}
