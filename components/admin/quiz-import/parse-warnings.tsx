import { Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Avisos recuperables del parseo del JSON (datos ignorados, tipos por elegir…): no son errores.
export function ParseWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <Alert>
      <Info />
      <AlertTitle className="line-clamp-none">Avisos al leer el JSON</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-0.5 pl-4">
          {warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
