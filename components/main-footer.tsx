"use client"
import { Github, Instagram, Linkedin, Mail, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { showCookieSettings } from '@/lib/cookie-consent';

export function MainFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t bg-sidebar">
            <div className="container mx-auto px-4 py-12 md:py-16">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center space-x-3 group w-fit">
                            <img 
                                src="/icon.png" 
                                alt="MathTexpedia Logo" 
                                className="w-10 h-8 rounded-lg transition-transform group-hover:scale-105"
                            />
                            <span className="font-bold text-xl text-foreground">MathTexpedia</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            Tu plataforma educativa para aprender matemáticas con recursos de calidad y explicaciones claras.
                        </p>
                        
                        {/* Social Links */}
                        <div className="flex items-center space-x-2 pt-2">
                            <a 
                                href="https://github.com/LatexMathpedia/latexmathpedia" 
                                className="p-2 rounded-lg hover:bg-accent transition-colors" 
                                aria-label="GitHub Repository" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                            <a 
                                href="https://www.instagram.com/mathtexpedia.ofisial/" 
                                className="p-2 rounded-lg hover:bg-accent transition-colors" 
                                aria-label="Instagram Profile" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a 
                                href="https://x.com/MathsTexpedia" 
                                className="p-2 rounded-lg hover:bg-accent transition-colors" 
                                aria-label="X Profile" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                            </a>
                            <a 
                                href="https://linktr.ee/mathtexpedia" 
                                className="p-2 rounded-lg hover:bg-accent transition-colors" 
                                aria-label="LinkTree Profile" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <LinkIcon className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Resources Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base text-foreground">Recursos</h3>
                        <nav className="flex flex-col space-y-2.5 text-sm">
                            <Link href="/dashboard/blog" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Blog
                            </Link>
                            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                PDFs
                            </Link>
                            <Link href="/dashboard/profile" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Mi Perfil
                            </Link>
                        </nav>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base text-foreground">Contacto</h3>
                        <nav className="flex flex-col space-y-2.5 text-sm">
                            <Link href="/dashboard/contact/about-us" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Sobre Nosotros
                            </Link>
                            <Link href="/dashboard/contact/contact-us" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Contáctanos
                            </Link>
                            <Link href="/dashboard/contact/faq" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                FAQ
                            </Link>
                        </nav>
                    </div>

                    {/* Legal Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base text-foreground">Legal</h3>
                        <nav className="flex flex-col space-y-2.5 text-sm">
                            <Link href="/dashboard/legal/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Política de Privacidad
                            </Link>
                            <Link href="/dashboard/legal/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Términos de Servicio
                            </Link>
                            <Link href="/dashboard/legal/cookies-policy" className="text-muted-foreground hover:text-foreground transition-colors w-fit">
                                Política de Cookies
                            </Link>
                            <button type="button" onClick={showCookieSettings} className="text-muted-foreground hover:text-foreground transition-colors w-fit cursor-pointer">
                                Configurar cookies
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border"></div>

                {/* Bottom Footer */}
                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© {currentYear} MathTexpedia. Todos los derechos reservados.</p>
                    <p className="flex items-center gap-2">
                        Hecho por y para la comunidad de matemáticas
                    </p>
                </div>
            </div>
        </footer>
    )
};
