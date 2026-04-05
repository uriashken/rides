// Group practices by day and detect consecutive ones (< 3 hours apart)
export function groupAndProcessPractices(events) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + 7)

  const filtered = events.filter((e) => {
    const start = new Date(e.start)
    return start >= now && start <= cutoff
  })

  filtered.sort((a, b) => new Date(a.start) - new Date(b.start))

  // Group by date
  const byDay = {}
  for (const event of filtered) {
    const date = new Date(event.start).toDateString()
    if (!byDay[date]) byDay[date] = []
    byDay[date].push(event)
  }

  // For each day, detect consecutive pairs and build slot structure
  const days = []
  for (const [dateStr, dayEvents] of Object.entries(byDay)) {
    const groups = []
    let i = 0
    while (i < dayEvents.length) {
      const current = dayEvents[i]
      const next = dayEvents[i + 1]

      if (next) {
        const gap =
          (new Date(next.start) - new Date(current.end)) / (1000 * 60 * 60)
        if (gap < 3) {
          // Consecutive pair
          groups.push({ type: 'pair', events: [current, next] })
          i += 2
          continue
        }
      }
      groups.push({ type: 'single', events: [current] })
      i++
    }
    days.push({ dateStr, date: new Date(dayEvents[0].start), groups })
  }

  return days
}

export function formatHebrewDate(date) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ]
  return `יום ${days[date.getDay()]}, ${date.getDate()} ב${months[date.getMonth()]}`
}

export function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}
