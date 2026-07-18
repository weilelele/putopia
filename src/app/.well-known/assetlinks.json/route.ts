import { NextResponse } from 'next/server'

// Android App Links verification file.
// Served at https://multiverseco.org/.well-known/assetlinks.json
//
// Set ANDROID_CERT_SHA256 in the production environment to the SHA-256
// fingerprint(s) of the app signing cert (colon-separated uppercase hex, as
// printed by `keytool -list -v -keystore <keystore>`). Comma-separate multiple
// fingerprints (e.g. debug + Play App Signing). Until set, App Links will not
// verify (the app still opens links if the user picks it manually).
const FINGERPRINTS = (process.env.ANDROID_CERT_SHA256 || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function GET() {
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'org.multiverseco.app',
        sha256_cert_fingerprints: FINGERPRINTS,
      },
    },
  ]
  return NextResponse.json(body, {
    headers: { 'cache-control': 'public, max-age=3600' },
  })
}
