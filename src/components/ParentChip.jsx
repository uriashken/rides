import React from 'react'
import { useDraggable } from '@dnd-kit/core'

const COLORS = {
  'אשכנזי-פומרנץ': { bg: '#4f46e5', text: '#fff' },
  שיינקוף: { bg: '#0891b2', text: '#fff' },
  גבראל: { bg: '#059669', text: '#fff' },
  בירנבאום: { bg: '#d97706', text: '#fff' },
}

export function getParentColor(name) {
  return COLORS[name] || { bg: '#6b7280', text: '#fff' }
}

export default function ParentChip({ name, dragId, small = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: dragId || name })

  const color = getParentColor(name)

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
