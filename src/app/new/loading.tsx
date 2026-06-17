export default function Loading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-deep-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-caption)',
          letterSpacing: '0.3em',
          color: 'var(--color-nucleus)',
          opacity: 0.7,
        }}
      >
        INITIALIZING...
      </div>
    </div>
  )
}
