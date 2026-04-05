#!/usr/bin/env node
// Run this ONCE to get your Google refresh token:
// node scripts/get-token.js
//
// Before running, set these env vars:
//   export GOOGLE_CLIENT_ID=your_client_id
//   export GOOGLE_CLIENT_SECRET=your_client_secret

import http from 'http'
import { exec } from 'child_process'
import { URL } from 'url'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3333/callback'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  חסרים משתני סביבה!')
  console.error('   הגדר לפני הרצה:')
  console.error('   export GOOGLE_CLIENT_ID=...')
  console.error('   export GOOGLE_CLIENT_SECRET=...\n')
  process.exit(1)
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })

console.log('\n🚀  פותח דפדפן לאישור גישה ל-Google Calendar...\n')
exec(`open "${authUrl}"`)

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3333`)
  const code = url.searchParams.get('code')

  if (!code) {
    res.end('שגיאה - לא התקבל קוד')
    return
  }

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const data = await tokenResp.json()

    if (!data.refresh_token) {
      res.end('שגיאה: לא התקבל refresh_token')
      console.error('\n❌  שגיאה:', data)
      server.close()
      return
    }

    res.end(`
      <html dir="rtl" style="font-family:sans-serif;padding:40px;direction:rtl">
        <h2>✅ הצלחה!</h2>
        <p>העתק את ה-Refresh Token הבא ל-Vercel:</p>
        <code style="background:#f0f0f0;padding:12px;display:block;word-break:break-all;border-radius:6px">
          ${data.refresh_token}
        </code>
        <p style="margin-top:16px">אפשר לסגור את החלון הזה.</p>
      </html>
    `)

    console.log('\n✅  הצלחה! Refresh Token:')
    console.log('\n' + data.refresh_token + '\n')
    console.log('📋  הוסף ל-Vercel Environment Variables:')
    console.log('   GOOGLE_REFRESH_TOKEN=' + data.refresh_token)
    console.log('   GOOGLE_CLIENT_ID=' + CLIENT_ID)
    console.log('   GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET + '\n')

    server.close()
  } catch (err) {
    res.end('שגיאה: ' + err.message)
    server.close()
  }
})

server.listen(3333, () => {
  console.log('🔒  ממתין לאישור Google...')
})
