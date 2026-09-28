"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { useState } from "react";
import { LoaderIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, login } = useAuth();
  const toast = useToast();

  const run = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error("Register error:", error);
      toast.error("Error al conectar con el servidor de autenticación. Inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Registrarse</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Serás redirigido a la página de registro segura
        </p>
      </div>
      <div className="grid gap-6">
        <Button
          className="w-full cursor-pointer"
          disabled={isLoading}
          onClick={() => run(() => register())}
        >
          {isLoading ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Redirigiendo...
            </>
          ) : "Crear cuenta"}
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
          onClick={() => run(() => login({ idpHint: "google" }))}
        >
          <FaGoogle />
          Inicia sesión con Google
        </Button>
      </div>
      <div className="text-center text-sm">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/auth/login" className="underline underline-offset-4">
          Inicia sesión
        </Link>
      </div>
    </div>
  )
}
