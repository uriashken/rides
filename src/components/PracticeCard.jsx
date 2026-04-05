import React from 'react'
import DroppableSlot from './DroppableSlot'
import { formatTime } from '../utils/calendarUtils'

function EventBadge({ event, color }) {
  const isGame = event.summary.includes('משחק')
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: isGame ? '#fef3c7' : '#eff6ff',
        borderRadius: '8px',
        padding: '6px 12px',
        marginBottom: '4px',
      }}
    >
      <span style={{ fontSize: '18px' }}>{isGame ? '🏆' : '🏀'}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
          {event.summary}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          {formatTime(event.start)} – {formatTime(event.end)}
        </div>
      </div>
    </div>
  )
}

export default function PracticeCard({ group, slotData, onClear }) {
  const isPair = group.type === 'pair'
  const [e1, e2] = group.events

  const slots = isPair
    ? [
        { id: `${e1.id}_to`, label: '🚗 הסעה להגעה' },
        { id: `${e1.id}_mid`, label: '🔄 הסעה בין האימונים' },
        { id: `${e1.id}_from`, label: '🏠 הסעה לחזרה' },
      ]
    : [
        { id: `${e1.id}_to`, label: '🚗 הסעה להגעה' },
        { id: `${e1.id}_from`, label: '🏠 הסעה לחזרה' },
      ]

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div>
        {group.events.map((ev) => (
          <EventBadge key={ev.id} event={ev} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {slots.map((slot) => (
          <DroppableSlot
            key={slot.id}
            id={slot.id}
            label={slot.label}
            assignedParent={slotData[slot.id]}
            onClear={() => onClear(slot.id)}
          />
        ))}
      </div>
    </div>
  )
}
