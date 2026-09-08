import React from 'react'
import DroppableSlot from './DroppableSlot'
import { formatTime } from '../utils/calendarUtils'
import { getEventLocation, buildNavUrl } from '../utils/locations'

function NavButton({ destination }) {
  return (
    <a
      href={buildNavUrl(destination)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="נווט למקום האירוע"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        background: '#eef2ff',
        color: '#4f46e5',
        border: '1px solid #c7d2fe',
        borderRadius: '999px',
        padding: '2px 9px',
        fontSize: '11px',
        fontWeight: 700,
        textDecoration: 'none',
        lineHeight: 1.6,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '12px' }}>🧭</span>
      <span>ניווט</span>
    </a>
  )
}

function EventBadge({ event, onDeleteManual }) {
  const isGame = event.summary.includes('משחק')
  const location = getEventLocation(event.summary)
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
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>{isGame ? '🏆' : '🏀'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {event.summary}
            {location && <NavButton destination={location} />}
            {event.isManual && (
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                background: '#e2e8f0',
                color: '#64748b',
                borderRadius: '4px',
                padding: '1px 5px',
              }}>
                ידני
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {formatTime(event.start)} – {formatTime(event.end)}
          </div>
        </div>
      </div>
      {event.isManual && onDeleteManual && (
        <button
          onClick={() => onDeleteManual(event.id)}
          style={{
            background: 'rgba(220,38,38,0.1)',
            border: 'none',
            borderRadius: '6px',
            width: '26px',
            height: '26px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            fontSize: '16px',
            fontWeight: 700,
            flexShrink: 0,
            padding: 0,
          }}
          title="מחק אימון ידני"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function PracticeCard({ group, slotData, onClear, onDeleteManual, parents }) {
  const isPair = group.type === 'pair'
  const [e1] = group.events

  const slots = isPair
    ? [
        { id: `${e1.id}_to`, label: '🚗 הסעה לאימון' },
        { id: `${e1.id}_mid`, label: '🔄 הסעה בין האימונים' },
        { id: `${e1.id}_from`, label: '🏠 הסעה חזרה' },
      ]
    : [
        { id: `${e1.id}_to`, label: '🚗 הסעה לאימון' },
        { id: `${e1.id}_from`, label: '🏠 הסעה חזרה' },
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
          <EventBadge key={ev.id} event={ev} onDeleteManual={onDeleteManual} />
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
            parents={parents}
          />
        ))}
      </div>
    </div>
  )
}
