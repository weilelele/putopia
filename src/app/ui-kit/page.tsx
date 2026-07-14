/* LOCAL PREVIEW ONLY — candidate HUD restyle for buttons / nav / inputs.
   Not linked in nav, not committed/deployed. Delete or promote after review. */

const NAV = ['ABOUT', 'PROJECTS', 'MEMBERS', 'CONTACT', 'ARCHIVE']

export default function UiKitPreview() {
  return (
    <div className="uk-root">
      <style>{CSS}</style>

      <div className="uk-eyebrow">03 UI ELEMENTS</div>

      <div className="uk-grid">
        {/* ── BUTTONS ── */}
        <section>
          <h3 className="uk-coltitle">BUTTONS</h3>

          <button className="uk-btn" type="button">
            <i className="node" /><i className="dash" />
            <span>PRIMARY BUTTON</span>
          </button>

          <button className="uk-btn is-filled" type="button">
            <i className="node" /><i className="dash" />
            <span>HOVER STATE</span>
          </button>

          <button className="uk-btn is-ghost" type="button">
            <i className="node" /><i className="dash" />
            <span>SECONDARY BUTTON</span>
          </button>
        </section>

        {/* ── NAVIGATION ── */}
        <section className="uk-col-divider">
          <h3 className="uk-coltitle">NAVIGATION</h3>
          <nav className="uk-nav">
            {NAV.map((label) => (
              <a key={label} className="uk-navlink" href="#">
                <span>{label}</span>
                <svg className="trace" width="150" height="34" viewBox="0 0 150 34" fill="none" aria-hidden>
                  <polyline points="0,12 92,12 118,26 142,26" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="146" cy="26" r="3.2" fill="currentColor" />
                </svg>
              </a>
            ))}
          </nav>
        </section>

        {/* ── FORM ELEMENTS ── */}
        <section className="uk-col-divider">
          <h3 className="uk-coltitle">FORM ELEMENTS</h3>

          <div className="uk-field">
            <span className="legend">NAME</span>
            <div className="uk-inputbox">
              <input defaultValue="John Doe" />
            </div>
          </div>

          <label className="uk-toplabel">EMAIL</label>
          <div className="uk-inputbox" style={{ marginBottom: 18 }}>
            <input defaultValue="john@multiverse.co" />
          </div>

          <label className="uk-toplabel">MESSAGE</label>
          <div className="uk-inputbox" style={{ marginBottom: 22 }}>
            <textarea rows={3} placeholder="Enter your message..." />
          </div>

          <button className="uk-btn is-ghost" type="button" style={{ width: '100%' }}>
            <i className="node" /><i className="dash" />
            <span>SUBMIT</span>
          </button>
        </section>
      </div>
    </div>
  )
}

