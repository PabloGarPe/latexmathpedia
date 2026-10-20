import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Genera un servidor autocontenido (.next/standalone) para la imagen Docker
  output: 'standalone',

  // Deshabilitar X-Powered-By para seguridad
  poweredByHeader: false,

  // Cabeceras de seguridad. Pendiente: CSP completa con nonces para los scripts
  // (obliga a renderizar todo dinámicamente) y HSTS con includeSubDomains/preload
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

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