"use client";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AlertCircleIcon, LoaderIcon } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();

  // Auth.js redirige aquí con ?error=... si falla el login en Keycloak
  const authError = searchParams.get("error");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const handleLogin = async (idpHint?: string) => {
    setIsLoading(true);
    try {
      await login({ redirectTo, idpHint });
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Error al iniciar sesión. Inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Inicia sesión en tu cuenta</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Serás redirigido a la página de acceso segura
        </p>
      </div>
      <div className="grid gap-6 max-w-xs mx-auto w-full">
        <Button
          className="w-full cursor-pointer"
          disabled={isLoading}
          onClick={() => handleLogin()}
        >
          {isLoading ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Redirigiendo...
            </>
          ) : "Iniciar sesión"}
        </Button>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            O continúa con
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full cursor-pointer"
          disabled={isLoading}
          onClick={() => handleLogin("google")}
        >
          <FaGoogle className="mr-2" />
          Inicia sesión con Google
        </Button>
      </div>
      <div className="text-center text-sm">
        ¿No tienes una cuenta?{" "}
        <Link href="/auth/register" className="underline underline-offset-4">
          Registrarse
        </Link>
      </div>

      {authError && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Error al iniciar sesión</AlertTitle>
          <AlertDescription>
            <p>No se ha podido completar el inicio de sesión. Algunos motivos pueden ser:</p>
            <ul className="list-inside list-disc text-sm">
              <li>El servidor de autenticación no está disponible.</li>
              <li>Has cancelado el inicio de sesión.</li>
              <li>Si tenías una cuenta en la página antigua, ya no existe, debes volver a crearla.</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
