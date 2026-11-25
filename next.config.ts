import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tira o indicador de dev de cima da barra de abas do celular
  devIndicators: { position: "top-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
