import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathTexpedia | Apuntes de Informática y Matemáticas - UniOvi",
  description:
    "Repositorio de apuntes de carrera universitaria en informática y matemáticas en la Universidad de Oviedo. Recursos claros, organizados y actualizados para estudiantes.",
  keywords: [
    "MathTexpedia",
    "apuntes universidad",
    "informática",
    "matemáticas",
    "Universidad de Oviedo",
    "recursos académicos",
    "ingeniería informática",
    "ciencia de datos",
    "álgebra",
    "cálculo",
    "estadística",
    "machine learning",
    "teoría de la computación",
    "uniovi",
    "Oviedo",
    "apuntes LaTeX",
    "apuntes PDF",
    "estudios universitarios",
    "recursos para estudiantes",
    "apuntes gratuitos",
    "material de estudio",
  ],
  authors: [
    { name: "Diego Díaz Mendaña", url: "https://diego-diaz-mendana.web.app/" },
    {
      name: "Pablo García Pernas",
      url: "https://www.linkedin.com/in/pablo-garc%C3%ADa-pernas-873630352/",
    },
  ],
  metadataBase: new URL("https://mathtexpedia.es"),
  creator: "MathTexpedia",
  publisher: "MathTexpedia",
  alternates: {
    canonical: "https://mathtexpedia.es",
  },
  openGraph: {
    title: "MathTexpedia | Apuntes de Informática y Matemáticas - UniOvi",
    description:
      "Repositorio de apuntes de carrera universitaria en informática y matemáticas en la Universidad de Oviedo. Recursos claros, organizados y actualizados para estudiantes.",
    url: "https://mathtexpedia.es",
    siteName: "MathTexpedia",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "/icon-meta.png",
        width: 1200,
        height: 630,
        alt: "MathTexpedia Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MathTexpedia | Apuntes de Informática y Matemáticas - UniOvi",
    description:
      "Repositorio de apuntes de carrera universitaria en informática y matemáticas en la Universidad de Oviedo. Recursos claros, organizados y actualizados para estudiantes.",
    images: ["/icon-meta.png"],
    creator: "@MathsTexpedia",
    site: "@MathsTexpedia",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon-meta.png",
    apple: "/icon-apple.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/icon-apple.png",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "education",
  applicationName: "MathTexpedia",
  formatDetection: {
    email: true,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta
          name="google-adsense-account"
          content="ca-pub-6477110291995241"
        ></meta>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-apple.png" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta
          property="og:image:secure_url"
          content="https://mathtexpedia.es/icon-meta.png"
        />
        <meta
          property="og:image"
          content="https://mathtexpedia.es/icon-meta.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="MathTexpedia Logo" />
        <meta
          name="twitter:image"
          content="https://mathtexpedia.es/icon-meta.png"
        />
        <meta name="twitter:image" content="https://mathtexpedia.es/icon-meta.png" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6477110291995241"
     crossOrigin="anonymous"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 5000,
            className:
              "!bg-popover !text-popover-foreground border border-border shadow-lg rounded-lg",
            success: {
              className:
                "!bg-popover !text-popover-foreground border-l-4 !border-l-green-500 border border-border shadow-lg rounded-lg",
              iconTheme: {
                primary: "hsl(var(--chart-2))",
                secondary: "hsl(var(--background))",
              },
            },
            error: {
              className:
                "!bg-popover !text-popover-foreground border-l-4 !border-l-destructive border border-border shadow-lg rounded-lg",
              iconTheme: {
                primary: "hsl(var(--destructive))",
                secondary: "hsl(var(--background))",
              },
            },
            loading: {
              className:
                "!bg-popover !text-popover-foreground border-l-4 !border-l-muted-foreground border border-border shadow-lg rounded-lg",
              iconTheme: {
                primary: "hsl(var(--muted-foreground))",
                secondary: "hsl(var(--background))",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
