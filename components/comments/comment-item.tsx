"use client"

import { useState } from "react"
import { CornerDownRight, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RichText } from "@/components/rich-text"
import { UserAvatar } from "@/components/user-avatar"
import type { CommentDto } from "@/lib/api/comments"
import { useToggleCommentLike } from "@/hooks/api/use-comments"
import { useToast } from "@/hooks/use-toast"
import { commentActionErrorMessage } from "@/lib/comments"
import { cn, formatRelativeTime } from "@/lib/utils"
import { CommentActionsMenu } from "./comment-actions-menu"
import { CommentComposer } from "./comment-composer"
import { useCommentViewer } from "./use-comment-viewer"

interface CommentItemProps {
  comment: CommentDto
  pdfId: number
  /** Si le gusta al usuario actual (sale de GET /me/comment-likes, no del propio comentario). */
  liked: boolean
  /** Resalta el comentario (el que se abre desde una notificación). */
  highlighted?: boolean
  /** Las respuestas llevan avatar más pequeño. */
  isReply?: boolean
}

// Un comentario (raíz o respuesta) con su barra de acciones y el composer de respuesta inline.
// Una raíz con `available=false` se pinta atenuada y sin acciones; sus respuestas las pone el hilo.
export function CommentItem({ comment, pdfId, liked, highlighted = false, isReply = false }: CommentItemProps) {
  const toast = useToast()
  const { isAdmin, isOwn } = useCommentViewer()
  const { mutate: toggleLike, isPending: likePending } = useToggleCommentLike()
  const [replying, setReplying] = useState(false)

  const id = comment.id
  const body = comment.body ?? ""

  if (id === undefined || comment.available === false || body === "") {
    return (
      <p id={id !== undefined ? `comment-${id}` : undefined} className="py-1 text-sm italic text-muted-foreground">
        Comentario no disponible
      </p>
    )
  }

  const own = isOwn(comment)
  const username = comment.author?.username
  const date = comment.publishedAt ?? comment.createdAt
  const likeCount = comment.likeCount ?? 0

  const handleLike = () => {
    toggleLike(
      { commentId: id, liked: !liked },
      { onError: (error) => toast.error(commentActionErrorMessage(error, "No se pudo guardar tu me gusta.")) },
    )
  }

  const likeButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={liked}
      aria-label={liked ? `Quitar me gusta (${likeCount})` : `Me gusta (${likeCount})`}
      disabled={own || likePending}
      onClick={handleLike}
      className={cn("h-7 cursor-pointer gap-1.5 px-2 text-muted-foreground", liked && "text-destructive hover:text-destructive")}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span className="tabular-nums">{likeCount}</span>
    </Button>
  )

  return (
    <article
      id={`comment-${id}`}
      aria-label={`Comentario de ${username ?? "un usuario"}`}
      className={cn("flex gap-3", highlighted && "rounded-lg bg-primary/5 p-3 ring-1 ring-primary/40")}
    >
      <UserAvatar user={comment.author ?? {}} className={cn("mt-0.5", isReply ? "h-7 w-7 text-xs" : "h-9 w-9")} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className={cn("font-medium", !username && "italic text-muted-foreground")}>
            {username ? `@${username}` : "Usuario"}
          </span>
          {comment.byPdfAuthor && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Autor</span>
          )}
          {date && (
            <time dateTime={date} title={new Date(date).toLocaleString("es-ES")} className="text-xs text-muted-foreground">
              {formatRelativeTime(date)}
            </time>
          )}
        </div>

        {comment.replyToUsername && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CornerDownRight className="h-3 w-3" aria-hidden="true" />
            en respuesta a <span className="font-medium">@{comment.replyToUsername}</span>
          </p>
        )}

        <RichText content={body} variant="compact" className="text-sm" />

        <div className="-ml-2 flex items-center gap-0.5">
          {own ? (
            // Un botón disabled no dispara eventos de puntero: el trigger es un wrapper enfocable.
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="rounded-md">
                  {likeButton}
                </span>
              </TooltipTrigger>
              <TooltipContent>No puedes dar me gusta a tus comentarios</TooltipContent>
            </Tooltip>
          ) : (
            likeButton
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={replying}
            className="h-7 cursor-pointer px-2 text-muted-foreground"
            onClick={() => setReplying((open) => !open)}
          >
            Responder
          </Button>
          <CommentActionsMenu
            commentId={id}
            pdfId={pdfId}
            canReport={!own}
            canDelete={own || isAdmin}
            authorLabel={username ?? undefined}
          />
        </div>

        {replying && (
          <CommentComposer
            pdfId={pdfId}
            replyTo={{ id, username }}
            autoFocus
            onSubmitted={() => setReplying(false)}
            onCancel={() => setReplying(false)}
            className="pt-1"
          />
        )}
      </div>
    </article>
  )
}
