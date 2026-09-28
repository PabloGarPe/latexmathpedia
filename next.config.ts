import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Genera un servidor autocontenido (.next/standalone) para la imagen Docker
  output: 'standalone',

  // Deshabilitar X-Powered-By para seguridad
  poweredByHeader: false,

  // Configuración para componentes externos
  serverExternalPackages: [],

  // Configuración de imágenes si usas next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;