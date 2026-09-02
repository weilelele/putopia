import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('iOS push build configuration', () => {
  it('uses sandbox APNs for Debug and production APNs for TestFlight', () => {
    const project = readFileSync(
      join(root, 'mobile/ios/MultiverseCollective.xcodeproj/project.pbxproj'),
      'utf8',
    )
    const debugEntitlements = readFileSync(
      join(root, 'mobile/ios/MultiverseCollective/MultiverseCollective.debug.entitlements'),
      'utf8',
    )
    const releaseEntitlements = readFileSync(
      join(root, 'mobile/ios/MultiverseCollective/MultiverseCollective.entitlements'),
      'utf8',
    )

    expect(project).toContain(
      'CODE_SIGN_ENTITLEMENTS = MultiverseCollective/MultiverseCollective.debug.entitlements;',
    )
    expect(project).toContain(
      'CODE_SIGN_ENTITLEMENTS = MultiverseCollective/MultiverseCollective.entitlements;',
    )
    expect(debugEntitlements).toContain('<string>development</string>')
    expect(releaseEntitlements).toContain('<string>production</string>')
  })
})
