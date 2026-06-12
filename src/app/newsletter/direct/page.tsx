/* Newsletter preview — Group A (direct)
   Visit /newsletter/direct to preview in browser.
   The inner DIRECT_HTML export is also used by the email send action. */

export const metadata = { title: 'Newsletter Preview — Direct', robots: 'noindex' }

export default function DirectNewsletterPage() {
  return (
    <div style={{
      background: '#060A1A', minHeight: '100vh', padding: '40px 16px',
      overflowY: 'auto', height: '100%',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'monospace' }}>
        <div style={{
          marginBottom: 12, textAlign: 'center',
          fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em',
          color: 'rgba(255,107,53,0.45)',
        }}>
          ◈ NEWSLETTER PREVIEW — GROUP A (DIRECT) ◈
        </div>
        <div dangerouslySetInnerHTML={{ __html: DIRECT_HTML }} />
      </div>
    </div>
  )
}

/* ─── Canonical HTML (also imported by email action) ────────────── */
export const DIRECT_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Transmission — Multiverse Collective</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#060A1A;font-family:'Space Mono',ui-monospace,'Courier New',monospace;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#060A1A;padding:32px 16px 64px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">

  <!-- ── HEADER ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.25);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 28px 20px;">
      <tr>
        <td>
          <div style="font-size:8px;letter-spacing:0.35em;color:rgba(255,107,53,0.6);margin-bottom:12px;">
            ◈ &nbsp;CLASSIFIED TRANSMISSION &nbsp;◈ &nbsp;MULTIVERSE COLLECTIVE &nbsp;◈ &nbsp;2026-06-11
          </div>
          <div style="font-size:20px;font-weight:700;letter-spacing:0.12em;color:#F5F5F5;line-height:1.1;margin-bottom:4px;">
            MULTIVERSE<br/>COLLECTIVE
          </div>
          <div style="font-size:8px;letter-spacing:0.28em;color:rgba(245,245,245,0.3);margin-top:6px;">
            INTERNAL DISPATCH &nbsp;·&nbsp; APPLICANT CHANNEL
          </div>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="display:inline-block;border:1px solid rgba(196,169,106,0.45);padding:4px 10px;background:rgba(196,169,106,0.06);">
            <div style="font-size:7px;letter-spacing:0.2em;color:rgba(196,169,106,0.55);">STATUS</div>
            <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;color:rgba(196,169,106,0.85);">APPLICANT</div>
          </div>
        </td>
      </tr>
    </table>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,53,0.35),transparent);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 28px;">
      <tr>
        <td style="font-size:7px;letter-spacing:0.2em;color:rgba(245,245,245,0.15);">PC://INTERNAL/DISPATCH/2026-06-11</td>
        <td style="text-align:right;font-size:7px;letter-spacing:0.15em;color:rgba(255,107,53,0.3);">UPLINK ● ACTIVE</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="height:8px;"></td></tr>

  <!-- ── INTEL SECTION ── -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
        <td style="padding:0 12px;white-space:nowrap;font-size:8px;letter-spacing:0.3em;color:#FF6B35;">— LATEST INTEL —</td>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
      </tr>
    </table>

    <!-- Intel 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0F1430;border:1px solid rgba(255,107,53,0.12);border-left:2px solid rgba(245,245,245,0.2);">
      <tr><td style="padding:12px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
          <tr>
            <td><span style="font-size:7px;letter-spacing:0.18em;color:rgba(245,245,245,0.45);border:1px solid rgba(245,245,245,0.18);padding:1px 6px;">NOTICE</span></td>
            <td style="text-align:right;font-size:7px;letter-spacing:0.1em;color:rgba(245,245,245,0.2);">2026-06-12</td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:5px;line-height:1.35;">Collective&#39;s badges will soon be available to claim.</div>
        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.65;margin-bottom:8px;">We&#39;ve prepared a special badge for everyone who aspires to become a Voyager.</div>
        <a href="https://putopia.vercel.app/intel/INT-640130" style="font-size:8px;letter-spacing:0.18em;color:rgba(245,245,245,0.45);text-decoration:none;border-bottom:1px solid rgba(245,245,245,0.2);">READ →</a>
      </td></tr>
    </table>

    <!-- Intel 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0F1430;border:1px solid rgba(255,107,53,0.12);border-left:2px solid rgba(255,107,53,0.5);">
      <tr><td style="padding:12px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
          <tr>
            <td><span style="font-size:7px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:1px 6px;">ORG</span></td>
            <td style="text-align:right;font-size:7px;letter-spacing:0.1em;color:rgba(245,245,245,0.2);">2026-06-12</td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:5px;line-height:1.35;">Archive Unsealing Protocol — Mass Signal Declassification</div>
        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.65;margin-bottom:8px;">Long-archived parallel-world signal data is now being released for distributed classification.</div>
        <a href="https://putopia.vercel.app/intel/INT-640129" style="font-size:8px;letter-spacing:0.18em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.3);">READ →</a>
      </td></tr>
    </table>

    <!-- Intel 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0F1430;border:1px solid rgba(255,107,53,0.12);border-left:2px solid rgba(255,107,53,0.5);">
      <tr><td style="padding:12px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
          <tr>
            <td><span style="font-size:7px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:1px 6px;">ORG</span></td>
            <td style="text-align:right;font-size:7px;letter-spacing:0.1em;color:rgba(245,245,245,0.2);">2026-06-07</td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:5px;line-height:1.35;">Why does our organization need to exist?</div>
        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.65;margin-bottom:8px;">Over 100 years ago, the Collective nearly collapsed — a message on what that means for our mission today.</div>
        <a href="https://putopia.vercel.app/intel/INT-628014" style="font-size:8px;letter-spacing:0.18em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.3);">READ →</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- ── VOTES SECTION ── -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="height:1px;background:rgba(32,216,144,0.12);"></td>
        <td style="padding:0 12px;white-space:nowrap;font-size:8px;letter-spacing:0.3em;color:#20D890;">● ACTIVE VOTES</td>
        <td style="height:1px;background:rgba(32,216,144,0.12);"></td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0A0E27;border:1px solid rgba(32,216,144,0.12);">
      <tr><td style="padding:12px 16px;">
        <div style="font-size:11px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">What format gives us the best chance of being understood on the other end?</div>
        <a href="https://putopia.vercel.app/vote" style="font-size:8px;letter-spacing:0.18em;color:#20D890;text-decoration:none;border-bottom:1px solid rgba(32,216,144,0.3);">CAST VOTE →</a>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0A0E27;border:1px solid rgba(32,216,144,0.12);">
      <tr><td style="padding:12px 16px;">
        <div style="font-size:11px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">A world I have been observing has gone dark — further attempts may damage my device.</div>
        <a href="https://putopia.vercel.app/vote" style="font-size:8px;letter-spacing:0.18em;color:#20D890;text-decoration:none;border-bottom:1px solid rgba(32,216,144,0.3);">CAST VOTE →</a>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0A0E27;border:1px solid rgba(32,216,144,0.12);">
      <tr><td style="padding:12px 16px;">
        <div style="font-size:11px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">Key parallel world signal monitoring — which category should we prioritize?</div>
        <a href="https://putopia.vercel.app/vote" style="font-size:8px;letter-spacing:0.18em;color:#20D890;text-decoration:none;border-bottom:1px solid rgba(32,216,144,0.3);">CAST VOTE →</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- ── CTA BLOCK — GROUP A (DIRECT) ── -->
  <tr><td style="background:linear-gradient(160deg,#1A0E2A,#0F1430);border:1px solid rgba(255,107,53,0.45);overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>

    <!-- Product image -->
    <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png"
         width="600"
         alt="Initial Voyager Pack — badge and access card"
         style="width:100%;display:block;" />

    <!-- Content -->
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 28px 28px;">
      <tr><td>
        <div style="font-size:8px;letter-spacing:0.28em;color:rgba(255,107,53,0.6);margin-bottom:10px;">◈ &nbsp;INITIAL VOYAGER PACK &nbsp;◈</div>

        <div style="font-size:18px;font-weight:700;letter-spacing:0.08em;color:#F5F5F5;margin-bottom:8px;line-height:1.25;">
          YOUR VOYAGER STATUS IS<br/>READY TO ACTIVATE.
        </div>

        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.7;margin-bottom:22px;">
          Physical badge &nbsp;·&nbsp; Access card &nbsp;·&nbsp; Full Collective network access &nbsp;·&nbsp; <span style="color:#FF6B35;font-weight:700;">$12</span>
        </div>

        <!-- Buy button -->
        <a href="https://putopia.vercel.app/voyager-pack"
           style="display:block;text-align:center;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.2em;text-decoration:none;padding:14px 32px;border:1px solid rgba(255,107,53,0.6);margin-bottom:16px;">
          [ ACTIVATE VOYAGER STATUS ]
        </a>

        <!-- Learn more -->
        <div style="text-align:center;">
          <a href="https://putopia.vercel.app/voyager-pack"
             style="font-size:9px;letter-spacing:0.14em;color:rgba(255,107,53,0.5);text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.22);">
            Learn more about this item →
          </a>
        </div>
      </td></tr>
    </table>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,53,0.2),transparent);"></div>
  </td></tr>

  <tr><td style="height:24px;"></td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="border-top:1px solid rgba(255,107,53,0.1);padding-top:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:8px;letter-spacing:0.18em;color:rgba(255,107,53,0.4);">MULTIVERSE.COLLECTIVE</td>
        <td style="text-align:right;font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.18);">BUILDING BETTER WORLDS, TOGETHER.</td>
      </tr>
    </table>
    <div style="margin-top:10px;font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;line-height:1.8;">
      You are receiving this because you are registered as an Applicant in the Multiverse Collective network.<br/>
      <a href="https://putopia.vercel.app/console" style="color:rgba(255,107,53,0.35);text-decoration:none;">Manage preferences</a>
      &nbsp;·&nbsp;
      <a href="https://putopia.vercel.app/console" style="color:rgba(255,107,53,0.35);text-decoration:none;">Visit console</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>
`
