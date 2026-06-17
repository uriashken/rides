import React, { useState, useEffect, useCallback, useRef } from 'react'
import html2canvas from 'html2canvas'
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
import { groupAndProcessPractices, formatHebrewDate, formatTime } from './utils/calendarUtils'
import PracticeCard from './components/PracticeCard'
import ParentChip, { getParentColor, getColorByIndex } from './components/ParentChip'

const DEFAULT_PARENTS = ['אשכנזי-פומרנץ', 'שיינקופף', 'גבראל', 'גרינבאום']
const FIRESTORE_DOC = 'assignments/current'

export default function App() {
  const [calendarEvents, setCalendarEvents] = useState([])
  const [days, setDays] = useState([])
  const [assignments, setAssignments] = useState({})
  const [parents, setParents] = useState(DEFAULT_PARENTS)
  const [manualEvents, setManualEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeParent, setActiveParent] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [notification, setNotification] = useState(null)
  const [pendingSwap, setPendingSwap] = useState(null)

  // Edit parents
  const [editingParents, setEditingParents] = useState(false)
  const [draftParents, setDraftParents] = useState(DEFAULT_PARENTS)

  // Add manual event modal
  const [showAddEvent, setShowAddEvent] = useState(false)
  const todayStr = new Date().toISOString().split('T')[0]
  const [eventForm, setEventForm] = useState({
    date: todayStr,
    startTime: '16:00',
    endTime: '17:30',
    type: 'אימון',
  })

  const exportRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  )

  const dismissNotification = useCallback(() => {
    setNotification(null)
  }, [])

  // Re-merge whenever calendar events or manual events change
  useEffect(() => {
    setDays(groupAndProcessPractices([...calendarEvents, ...manualEvents]))
  }, [calendarEvents, manualEvents])

  // Fetch calendar events on load
  useEffect(() => {
    fetch('/api/sync-events')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setCalendarEvents(data.events || [])
        if (data.changes?.length > 0) {
          setNotification({ changes: data.changes })
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Listen to Firestore in real-time
  useEffect(() => {
    const ref = doc(db, FIRESTORE_DOC)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setAssignments(data.slots || {})
        setLastUpdated(data.updatedAt?.toDate?.() || null)
        if (data.parents?.length > 0) {
          setParents(data.parents)
          setDraftParents(data.parents)
        }
        setManualEvents(data.manualEvents || [])
      }
    })
    return unsub
  }, [])

  const saveAll = useCallback(async (slots, prts, manEvts) => {
    const ref = doc(db, FIRESTORE_DOC)
    await setDoc(ref, {
      slots,
      parents: prts,
      manualEvents: manEvts,
      updatedAt: new Date(),
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#f0f4f8' })
    canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      alert('התמונה הועתקה! אפשר להדביק בוואטסאפ 📋')
    }, 'image/png')
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

    if (assignments[slotId] && assignments[slotId] !== parentName) {
      setPendingSwap({ slotId, parentName, existing: assignments[slotId] })
      return
    }

    const newSlots = { ...assignments, [slotId]: parentName }
    setAssignments(newSlots)
    saveAll(newSlots, parents, manualEvents)
  }

  const handleConfirmSwap = useCallback(() => {
    if (!pendingSwap) return
    const { slotId, parentName } = pendingSwap
    const newSlots = { ...assignments, [slotId]: parentName }
    setAssignments(newSlots)
    saveAll(newSlots, parents, manualEvents)
    setPendingSwap(null)
  }, [pendingSwap, assignments, parents, manualEvents, saveAll])

  const handleCancelSwap = useCallback(() => {
    setPendingSwap(null)
  }, [])

  const handleClear = useCallback(
    (slotId) => {
      const newSlots = { ...assignments }
      delete newSlots[slotId]
      setAssignments(newSlots)
      saveAll(newSlots, parents, manualEvents)
    },
    [assignments, parents, manualEvents, saveAll]
  )

  // ─── Edit parents ───────────────────────────────────────────────────────────

  const handleStartEditParents = () => {
    setDraftParents([...parents])
    setEditingParents(true)
  }

  const handleSaveParents = useCallback(() => {
    // Remap existing assignments from old name → new name
    const newSlots = { ...assignments }
    parents.forEach((oldName, i) => {
      const newName = draftParents[i]
      if (oldName !== newName) {
        Object.keys(newSlots).forEach((slotId) => {
          if (newSlots[slotId] === oldName) newSlots[slotId] = newName
        })
      }
    })
    setAssignments(newSlots)
    setParents(draftParents)
    setEditingParents(false)
    saveAll(newSlots, draftParents, manualEvents)
  }, [assignments, parents, draftParents, manualEvents, saveAll])

  const handleCancelEditParents = () => {
    setDraftParents([...parents])
    setEditingParents(false)
  }

  // ─── Manual events ──────────────────────────────────────────────────────────

  const handleAddEvent = useCallback(() => {
    const { date, startTime, endTime, type } = eventForm
    if (!date || !startTime || !endTime) return
    const event = {
      id: `manual_${Date.now()}`,
      summary: type,
      start: `${date}T${startTime}:00`,
      end: `${date}T${endTime}:00`,
      isManual: true,
    }
    const updated = [...manualEvents, event]
    setManualEvents(updated)
    saveAll(assignments, parents, updated)
    setShowAddEvent(false)
    setEventForm({ date: todayStr, startTime: '16:00', endTime: '17:30', type: 'אימון' })
  }, [eventForm, manualEvents, assignments, parents, todayStr, saveAll])

  const handleDeleteManualEvent = useCallback(
    (eventId) => {
      const updated = manualEvents.filter((e) => e.id !== eventId)
      const newSlots = { ...assignments }
      ;[`${eventId}_to`, `${eventId}_from`, `${eventId}_mid`].forEach((k) => {
        delete newSlots[k]
      })
      setManualEvents(updated)
      setAssignments(newSlots)
      saveAll(newSlots, parents, updated)
    },
    [manualEvents, assignments, parents, saveAll]
  )

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function formatChangeText(change) {
    if (change.type === 'removed') return `האירוע "${change.event.summary}" נמחק`
    if (change.type === 'added')
      return `נוסף אירוע חדש: "${change.event.summary}" בתאריך ${formatTime(change.event.start)}`
    if (change.type === 'modified') {
      const { oldEvent, newEvent: nev } = change
      if (oldEvent.summary !== nev.summary) return `"${oldEvent.summary}" שונה ל-"${nev.summary}"`
      if (oldEvent.start !== nev.start)
        return `"${nev.summary}" — השעה שונתה מ-${formatTime(oldEvent.start)} ל-${formatTime(nev.start)}`
      return `"${nev.summary}" עודכן`
    }
    return ''
  }

  const activeParentColor = activeParent ? getParentColor(activeParent, parents) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── Confirm swap dialog ── */}
      {pendingSwap && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: 'rtl' }}>
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 10px', textAlign: 'center' }}>שימו לב! הסלוט תפוס</h2>
            <p style={{ color: '#334155', fontSize: '14px', textAlign: 'center', margin: '0 0 20px', lineHeight: '1.7' }}>
              הסלוט שבחרתם כבר תפוס ע"י <strong>{pendingSwap.existing}</strong>. האם אתם בטוחים שאתם רוצים להחליף?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleConfirmSwap} style={{ width: '100%', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                כן, בצע את ההחלפה
              </button>
              <button onClick={handleCancelSwap} style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                אופס, טעות — חזור אחורה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar change notification ── */}
      {notification && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: 'rtl' }}>
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>📅</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px', textAlign: 'center' }}>שים לב — היומן התעדכן</h2>
            <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', margin: '0 0 16px' }}>מאז הפעם האחרונה שנכנסת, חלו השינויים הבאים:</p>
            <ul style={{ margin: '0 0 20px', padding: '0 16px', color: '#334155', fontSize: '14px', lineHeight: '1.8' }}>
              {notification.changes.map((change, i) => <li key={i}>{formatChangeText(change)}</li>)}
            </ul>
            <button onClick={dismissNotification} style={{ width: '100%', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              הבנתי
            </button>
          </div>
        </div>
      )}

      {/* ── Add manual event modal ── */}
      {showAddEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: 'rtl' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 20px', textAlign: 'center' }}>הוספת אימון ידני</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>תאריך</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', fontFamily: 'Heebo, sans-serif', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>שעת התחלה</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm((f) => ({ ...f, startTime: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', fontFamily: 'Heebo, sans-serif', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>שעת סיום</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm((f) => ({ ...f, endTime: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', fontFamily: 'Heebo, sans-serif', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>סוג אירוע</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['אימון', 'משחק', 'אימון + משחק'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setEventForm((f) => ({ ...f, type: t }))}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: eventForm.type === t ? '2px solid #4f46e5' : '2px solid #e2e8f0',
                        background: eventForm.type === t ? '#eef2ff' : '#f8fafc',
                        color: eventForm.type === t ? '#4f46e5' : '#64748b',
                        fontFamily: 'Heebo, sans-serif',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'אימון' ? '🏀' : t === 'משחק' ? '🏆' : '🏀🏆'} {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
              <button onClick={handleAddEvent} style={{ width: '100%', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                הוסף אימון
              </button>
              <button onClick={() => setShowAddEvent(false)} style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '24px 20px 20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '6px' }}>
          <img src="/logo.png" alt="הפועל כפר סבא" style={{ height: '56px', width: '56px', objectFit: 'contain', borderRadius: '50%', background: '#fff', padding: '4px' }} />
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800 }}>הסעות ילדים חצב</h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>גררו שם אל אחד הסלוטים הפנויים</p>
        {lastUpdated && (
          <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
            עדכון אחרון:{' '}
            {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
          </p>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* ── Parents bar ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', direction: 'rtl' }}>
          {editingParents ? (
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' }}>
                {draftParents.map((name, i) => (
                  <input
                    key={i}
                    value={name}
                    onChange={(e) => {
                      const next = [...draftParents]
                      next[i] = e.target.value
                      setDraftParents(next)
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '999px',
                      border: `2px solid ${getColorByIndex(i).bg}`,
                      fontSize: '14px',
                      fontFamily: 'Heebo, sans-serif',
                      fontWeight: 600,
                      color: '#1e293b',
                      outline: 'none',
                      textAlign: 'center',
                      width: '140px',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button onClick={handleSaveParents} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  ✓ שמור
                </button>
                <button onClick={handleCancelEditParents} style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  ✗ ביטול
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              {parents.map((name, i) => (
                <ParentChip key={i} name={name} dragId={`${name}_source_${i}`} colorIndex={i} />
              ))}
              <button
                onClick={handleStartEditParents}
                title="ערוך שמות"
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '999px', padding: '8px 12px', fontSize: '15px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
              >
                ✏️
              </button>
            </div>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 0', direction: 'rtl' }}>
          <button
            onClick={() => setShowAddEvent(true)}
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            + הוסף אימון ידני
          </button>
          <button
            onClick={handleExport}
            style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📸 ייצא תמונה
          </button>
        </div>

        {/* ── Content ── */}
        <div ref={exportRef} style={{ padding: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
              <p>טוען אימונים...</p>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
              <p style={{ fontWeight: 600 }}>שגיאה בטעינת האימונים</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>{error}</p>
            </div>
          )}

          {!loading && !error && days.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏖️</div>
              <p style={{ fontWeight: 600 }}>אין אימונים ב-7 הימים הקרובים</p>
            </div>
          )}

          <div className="days-grid-wrapper">
            <div className="days-grid">
              {days.map((day) => (
                <div key={day.dateStr}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                    <div style={{ background: '#1e293b', color: '#fff', borderRadius: '20px', padding: '5px 14px', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatHebrewDate(day.date)}
                    </div>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>

                  <div className="practice-cards-grid">
                    {day.groups.map((group) => (
                      <PracticeCard
                        key={group.events[0].id}
                        group={group}
                        slotData={assignments}
                        onClear={handleClear}
                        onDeleteManual={handleDeleteManualEvent}
                        parents={parents}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Drag overlay ── */}
        <DragOverlay>
          {activeParent ? (
            <div style={{ background: activeParentColor.bg, color: activeParentColor.text, padding: '8px 16px', borderRadius: '999px', fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: '15px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', cursor: 'grabbing' }}>
              {activeParent}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
        שינויים נשמרים אוטומטית ומשותפים לכולם
      </div>
    </div>
  )
}
