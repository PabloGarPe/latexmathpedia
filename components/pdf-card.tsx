import { CalendarIcon, EyeIcon, FileIcon, ThumbsUp, UserRound } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import { positiveRatio, ratingVotes } from "@/lib/pdf-rating";
import { formatCompactCount } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PDFCardProps = {
    title: string;
    href: string;
    date: string;
    subjectName?: string;
    subjectUnitName?: string;
    // Ya formateado ("Autor, con Coautor y Coautor"); vacío si el PDF no tiene autores.
    authors?: string;
    // Vistas totales (todos los usuarios); se muestra en compacto a partir de 1000.
    viewCount?: number;
    // Votos 👍/👎 del PDF. Solo se pinta el % de 👍 (nunca `score`) y a partir de MIN_VOTES_TO_SHOW votos.
    rating?: { likeCount: number; dislikeCount: number };
}

function PDFCard({ title, href, date, subjectName, subjectUnitName, authors, viewCount = 0, rating }: PDFCardProps) {
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const router = useRouter();

    // Función para procesar el título y separarlo en partes
    const getTitleParts = () => {
        // Primero verificamos si contiene palabras clave especiales como "Completos"
        const specialKeywords = ['Completos', 'completos'];
        let mainPart = '';
        let secondaryPart = '';
        let tertiaryPart = '';

        // Verificar si hay palabras clave especiales
        for (const keyword of specialKeywords) {
            if (title.includes(keyword)) {
                // Extraer el texto antes de la palabra clave como parte principal
                const index = title.indexOf(keyword);
                mainPart = title.substring(0, index).trim();
                secondaryPart = keyword;
                break;
            }
        }

        // Si no hay palabras clave especiales, dividir por guiones
        if (!mainPart) {
            const parts = title.split('-').map(part => part.trim());
            mainPart = parts[0] || '';
            secondaryPart = parts.length > 1 ? parts[1] : '';
            tertiaryPart = parts.length > 2 ? parts.slice(2).join(' - ') : '';
        }

        return {
            main: mainPart,
            secondary: secondaryPart,
            tertiary: tertiaryPart
        };
    };

    const titleParts = getTitleParts();

    const likePercent = positiveRatio(rating);
    const ratingLabel = likePercent === null
        ? ""
        : `${likePercent} % de valoraciones positivas (${ratingVotes(rating)} ${ratingVotes(rating) === 1 ? "voto" : "votos"})`;

    const generateBackgroundColor = () => {
        const colors = [
            'bg-blue-100 dark:bg-blue-900',
            'bg-green-100 dark:bg-green-900',
            'bg-purple-100 dark:bg-purple-900',
            'bg-yellow-100 dark:bg-yellow-900',
            'bg-red-100 dark:bg-red-900',
            'bg-indigo-100 dark:bg-indigo-900',
            'bg-pink-100 dark:bg-pink-900',
        ];

        // Usar la asignatura si está disponible, de lo contrario usar el título
        const textToUse = subjectName || title;
        const index = textToUse.charCodeAt(0) % colors.length;
        return colors[index];
    };

    function handleClick(e: React.MouseEvent) {
        if (!isAuthenticated) {
            e.preventDefault();
            toast.error("Debes iniciar sesión para acceder a los archivos PDF. Los blogs son de acceso libre.");
            router.push(`/auth/login?redirect=${encodeURIComponent(href)}`);
        }
    }

    return (
        <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`relative h-36 w-full overflow-hidden grid place-items-center ${generateBackgroundColor()} pdf-card-preview`}>
                <div className="flex flex-col items-center justify-center text-center p-4 h-full w-full">
                    <FileIcon className="mb-2 h-6 w-6" />
                    {titleParts.main && (
                        <div className="pdf-title-main text-sm">{titleParts.main}</div>
                    )}
                    {titleParts.secondary && (
                        <div className="pdf-title-secondary text-xs mt-1">{titleParts.secondary}</div>
                    )}
                    {titleParts.tertiary && (
                        <div className="pdf-title-tertiary text-xs mt-1">{titleParts.tertiary}</div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-2 line-clamp-2 text-base font-medium transition-colors group-hover:text-primary">{title}</h3>

                {(subjectName || subjectUnitName) && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        {subjectName && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {subjectName}
                            </span>
                        )}
                        {subjectUnitName && (
                            <span className="text-xs bg-secondary/10 text-primary px-2 py-0.5 rounded-full">
                                {subjectUnitName}
                            </span>
                        )}
                    </div>
                )}

                {authors && (
                    <div className="mb-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <UserRound className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{authors}</span>
                    </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span className="text-sm">{date}</span>
                    </div>
                    <div
                        className="flex items-center gap-1.5"
                        title={`${viewCount} ${viewCount === 1 ? "vista" : "vistas"}`}
                    >
                        <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="text-sm tabular-nums">{formatCompactCount(viewCount)}</span>
                        <span className="sr-only">{viewCount === 1 ? "vista" : "vistas"}</span>
                    </div>
                    {likePercent !== null && (
                        <div className="flex items-center gap-1.5" title={ratingLabel}>
                            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="text-sm tabular-nums" aria-hidden="true">{likePercent} %</span>
                            <span className="sr-only">{ratingLabel}</span>
                        </div>
                    )}
                </div>

                {/* El enlace/botón se estira (after:) sobre toda la tarjeta: se puede pulsar en cualquier punto. */}
                <div className="mt-auto">
                    {isAuthenticated ? (
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full after:absolute after:inset-0"
                            asChild
                        >
                            <Link href={href}>Ver PDF</Link>
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full after:absolute after:inset-0"
                            onClick={handleClick}
                        >
                            Iniciar sesión para ver PDF
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PDFCard