const CSS = `
.uk-root{
  --bg:#0A0E27; --retro:#E35205; --burnt:#C84406; --deepor:#A92F06;
  --white:#F5F5F5; --muted:rgba(245,245,245,.55); --faint:rgba(245,245,245,.30);
  --notch:16px; --bw:1.5px;
  min-height:100vh; background:var(--bg); padding:48px 40px 80px;
  font-family:var(--font-mono, 'Courier New', monospace);
}
.uk-eyebrow{ color:var(--deepor); font-size:34px; font-weight:700; letter-spacing:.06em; margin-bottom:40px; }
.uk-grid{ display:grid; grid-template-columns:1fr 1fr 1.15fr; gap:0; max-width:1200px; }
.uk-grid > section{ padding:0 40px; }
.uk-grid > section:first-child{ padding-left:0; }
.uk-col-divider{ border-left:1px solid rgba(200,68,6,.22); }
.uk-coltitle{ color:var(--white); font-size:15px; font-weight:700; letter-spacing:.22em; margin:0 0 26px; }

/* ── BUTTONS — notched outline via two clipped layers ── */
.uk-btn{
  position:relative; display:block; width:100%; margin-bottom:22px;
  padding:18px 20px; border:none; background:none; cursor:pointer;
  font-family:inherit; font-size:15px; font-weight:700; letter-spacing:.16em;
  text-transform:uppercase; color:var(--retro);
  transition:color .18s, filter .18s, transform .18s;
}
.uk-btn > span{ position:relative; z-index:2; }
/* border layer */
.uk-btn::before{
  content:''; position:absolute; inset:0; z-index:0; background:var(--burnt);
  clip-path:polygon(var(--notch) 0, 100% 0, 100% calc(100% - var(--notch)), calc(100% - var(--notch)) 100%, 0 100%, 0 var(--notch));
}
/* fill layer (inset by border width) */
.uk-btn::after{
  content:''; position:absolute; inset:var(--bw); z-index:1; background:var(--bg);
  clip-path:polygon(calc(var(--notch) - var(--bw)) 0, 100% 0, 100% calc(100% - var(--notch) + var(--bw)), calc(100% - var(--notch) + var(--bw)) 100%, 0 100%, 0 calc(var(--notch) - var(--bw)));
}
.uk-btn:hover{ transform:translateY(-1px); }
.uk-btn:hover::before{ background:var(--retro); box-shadow:0 0 22px rgba(227,82,5,.35); }

/* filled (hover-state demo / active) */
.uk-btn.is-filled{ color:#1a0f06; }
.uk-btn.is-filled::before{ background:var(--retro); }
.uk-btn.is-filled::after{ background:linear-gradient(180deg,#FF8A4D, var(--deepor)); }

/* ghost / secondary — fainter border */
.uk-btn.is-ghost{ color:var(--burnt); }
.uk-btn.is-ghost::before{ background:rgba(200,68,6,.45); }
.uk-btn.is-ghost:hover{ color:var(--retro); }
.uk-btn.is-ghost:hover::before{ background:var(--retro); }

/* corner accents — match reference's asymmetric 4-corner treatment:
   TL bevel + bracket · TR dashed edge · BR bevel + bracket · BL square node */
.uk-btn .brk{ position:absolute; z-index:3; width:13px; height:13px; pointer-events:none; opacity:.95; }
.uk-btn .brk.tl{ top:8px; left:9px; border-top:1.6px solid currentColor; border-left:1.6px solid currentColor; }
.uk-btn .brk.br{ bottom:8px; right:9px; border-bottom:1.6px solid currentColor; border-right:1.6px solid currentColor; }
/* small filled square node at the bottom-left (square) corner */
.uk-btn .node{ position:absolute; z-index:3; left:0; bottom:0; width:6px; height:6px; background:currentColor; pointer-events:none; }
/* dashed accent running down the right edge near the top */
.uk-btn .dash{ position:absolute; z-index:3; right:2px; top:13px; width:1.6px; height:30px; pointer-events:none; opacity:.9;
  background:repeating-linear-gradient(180deg, currentColor 0 3.5px, transparent 3.5px 7px); }

.uk-btn.is-filled .brk, .uk-btn.is-filled .node, .uk-btn.is-filled .dash{ color:rgba(26,15,6,.55); }
.uk-btn.is-filled .node{ background:rgba(26,15,6,.55); }

/* ── NAVIGATION — circuit-trace links ── */
.uk-nav{ display:flex; flex-direction:column; gap:22px; }
.uk-navlink{
  display:flex; align-items:center; gap:10px; text-decoration:none;
  color:var(--burnt); font-size:17px; font-weight:700; letter-spacing:.06em;
  transition:color .15s;
}
.uk-navlink > span{ white-space:nowrap; }
.uk-navlink .trace{ flex:1; color:rgba(200,68,6,.6); transition:color .15s; }
.uk-navlink:hover{ color:var(--retro); }
.uk-navlink:hover .trace{ color:var(--retro); }

/* ── FORM — notched inputs + fieldset-legend label ── */
.uk-field{ position:relative; margin-bottom:18px; }
.uk-field .legend{
  position:absolute; top:-7px; left:15px; z-index:3; padding:0 7px;
  background:var(--bg); font-size:12px; letter-spacing:.14em; color:var(--muted);
}
.uk-toplabel{ display:block; color:var(--white); font-size:13px; font-weight:700; letter-spacing:.16em; margin-bottom:9px; }

.uk-inputbox{ position:relative; }
.uk-inputbox::before{
  content:''; position:absolute; inset:0; z-index:0; background:rgba(245,245,245,.30);
  clip-path:polygon(var(--notch) 0, 100% 0, 100% calc(100% - var(--notch)), calc(100% - var(--notch)) 100%, 0 100%, 0 var(--notch));
  transition:background .15s, box-shadow .15s;
}
.uk-inputbox::after{
  content:''; position:absolute; inset:var(--bw); z-index:1; background:var(--bg);
  clip-path:polygon(calc(var(--notch) - var(--bw)) 0, 100% 0, 100% calc(100% - var(--notch) + var(--bw)), calc(100% - var(--notch) + var(--bw)) 100%, 0 100%, 0 calc(var(--notch) - var(--bw)));
}
.uk-inputbox input, .uk-inputbox textarea{
  position:relative; z-index:2; width:100%; background:transparent; border:none; outline:none;
  color:var(--white); font-family:inherit; font-size:15px; padding:14px 16px; resize:none; display:block;
}
.uk-inputbox textarea::placeholder, .uk-inputbox input::placeholder{ color:var(--faint); }
.uk-inputbox:focus-within::before{ background:var(--retro); box-shadow:0 0 18px rgba(227,82,5,.25); }
`
