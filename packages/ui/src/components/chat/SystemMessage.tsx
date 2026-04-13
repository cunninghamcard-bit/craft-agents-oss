/**
 * SystemMessage - Displays system/info/error/warning messages
 *
 * Used for displaying non-conversational messages like errors, warnings,
 * info notices, and general system messages. Supports different visual
 * styles based on the message type.
 *
 * Error and warning types use subtle border + tinted background for warm theme consistency.
 * System and info types use a simple bordered style.
 */

import type { CSSProperties } from 'react'
import { cn } from '../../lib/utils'
import { Markdown } from '../markdown'

export type SystemMessageType = 'error' | 'info' | 'warning' | 'system'

export interface SystemMessageProps {
  /** Message content (markdown supported) */
  content: string
  /** Message type determining visual style */
  type: SystemMessageType
  /** Additional className for the outer container */
  className?: string
}

// Style configuration for each message type
// All types use bordered style for warm theme consistency
const MESSAGE_STYLES: Record<SystemMessageType, {
  className: string
  bgStyle?: CSSProperties
}> = {
  error: {
    // Uses -text variant (mixed with foreground) for better text contrast
    className: 'text-[var(--destructive-text)] border border-destructive/20',
    bgStyle: { backgroundColor: 'oklch(from var(--destructive) l c h / 0.03)' },
  },
  warning: {
    // Uses -text variant (mixed with foreground) for better text contrast
    className: 'text-[var(--info-text)] border border-info/20',
    bgStyle: { backgroundColor: 'oklch(from var(--info) l c h / 0.03)' },
  },
  info: {
    className: 'text-muted-foreground border border-muted bg-muted/30',
  },
  system: {
    className: 'text-muted-foreground border border-muted bg-muted/30',
  },
}

/**
 * SystemMessage - Renders a styled message bubble based on type
 */
export function SystemMessage({
  content,
  type,
  className,
}: SystemMessageProps) {
  const style = MESSAGE_STYLES[type]

  return (
    <div className={cn("px-4 py-2", className)}>
      <div
        className={cn("text-sm px-3 py-2 rounded-md", style.className)}
        style={style.bgStyle}
      >
        <Markdown mode="minimal">{content}</Markdown>
      </div>
    </div>
  )
}
