/**
 * Custom ESLint rule: platform/no-raw-platform-check
 *
 * The same site runs as web / iOS-native (Capacitor) / Android-PWA. All runtime
 * detection must go through @/lib/platform so feature code branches on
 * capabilities, never on the platform name (see docs/cross-platform.md). This
 * rule blocks the raw detection patterns from leaking into src/app and
 * src/components:
 *
 *   window.Capacitor / (window as …).Capacitor   -> use usePlatform()/getPlatform()
 *   navigator.standalone                          -> platform.isStandalone
 *   matchMedia('(display-mode: standalone)')      -> platform.isStandalone
 *
 * @/lib/platform itself is the one allowed place — it lives in src/lib and is
 * outside this rule's configured `files` scope.
 */

/** A member access of a `Capacitor` property (covers `window.Capacitor` and casts). */
export function isCapacitorAccess(propertyName) {
  return propertyName === 'Capacitor'
}

/** `navigator.standalone` — the iOS-legacy standalone flag. */
export function isStandaloneNavAccess(objectName, propertyName) {
  return objectName === 'navigator' && propertyName === 'standalone'
}

/** A `matchMedia` argument string that probes display-mode. */
export function isDisplayModeQuery(arg) {
  return typeof arg === 'string' && /display-mode\s*:/.test(arg)
}

/** Peel TS cast / non-null / satisfies wrappers so `(navigator as X).y` reads as `navigator`. */
function unwrap(node) {
  let n = node
  while (
    n &&
    (n.type === 'TSAsExpression' ||
      n.type === 'TSNonNullExpression' ||
      n.type === 'TSSatisfiesExpression')
  ) {
    n = n.expression
  }
  return n
}

function memberName(node) {
  const n = unwrap(node)
  if (!n) return null
  if (n.type === 'Identifier') return n.name
  if (n.type === 'Literal') return n.value
  return null
}

/** @type {import('eslint').Rule.RuleModule} */
const noRawPlatformCheck = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw platform detection (window.Capacitor, navigator.standalone, display-mode media queries) outside @/lib/platform',
    },
    schema: [],
    messages: {
      capacitor:
        'Raw `Capacitor` access is not allowed here. Use usePlatform()/getPlatform() from @/lib/platform (e.g. platform.isNative).',
      standalone:
        'Raw `navigator.standalone` is not allowed here. Use platform.isStandalone from @/lib/platform.',
      displayMode:
        "Raw display-mode media query is not allowed here. Use platform.isStandalone from @/lib/platform.",
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        const objectName = memberName(node.object)
        const propertyName = node.computed ? memberName(node.property) : memberName(node.property)
        if (isCapacitorAccess(propertyName)) {
          context.report({ node, messageId: 'capacitor' })
        } else if (isStandaloneNavAccess(objectName, propertyName)) {
          context.report({ node, messageId: 'standalone' })
        }
      },
      CallExpression(node) {
        const callee = node.callee
        const isMatchMedia =
          (callee.type === 'Identifier' && callee.name === 'matchMedia') ||
          (callee.type === 'MemberExpression' &&
            memberName(callee.property) === 'matchMedia')
        if (!isMatchMedia) return
        const arg = node.arguments[0]
        if (arg && arg.type === 'Literal' && isDisplayModeQuery(arg.value)) {
          context.report({ node, messageId: 'displayMode' })
        }
      },
    }
  },
}

export default {
  rules: { 'no-raw-platform-check': noRawPlatformCheck },
}
