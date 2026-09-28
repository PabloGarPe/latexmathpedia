"use client"

import { useAdminRoute } from "@/hooks/use-protected-route";

function Admin () {
    const { isAuthenticated, isAdmin, loading } = useAdminRoute();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        return null; // El hook maneja la redirección
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Gestión de PDFs</h2>
                    <p className="text-muted-foreground mb-4">Administra los documentos PDF de la plataforma</p>
                    <a href="/dashboard/admin/pdfs" className="text-primary hover:underline">
                        Ir a PDFs →
                    </a>
                </div>
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Gestión de Asignaturas</h2>
                    <p className="text-muted-foreground mb-4">Administra las asignaturas y sus temas</p>
                    <a href="/dashboard/admin/subjects" className="text-primary hover:underline">
                        Ir a Asignaturas →
                    </a>
                </div>
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Gestión de Cuestionarios</h2>
                    <p className="text-muted-foreground mb-4">Administra los cuestionarios, preguntas y opciones</p>
                    <a href="/dashboard/admin/quizzes" className="text-primary hover:underline">
                        Ir a Cuestionarios →
                    </a>
                </div>
            </div>
        </div>
    )
}

export default Admin;