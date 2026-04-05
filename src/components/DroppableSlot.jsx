import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { getParentColor } from './ParentChip'

export default function DroppableSlot({ id, label, assignedParent, onClear }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  const color = assignedParent ? getParentColor(assignedParent) : null

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: '52px',
        borderRadius: '10px',
        border: isOver
          ? '2px dashed #4f46e5'
          : assignedParent
          ? 'none'
          : '2px dashed #cbd5e1',
        background: isOver
          ? '#eef2ff'
          : assignedParent
          ? color.bg
          : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        transition: 'all 0.15s ease',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: assignedParent ? color.text : '#94a3b8',
          flex: 1,
        }}
      >
        {assignedParent ? (
          <span style={{ fontWeight: 700, fontSize: '15px' }}>{assignedParent}</span>
        ) : (
          <span>{label}</span>
        )}
      </span>

      {assignedParent && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          style={{
            background: 'rgba(255,255,255,0.3)',
            border: 'none',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color.text,
            fontSize: '14px',
            fontWeight: 700,
            flexShrink: 0,
            padding: 0,
          }}
          title="הסר"
        >
          ×
        </button>
      )}
    </div>
  )
}
