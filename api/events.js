// Vercel serverless function - fetches Google Calendar events for the next 7 days
// Uses stored OAuth refresh token (set once by admin)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const accessToken = await getAccessToken()
    const events = await fetchCalendarEvents(accessToken)

    res.json({ events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

async function getAccessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('חסרים משתני סביבה של Google. ראה הוראות הגדרה.')
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
  if (!data.access_token) {
    throw new Error(`שגיאה בקבלת טוקן: ${JSON.stringify(data)}`)
  }
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

  // Fetch from all calendars and find the matching one
  const calListResp = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const calList = await calListResp.json()

  // Find the calendar named "ילדים חצב"
  const targetCal = calList.items?.find((cal) =>
    cal.summary?.includes('ילדים חצב')
  )

  const calendarId = targetCal
    ? encodeURIComponent(targetCal.id)
    : 'primary'

  const eventsResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const eventsData = await eventsResp.json()

  if (!eventsData.items) {
    throw new Error(`שגיאה בקבלת אירועים: ${JSON.stringify(eventsData)}`)
  }

  // Filter only events with "אימון ילדים" or "משחק ליגה" in the title
  const relevant = eventsData.items.filter((ev) => {
    const summary = ev.summary || ''
    return (
      summary.includes('אימון') && summary.includes('ילדים') ||
      summary.includes('משחק') && summary.includes('ליגה')
    )
  })

  return relevant.map((ev) => ({
    id: ev.id,
    summary: ev.summary,
    start: ev.start.dateTime || ev.start.date,
    end: ev.end.dateTime || ev.end.date,
  }))
}
