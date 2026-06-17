import React from 'react'
import { useDraggable } from '@dnd-kit/core'

const COLOR_PALETTE = [
  { bg: '#4f46e5', text: '#fff' },
  { bg: '#0891b2', text: '#fff' },
  { bg: '#059669', text: '#fff' },
  { bg: '#d97706', text: '#fff' },
]

const FALLBACK = { bg: '#6b7280', text: '#fff' }

export function getParentColor(name, parents) {
  if (!parents) return FALLBACK
  const idx = parents.indexOf(name)
  return idx >= 0 ? (COLOR_PALETTE[idx] || FALLBACK) : FALLBACK
}

export function getColorByIndex(index) {
  return COLOR_PALETTE[index] || FALLBACK
}

export default function ParentChip({ name, dragId, small = false, colorIndex = 0 }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: dragId || name })

  const color = COLOR_PALETTE[colorIndex] || FALLBACK

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    touchAction: 'none',
    background: color.bg,
    color: color.text,
    display: 'inline-flex',
    alignItems: 'center',
    padding: small ? '4px 10px' : '8px 16px',
    borderRadius: '999px',
    fontFamily: 'Heebo, sans-serif',
    fontWeight: 600,
    fontSize: small ? '13px' : '15px',
    userSelect: 'none',
    boxShadow: isDragging
      ? '0 8px 24px rgba(0,0,0,0.2)'
      : '0 2px 6px rgba(0,0,0,0.12)',
    zIndex: isDragging ? 999 : 1,
    whiteSpace: 'nowrap',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {name}
    </div>
  )
}
