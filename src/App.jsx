import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { groupAndProcessPractices, formatHebrewDate } from './utils/calendarUtils'
import PracticeCard from './components/PracticeCard'
import ParentChip, { getParentColor } from './components/ParentChip'

const PARENTS = ['אשכנזי-פומרנץ', 'שיינקוף', 'גבראל', 'בירנבאום']
const FIRESTORE_DOC = 'assignments/current'

export default function App() {
  const [days, setDays] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeParent, setActiveParent] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  )

  // Fetch events from API
  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setDays(groupAndProcessPractices(data.events || []))
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Listen to Firestore assignments in real-time
  useEffect(() => {
    const ref = doc(db, FIRESTORE_DOC)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setAssignments(data.slots || {})
        setLastUpdated(data.updatedAt?.toDate?.() || null)
      }
    })
    return unsub
  }, [])

  const saveAssignments = useCallback(async (newSlots) => {
    const ref = doc(db, FIRESTORE_DOC)
    await setDoc(ref, {
      slots: newSlots,
      updatedAt: new Date(),
    })
  }, [])

  const handleDragStart = (event) => {
    setActiveParent(event.active.id.toString().replace(/_source_\d+$/, ''))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveParent(null)
    if (!over) return

    const parentName = active.id.toString().replace(/_source_\d+$/, '')
    const slotId = over.id

    const newSlots = { ...assignments, [slotId]: parentName }
    setAssignments(newSlots)
    saveAssignments(newSlots)
  }

  const handleClear = useCallback(
    (slotId) => {
      const newSlots = { ...assignments }
      delete newSlots[slotId]
      setAssignments(newSlots)
      saveAssignments(newSlots)
    },
    [assignments, saveAssignments]
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: '24px 20px 20px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '6px' }}>
          <img src="/logo.png" alt="הפועל כפר סבא" style={{ height: '56px', width: '56px', objectFit: 'contain', borderRadius: '50%', background: '#fff', padding: '4px' }} />
          <h1
            style={{
              color: '#fff',
              fontSize: '22px',
              fontWeight: 800,
            }}
          >
            הסעות ילדים חצב
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          גרור שם הורה לתוך הסעה
        </p>
        {lastUpdated && (
          <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
            עדכון אחרון:{' '}
            {lastUpdated.toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            })}
          </p>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Parents bar */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 16px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {PARENTS.map((name, i) => (
              <ParentChip
                key={name}
                name={name}
                dragId={`${name}_source_${i}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
              <p>טוען אימונים...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#dc2626',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
              <p style={{ fontWeight: 600 }}>שגיאה בטעינת האימונים</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>{error}</p>
            </div>
          )}

          {!loading && !error && days.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: '#64748b',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏖️</div>
              <p style={{ fontWeight: 600 }}>אין אימונים ב-7 הימים הקרובים</p>
            </div>
          )}

          <div className="days-grid">
          {days.map((day) => (
            <div key={day.dateStr}>
              {/* Day header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatHebrewDate(day.date)}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background: '#e2e8f0',
                  }}
                />
              </div>

              {/* Practice cards */}
              <div className="practice-cards-grid">
                {day.groups.map((group) => (
                  <PracticeCard
                    key={group.events[0].id}
                    group={group}
                    slotData={assignments}
                    onClear={handleClear}
                  />
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeParent ? (
            <div
              style={{
                background: getParentColor(activeParent).bg,
                color: getParentColor(activeParent).text,
                padding: '8px 16px',
                borderRadius: '999px',
                fontFamily: 'Heebo, sans-serif',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                cursor: 'grabbing',
              }}
            >
              {activeParent}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          color: '#94a3b8',
          fontSize: '12px',
        }}
      >
        שינויים נשמרים אוטומטית ומשותפים לכולם
      </div>
    </div>
  )
}
