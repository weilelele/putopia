/* Internal Style 01 specimen. The controls intentionally consume the same
   shared classes as the product so this page cannot drift into a second theme. */

const NAV = ['CONSOLE', 'ARCHIVE', 'SCAN', 'REPORTS', 'PROFILE'] as const

export default function UiKitPreview() {
  return (
    <main className="uk-root">
      <style>{CSS}</style>

      <header className="uk-header">
        <div>
          <div className="uk-eyebrow">MC // COMPONENT SYSTEM / 01</div>
          <h1>ORBITAL ARCHIVE</h1>
        </div>
        <div className="uk-index">03 / UI ELEMENTS</div>
      </header>

      <div className="uk-grid">
        <section className="uk-section">
          <h2>BUTTONS</h2>
          <div className="uk-stack">
            <button className="btn-primary" type="button">PRIMARY ACTION</button>
            <button className="btn-secondary" type="button">SECONDARY ACTION</button>
            <button className="btn-ghost" type="button">GHOST ACTION</button>
            <button className="btn-primary" type="button" disabled>DISABLED ACTION</button>
          </div>
        </section>

        <section className="uk-section">
          <h2>FORM ELEMENTS</h2>
          <div className="uk-stack">
            <label className="uk-field">
              <span>NAME</span>
              <input className="input-dark" defaultValue="John Doe" />
            </label>
            <label className="uk-field">
              <span>EMAIL</span>
              <input className="input-dark" defaultValue="john@multiverse.co" type="email" />
            </label>
            <label className="uk-field">
              <span>MESSAGE</span>
              <textarea className="input-dark" rows={3} placeholder="Enter your message..." />
            </label>
          </div>
        </section>

        <section className="uk-section">
          <h2>STATUS &amp; PROGRESS</h2>
          <div className="uk-pills" aria-label="Status examples">
            <span className="status-pill status-ok"><span className="dot" />ACTIVE</span>
            <span className="status-pill status-warn"><span className="dot" />SCANNING</span>
            <span className="status-pill"><span className="dot" />ARCHIVED</span>
          </div>
          <div className="uk-progress-block">
            <div className="uk-progress-meta"><span>ARCHIVE SYNC</span><span>72%</span></div>
            <div className="progress-track" aria-label="Archive sync: 72 percent">
              <div className="progress-fill" style={{ width: '72%' }} />
            </div>
          </div>
          <div className="uk-steps" aria-label="Process steps">
            <span className="is-done">01</span><i /><span className="is-current">02</span><i /><span>03</span>
          </div>
        </section>

        <section className="uk-section">
          <h2>ARCHIVE CARD</h2>
          <article className="card-void uk-card">
            <div className="uk-card-meta"><span>RECORD / 1665C</span><span>ACTIVE</span></div>
            <h3>PARALLEL WORLD INDEX</h3>
            <p>Structured records remain legible, calm, and operational across every surface.</p>
            <a href="#component-navigation">OPEN RECORD <span aria-hidden>→</span></a>
          </article>
        </section>

        <section className="uk-section uk-span" id="component-navigation">
          <h2>NAVIGATION</h2>
          <nav className="uk-nav" aria-label="Component navigation example">
            {NAV.map((label, index) => (
              <a key={label} className={index === 0 ? 'is-active' : ''} href="#component-navigation">
                <span className="uk-nav-icon" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </section>
      </div>

      <footer className="uk-footer">
        <span>PANTONE 1665 C</span>
        <span>8PX CLIPPED CORNER / FLAT COLOR / WARM HAIRLINE</span>
      </footer>
    </main>
  )
}

const CSS = `
.uk-root{
  min-height:100svh;
  overflow:auto;
  padding:max(24px,env(safe-area-inset-top)) 16px calc(108px + env(safe-area-inset-bottom));
  background:var(--color-deep);
  color:var(--color-star);
  font-family:var(--font-mono);
}
body:has(.uk-root) .bottom-nav{display:none;}
.uk-header{
  display:flex;
  flex-direction:column;
  gap:18px;
  padding-bottom:24px;
  border-bottom:1px solid var(--archive-line);
}
.uk-eyebrow,.uk-index,.uk-section h2,.uk-field>span,.uk-progress-meta,.uk-footer{
  font-size:var(--fs-caption);
  letter-spacing:.16em;
}
.uk-eyebrow,.uk-index,.uk-section h2{color:var(--color-nucleus);}
.uk-header h1{
  max-width:10ch;
  margin:8px 0 0;
  color:var(--archive-paper);
  font-size:clamp(2rem,13vw,4.75rem);
  line-height:.9;
  letter-spacing:.02em;
}
.uk-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:0;margin-top:8px;}
.uk-section{min-width:0;padding:24px 0;border-bottom:1px solid var(--archive-line-soft);}
.uk-section h2{margin:0 0 18px;font-weight:700;}
.uk-stack{display:grid;gap:12px;}
.uk-stack>.btn-primary,.uk-stack>.btn-secondary,.uk-stack>.btn-ghost{width:100%;}
.uk-field{display:grid;gap:8px;color:var(--archive-paper);}
.uk-field textarea{min-height:96px;resize:vertical;}
.uk-pills{display:flex;flex-wrap:wrap;gap:8px;}
.uk-progress-block{margin-top:28px;}
.uk-progress-meta{display:flex;justify-content:space-between;margin-bottom:10px;color:var(--color-star-dim);}
.uk-steps{display:flex;align-items:center;margin-top:24px;color:var(--color-star-deep);font-size:var(--fs-caption);}
.uk-steps span{display:grid;width:32px;height:32px;place-items:center;border:1px solid var(--archive-line-soft);border-radius:50%;}
.uk-steps span.is-done{color:var(--color-deep);border-color:var(--color-nucleus);background:var(--color-nucleus);}
.uk-steps span.is-current{color:var(--color-nucleus);border-color:var(--color-nucleus);}
.uk-steps i{height:1px;flex:1;background:var(--archive-line-soft);}
.uk-card{padding:0;}
.uk-card-meta{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid var(--archive-line-soft);color:var(--color-star-deep);font-size:var(--fs-caption);letter-spacing:.12em;}
.uk-card h3{margin:0;padding:20px 16px 8px;color:var(--archive-paper);font-size:var(--fs-title);}
.uk-card p{margin:0;padding:0 16px 20px;color:var(--color-star-dim);font-size:var(--fs-label);line-height:1.65;}
.uk-card>a{display:flex;justify-content:space-between;padding:14px 16px;border-top:1px solid var(--archive-line-soft);color:var(--color-nucleus);font-size:var(--fs-caption);letter-spacing:.12em;text-decoration:none;}
.uk-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--archive-line);clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);}
.uk-nav>a{display:flex;min-width:0;min-height:66px;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--color-star-deep);font-size:var(--fs-caption);text-decoration:none;}
.uk-nav>a+a{border-left:1px solid var(--archive-line-soft);}
.uk-nav>a.is-active{color:var(--color-nucleus);}
.uk-nav-icon{font-size:var(--fs-label);}
.uk-footer{display:flex;flex-direction:column;gap:8px;padding-top:20px;color:var(--color-star-deep);}
@media(min-width:768px){
  .uk-root{padding:48px clamp(32px,6vw,88px) 72px;}
  .uk-header{flex-direction:row;align-items:flex-end;justify-content:space-between;}
  .uk-header h1{max-width:none;}
  .uk-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  .uk-section{padding:32px;}
  .uk-section:nth-child(odd){border-right:1px solid var(--archive-line-soft);}
  .uk-span{grid-column:1/-1;border-right:0!important;}
  .uk-footer{flex-direction:row;justify-content:space-between;}
}
`
