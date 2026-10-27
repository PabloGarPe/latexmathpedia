"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, X } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/rich-text"
import { UserAvatar } from "@/components/user-avatar"
import { useCommentConfig, useCreateComment } from "@/hooks/api/use-comments"
import { useMe } from "@/hooks/api/use-profile"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  commentCreateErrorMessage,
  commentErrorMessage,
  countCodePoints,
  DEFAULT_COMMENT_MAX_LENGTH,
  isProfileIncompleteError,
  validateCommentBody,
} from "@/lib/comments"
import { cn } from "@/lib/utils"

// El contador solo aparece al acercarse al límite, para no añadir ruido a un comentario corto.
const COUNTER_VISIBLE_RATIO = 0.8

interface CommentComposerProps {
  pdfId: number
  /** Comentario al que se responde; sin él es un comentario raíz. */
  replyTo?: { id: number; username?: string | null }
  /** Se llama tras un envío correcto (el composer de respuesta se cierra con esto). */
  onSubmitted?: () => void
  /** Si se pasa, se pinta el botón "Cancelar". */
  onCancel?: () => void
  autoFocus?: boolean
  className?: string
}

// Composer de comentarios y respuestas. El texto se valida antes de enviar con las mismas reglas
// que el back (validateCommentBody); lo que el servidor rechace después sale en un toast.
export function CommentComposer({ pdfId, replyTo, onSubmitted, onCancel, autoFocus, className }: CommentComposerProps) {
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  const { data: me } = useMe(isAuthenticated)
  const { data: config } = useCommentConfig()
  const { mutate, isPending } = useCreateComment(pdfId)
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  const maxLength = config?.maxLength ?? DEFAULT_COMMENT_MAX_LENGTH
  const isReply = replyTo !== undefined

  // El esquema depende de la longitud máxima, que llega del servidor.
  const schema = useMemo(
    () =>
      z.object({
        body: z.string().superRefine((value, ctx) => {
          const code = validateCommentBody(value, maxLength)
          if (code) ctx.addIssue({ code: "custom", message: commentErrorMessage(code) })
        }),
      }),
    [maxLength],
  )

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    clearErrors,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { body: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  })

  // El autofocus nativo no siempre cuenta al montar el composer tras un clic en "Responder".
  useEffect(() => {
    if (autoFocus) setFocus("body")
  }, [autoFocus, setFocus])

  const body = useWatch({ control, name: "body" })
  const count = countCodePoints(body)
  const overLimit = count > maxLength
  const showCounter = count >= maxLength * COUNTER_VISIBLE_RATIO
  const canSubmit = body.trim() !== "" && !overLimit && !isPending
  const errorMessage = errors.body?.message
  const hintId = `${isReply ? "reply" : "root"}-composer-hint-${replyTo?.id ?? pdfId}`

  const submit = handleSubmit(({ body: text }) => {
    setProfileIncomplete(false)
    mutate(
      { body: text, replyToId: replyTo?.id },
      {
        onSuccess: () => {
          reset({ body: "" })
          clearErrors()
          toast.success("Comentario enviado. Se publicará cuando se revise.")
          onSubmitted?.()
        },
        onError: (error) => {
          if (isProfileIncompleteError(error)) setProfileIncomplete(true)
          else toast.error(commentCreateErrorMessage(error, { maxPendingPerUser: config?.maxPendingPerUser }))
        },
      },
    )
  })

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      if (canSubmit) void submit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      className={cn("flex gap-3", className)}
      noValidate
    >
      {!isReply && <UserAvatar user={me ?? {}} className="mt-1 hidden h-9 w-9 sm:flex" />}
      <div className="min-w-0 flex-1 space-y-2">
        {isReply && (
          <p className="text-sm text-muted-foreground">
            Respondiendo a{" "}
            <span className={cn("font-medium", replyTo.username ? "text-foreground" : "italic")}>
              {replyTo.username ? `@${replyTo.username}` : "un usuario"}
            </span>
          </p>
        )}
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <RichTextEditor
              {...field}
              variant="compact"
              minRows={3}
              autoFocus={autoFocus}
              disabled={isPending}
              placeholder={isReply ? "Escribe tu respuesta…" : "Escribe un comentario…"}
              aria-label={isReply ? "Tu respuesta" : "Tu comentario"}
              aria-invalid={errorMessage || overLimit ? true : undefined}
              aria-describedby={hintId}
              onKeyDown={handleKeyDown}
            />
          )}
        />

        <div id={hintId} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <p className="text-xs text-muted-foreground">
            Los comentarios se revisan antes de publicarse. No se permiten enlaces ni imágenes.
          </p>
          {showCounter && (
            <p
              aria-live="polite"
              className={cn("text-xs tabular-nums", overLimit ? "font-medium text-destructive" : "text-muted-foreground")}
            >
              {count} / {maxLength}
            </p>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
        {profileIncomplete && (
          <p role="alert" className="text-sm text-destructive">
            Completa tu perfil (nombre de usuario) para poder comentar.{" "}
            <Link href="/dashboard/profile" className="font-medium underline underline-offset-2">
              Ir a mi perfil
            </Link>
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={onCancel} disabled={isPending}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
          <Button type="submit" size="sm" className="cursor-pointer" disabled={!canSubmit}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isReply ? "Responder" : "Publicar"}
          </Button>
        </div>
      </div>
    </form>
  )
}
