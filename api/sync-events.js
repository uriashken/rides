// Fetches calendar events, compares with stored Firestore snapshot, returns events + changes.
// Called on every page load from the frontend.

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

function getDb() {
  if (!getApps().length) {
    initializeApp({
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    })
  }
  return getFirestore()
}

async function getAccessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('חסרים משתני סביבה של Google.')
  }
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await resp.json()
  if (!data.access_token) throw new Error(`שגיאה בקבלת טוקן: ${JSON.stringify(data)}`)
  return data.access_token
}

async function fetchCalendarEvents(accessToken) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const until = new Date(now)
  until.setDate(until.getDate() + 7)
  until.setHours(23, 59, 59, 999)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })

  const calListResp = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const calList = await calListResp.json()
  const targetCal = calList.items?.find((cal) => cal.summary?.includes('ילדים חצב'))
  const calendarId = targetCal ? encodeURIComponent(targetCal.id) : 'primary'

  const eventsResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const eventsData = await eventsResp.json()
  if (!eventsData.items) throw new Error(`שגיאה בקבלת אירועים: ${JSON.stringify(eventsData)}`)

  const relevant = eventsData.items.filter((ev) => {
    const summary = ev.summary || ''
    return (
      (summary.includes('אימון') && summary.includes('ילדים')) ||
      (summary.includes('משחק') && summary.includes('ליגה')) ||
      (summary.includes('משחק') && summary.includes('אימון'))
    )
  })

  return relevant.map((ev) => ({
    id: ev.id,
    summary: ev.summary,
    start: ev.start.dateTime || ev.start.date,
    end: ev.end.dateTime || ev.end.date,
  }))
}

function detectChanges(oldEvents, newEvents) {
  const oldMap = Object.fromEntries(oldEvents.map((e) => [e.id, e]))
  const newMap = Object.fromEntries(newEvents.map((e) => [e.id, e]))
  const changes = []

  for (const id of Object.keys(oldMap)) {
    if (!newMap[id]) {
      changes.push({ type: 'removed', event: oldMap[id] })
    }
  }
  for (const id of Object.keys(newMap)) {
    if (!oldMap[id]) {
      changes.push({ type: 'added', event: newMap[id] })
    } else {
      const old = oldMap[id]
      const neu = newMap[id]
      if (old.start !== neu.start || old.end !== neu.end || old.summary !== neu.summary) {
        changes.push({ type: 'modified', oldEvent: old, newEvent: neu })
      }
    }
  }

  return changes
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const db = getDb()
    const accessToken = await getAccessToken()
    const newEvents = await fetchCalendarEvents(accessToken)

    const snapRef = doc(db, 'snapshots', 'events')
    const snapDoc = await getDoc(snapRef)
    const oldEvents = snapDoc.exists() ? (snapDoc.data().events || []) : null

    let changes = []
    if (oldEvents) {
      changes = detectChanges(oldEvents, newEvents)
    }

    // Always update snapshot with latest events
    await setDoc(snapRef, { events: newEvents, updatedAt: new Date().toISOString() })

    return res.json({ events: newEvents, changes })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
