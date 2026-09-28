"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, MessageSquare, Github, Instagram, Twitter } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useSendMail } from "@/hooks/api/use-mail";

export default function ContactUsPage() {
    const sendMail = useSendMail();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await sendMail.mutateAsync({
                from: formData.email,
                subject: `[MathTexPedia] ${formData.subject}`,
                body: `Nombre: ${formData.name}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`,
            })
            toast.success("Mensaje enviado con éxito. ¡Gracias por contactarnos!")
            setFormData({ name: "", email: "", subject: "", message: "" })
        } catch (error) {
            toast.error("Error al enviar el mensaje. Por favor, intenta nuevamente.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <div className="bg-gradient-to-b from-primary/10 to-background border-b">
                <div className="container mx-auto px-4 py-12 md:py-16">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            Contáctanos
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground">
                            Estamos aquí para ayudarte. Envíanos tu consulta o sugerencia
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 max-w-6xl">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Envíanos un mensaje</CardTitle>
                                <CardDescription>
                                    Completa el formulario y nos pondremos en contacto contigo lo antes posible
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nombre *</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="Tu nombre"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="tu@email.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Asunto *</Label>
                                        <Input
                                            id="subject"
                                            name="subject"
                                            placeholder="¿En qué podemos ayudarte?"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message">Mensaje *</Label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            placeholder="Escribe tu mensaje aquí..."
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows={6}
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full md:w-auto cursor-pointer"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Enviando..." : "Enviar mensaje"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-6">
                        {/* Email */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Mail className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Email</CardTitle>
                                        <CardDescription>Escríbenos directamente</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <a
                                    href="mailto:mathtexpedia@mathtexpedia.es"
                                    className="text-primary hover:underline"
                                >
                                    mathtexpedia@mathtexpedia.es
                                </a>
                            </CardContent>
                        </Card>

                        {/* Social Media */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Redes Sociales</CardTitle>
                                        <CardDescription>Síguenos en nuestras redes</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <a
                                    href="https://github.com/LatexMathpedia/latexmathpedia"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                    <Github className="w-5 h-5" />
                                    <span>GitHub</span>
                                </a>
                                <a
                                    href="https://www.instagram.com/mathtexpedia.ofisial/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                    <Instagram className="w-5 h-5" />
                                    <span>Instagram</span>
                                </a>
                                <a
                                    href="https://x.com/MathsTexpedia"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                    <Twitter className="w-5 h-5" />
                                    <span>X (Twitter)</span>
                                </a>
                            </CardContent>
                        </Card>

                        {/* FAQ Card */}
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader>
                                <CardTitle className="text-lg">¿Tienes una pregunta rápida?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Revisa nuestras preguntas frecuentes antes de enviar un mensaje.
                                </p>
                                <Button variant="outline" className="w-full" asChild>
                                    <a href="/dashboard/faq">Ver FAQ</a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-12">
                    <Card>
                        <CardContent className="py-8">
                            <div className="grid md:grid-cols-3 gap-8 text-center">
                                <div>
                                    <h3 className="font-semibold mb-2">Tiempo de respuesta</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Normalmente respondemos en menos de 24-48 horas
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Soporte</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Lunes a Viernes, 9:00 - 18:00 (CET)
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Contribuciones</h3>
                                    <p className="text-sm text-muted-foreground">
                                        ¿Quieres aportar apuntes? ¡Contáctanos!
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
