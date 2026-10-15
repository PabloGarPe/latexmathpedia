"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

const STORAGE_KEY = "mathtexpedia-edit-mode"

type EditModeValue = {
  // El usuario puede editar (es admin): decide si se ofrece el interruptor.
  canEdit: boolean
  // Modo edición activo: es lo que enseña los controles de gestión en las vistas normales.
  editing: boolean
  setEditing: (editing: boolean) => void
}

const EditModeContext = createContext<EditModeValue>({
  canEdit: false,
  editing: false,
  setEditing: () => {},
})

// Interruptor "Modo edición" del admin: apagado, las vistas se ven igual que para un alumno.
// La preferencia se recuerda en este navegador; `editing` nunca es true si no es admin.
export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  const [enabled, setEnabled] = useState(false)

  // Se lee tras montar (no en el useState inicial) para que el HTML del servidor y el primer
  // render del cliente coincidan.
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1")
    } catch {
      // Sin acceso a localStorage el modo simplemente no se recuerda.
    }
  }, [])

  const setEditing = useCallback((next: boolean) => {
    setEnabled(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      // Ídem.
    }
  }, [])

  const value = useMemo(
    () => ({ canEdit: isAdmin, editing: isAdmin && enabled, setEditing }),
    [isAdmin, enabled, setEditing],
  )

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

export function useEditMode() {
  return useContext(EditModeContext)
}
