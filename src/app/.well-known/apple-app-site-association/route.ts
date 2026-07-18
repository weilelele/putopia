import { NextResponse } from 'next/server'

// Apple Universal Links association file.
// Served at https://multiverseco.org/.well-known/apple-app-site-association
// as application/json, with no redirects (the proxy matcher excludes
// /.well-known). iOS fetches this on app install to learn which https paths
// should open the native app instead of Safari.
//
// Set APPLE_TEAM_ID in the production environment (Vercel) to the 10-char
// Apple Developer Team ID. Until then the appID is a placeholder and Universal
// Links will NOT verify.
const TEAM_ID = process.env.APPLE_TEAM_ID || 'TEAMID'
const BUNDLE_ID = 'org.multiverseco.app'

export function GET() {
  const body = {
    applinks: {
      details: [
        {
          appIDs: [`${TEAM_ID}.${BUNDLE_ID}`],
          // Only claim the auth paths — content/share links keep opening in the
          // browser. /auth/* covers the callback, invite and magic-link landings.
          components: [
            { '/': '/auth/*', comment: 'Auth callback / invite / magic links' },
            { '/': '/register', comment: 'New-account registration' },
          ],
        },
      ],
    },
  }
  return NextResponse.json(body, {
    headers: { 'cache-control': 'public, max-age=3600' },
  })
}
