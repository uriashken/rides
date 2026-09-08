// Maps a keyword found in an event's title to a navigation destination
// (address or "lat,lng"). Add entries here per venue — the nav icon on
// the event card only appears when a keyword matches the event title.
export const EVENT_LOCATIONS = {
  // 'סורקיס': 'כתובת או lat,lng',
  // 'אולם 60': 'כתובת או lat,lng',
  // 'אולם 80': 'כתובת או lat,lng',
  // 'היובל': 'כתובת או lat,lng',
}

export function getEventLocation(summary) {
  if (!summary) return null
  const keyword = Object.keys(EVENT_LOCATIONS).find((k) => summary.includes(k))
  return keyword ? EVENT_LOCATIONS[keyword] : null
}

// Builds a maps URL that hands off to whatever navigation app the device
// prefers: Android gets the native app chooser, iOS opens Apple Maps
// (which itself respects the user's default maps app on newer iOS
// versions), and everything else falls back to Google Maps on the web.
export function buildNavUrl(destination) {
  const query = encodeURIComponent(destination)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return `https://maps.apple.com/?q=${query}`
  }
  if (/Android/i.test(ua)) {
    return `geo:0,0?q=${query}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
