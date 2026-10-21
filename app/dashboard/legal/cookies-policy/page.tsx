"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cookie, Info, Settings, Shield, CheckCircle, XCircle, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function CookiesPolicyPage() {
  const lastUpdated = "21 de octubre de 2026"

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Cookie className="w-12 h-12 mx-auto text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Política de Cookies
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Información sobre el uso de cookies en MathTexpedia
            </p>
            <p className="text-sm text-muted-foreground">
              Última actualización: {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Introduction */}
        <section className="mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Esta Política de Cookies explica qué son las cookies, cómo las utilizamos en MathTexpedia, 
                qué tipos de cookies empleamos y cómo puedes controlarlas. Te recomendamos leer esta política 
                para comprender mejor nuestra práctica con respecto a las cookies.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Quick Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Resumen Rápido</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <Info className="w-6 h-6 mb-2 text-primary" />
                <CardTitle className="text-base">Transparencia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Te informamos claramente sobre todas las cookies que utilizamos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Settings className="w-6 h-6 mb-2 text-primary" />
                <CardTitle className="text-base">Control Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Puedes gestionar o rechazar las cookies desde tu navegador
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="w-6 h-6 mb-2 text-primary" />
                <CardTitle className="text-base">Tu Privacidad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Las cookies esenciales protegen tu sesión y privacidad
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Detailed Sections */}
        <div className="space-y-8">
          {/* Qué son las Cookies */}
          <Card>
            <CardHeader>
              <Cookie className="w-6 h-6 mb-2 text-primary" />
              <CardTitle className="text-xl">1. ¿Qué son las Cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              <p className="text-muted-foreground">
                Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet 
                o móvil) cuando visitas un sitio web. Estas cookies permiten que el sitio web recuerde tus acciones 
                y preferencias durante un período de tiempo.
              </p>
              <p className="text-muted-foreground">
                Las cookies pueden ser de "sesión" (se eliminan al cerrar el navegador) o "persistentes" 
                (permanecen en tu dispositivo durante un tiempo determinado o hasta que las elimines).
              </p>
            </CardContent>
          </Card>

          {/* Cómo Usamos las Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. ¿Cómo Usamos las Cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              <p className="text-muted-foreground">
                En MathTexpedia utilizamos cookies para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Mantener tu sesión activa cuando inicias sesión</li>
                <li>Recordar tus preferencias y configuraciones (como el tema oscuro/claro)</li>
                <li>Entender cómo utilizas nuestro sitio para mejorarlo</li>
                <li>Proporcionar funcionalidades básicas del sitio</li>
                <li>Garantizar la seguridad de tu cuenta</li>
              </ul>
            </CardContent>
          </Card>

          {/* Tipos de Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">3. Tipos de Cookies que Utilizamos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm md:text-base">
              {/* Cookies Esenciales */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">Cookies Esenciales (Necesarias)</h3>
                  <Badge variant="secondary">Siempre Activas</Badge>
                </div>
                <p className="text-muted-foreground mb-2">
                  Estas cookies son imprescindibles para el funcionamiento del sitio web y no se pueden 
                  desactivar. Sin ellas, servicios básicos como la autenticación no funcionarían.
                </p>
                <div className="bg-muted/50 p-3 rounded-md mt-2">
                  <p className="text-sm font-medium mb-2">Ejemplos:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>auth-token:</strong> Mantiene tu sesión de usuario activa</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Duración:</strong> Sesión o hasta 30 días
                  </p>
                </div>
              </div>

              {/* Cookies de Funcionalidad */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Cookies de Funcionalidad</h3>
                  <Badge variant="outline">Opcional</Badge>
                </div>
                <p className="text-muted-foreground mb-2">
                  Estas cookies permiten que el sitio recuerde tus elecciones para proporcionar una experiencia 
                  personalizada.
                </p>
                <div className="bg-muted/50 p-3 rounded-md mt-2">
                  <p className="text-sm font-medium mb-2">Ejemplos:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>sidebar-state:</strong> Recuerda si la barra lateral está abierta o cerrada</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Duración:</strong> Hasta 1 año
                  </p>
                </div>
              </div>

              {/* Cookies Analíticas */}
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold">Cookies Analíticas</h3>
                  <Badge variant="outline">Opcional</Badge>
                </div>
                <p className="text-muted-foreground mb-2">
                  Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web, proporcionándonos 
                  información sobre las áreas visitadas, el tiempo de permanencia y los problemas encontrados.
                </p>
                <div className="bg-muted/50 p-3 rounded-md mt-2">
                  <p className="text-sm font-medium mb-2">Servicios utilizados:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Vercel Analytics:</strong> Análisis de rendimiento y uso del sitio</li>
                    <li>• Datos agregados y anónimos</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Duración:</strong> Hasta 2 años
                  </p>
                </div>
              </div>

              {/* Cookies de Publicidad */}
              <div className="border-l-4 border-orange-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold">Cookies de Publicidad</h3>
                  <Badge variant="outline">Opcional</Badge>
                </div>
                <p className="text-muted-foreground mb-2">
                  Utilizadas para mostrar anuncios relevantes. Estas cookies pueden rastrear tu comportamiento 
                  de navegación.
                </p>
                <div className="bg-muted/50 p-3 rounded-md mt-2">
                  <p className="text-sm font-medium mb-2">Servicios utilizados:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Google AdSense:</strong> Publicidad contextual</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Duración:</strong> Hasta 2 años
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Puedes optar por no recibir publicidad personalizada visitando{" "}
                    <a 
                      href="https://www.google.com/settings/ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Ads Settings
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies de Terceros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">4. Cookies de Terceros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              <p className="text-muted-foreground">
                Algunos de nuestros servicios utilizan cookies establecidas por terceros. Estas son las 
                principales:
              </p>
              <div className="space-y-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Google AdSense</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Utilizado para mostrar anuncios contextuales en nuestro sitio.
                  </p>
                  <a 
                    href="https://policies.google.com/technologies/ads" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver política de cookies de Google →
                  </a>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Vercel Analytics</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Proporciona análisis de rendimiento sin rastrear información personal.
                  </p>
                  <a 
                    href="https://vercel.com/docs/analytics/privacy-policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver política de privacidad de Vercel →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cómo Gestionar las Cookies */}
          <Card>
            <CardHeader>
              <Settings className="w-6 h-6 mb-2 text-primary" />
              <CardTitle className="text-xl">5. Cómo Gestionar y Eliminar Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm md:text-base">
              <div>
                <h3 className="font-semibold mb-2">Desde tu Navegador</h3>
                <p className="text-muted-foreground mb-2">
                  Puedes configurar tu navegador para rechazar todas las cookies o para indicar cuándo se 
                  envía una cookie. Sin embargo, si no aceptas cookies, es posible que no puedas utilizar 
                  todas las funciones de nuestro sitio.
                </p>
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium">Guías para gestionar cookies:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>
                      • <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Google Chrome
                      </a>
                    </li>
                    <li>
                      • <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Mozilla Firefox
                      </a>
                    </li>
                    <li>
                      • <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Safari
                      </a>
                    </li>
                    <li>
                      • <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Microsoft Edge
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Navegación Privada</h3>
                <p className="text-muted-foreground">
                  La mayoría de los navegadores ofrecen un modo de navegación privada que no guarda cookies 
                  persistentes. Ten en cuenta que algunas funcionalidades pueden no estar disponibles en este modo.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actualizaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">6. Actualizaciones de esta Política</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              <p className="text-muted-foreground">
                Podemos actualizar esta Política de Cookies ocasionalmente para reflejar cambios en las 
                tecnologías que utilizamos o por requisitos legales. Te notificaremos de cualquier cambio 
                significativo publicando la nueva política en esta página con una fecha de actualización revisada.
              </p>
              <p className="text-muted-foreground">
                Te recomendamos revisar esta página periódicamente para estar informado sobre cómo protegemos 
                tu información.
              </p>
            </CardContent>
          </Card>

          {/* Consentimiento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">7. Tu Consentimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              <p className="text-muted-foreground">
                Las cookies esenciales se utilizan siempre, ya que son necesarias para el funcionamiento del
                sitio. Las cookies no técnicas, como las de publicidad de Google AdSense, solo se utilizan si
                las aceptas en el aviso de cookies que se muestra al visitar el sitio.
              </p>
              <p className="text-muted-foreground">
                Puedes cambiar o retirar tu consentimiento en cualquier momento desde el enlace
                “Configurar cookies”, en el pie de página.
              </p>
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <Mail className="w-6 h-6 mb-2 text-primary" />
              <CardTitle className="text-xl">8. Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm md:text-base">
              <p className="text-muted-foreground">
                Si tienes preguntas sobre nuestra Política de Cookies, puedes <Link href="/dashboard/contact/contact-us" className="text-primary hover:underline">contactarnos</Link>:
              </p>
              <div className="bg-background p-4 rounded-lg border space-y-2">
                <p className="font-semibold">MathTexpedia</p>
                <p className="text-muted-foreground">
                  Email:{" "}
                  <a href="mailto:mathtexpedia@mathtexpedia.es" className="text-primary hover:underline">
                    mathtexpedia@mathtexpedia.es
                  </a>
                </p>
                <p className="text-muted-foreground">
                  Universidad de Oviedo, Asturias, España
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
