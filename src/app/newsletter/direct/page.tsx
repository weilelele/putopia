/* Newsletter preview — Group A (direct)
   Visit /newsletter/direct to preview in browser.
   The inner NewsletterHTML export is also used by the email send action. */

export const metadata = { title: 'Newsletter Preview — Direct', robots: 'noindex' }

export default function DirectNewsletterPage() {
  return (
    <div style={{ background: '#060A1A', minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'monospace' }}>
        {/* Preview label */}
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
    <!-- top accent bar -->
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 32px 24px;">
      <tr>
        <td>
          <div style="font-size:9px;letter-spacing:0.35em;color:rgba(255,107,53,0.6);margin-bottom:16px;">
            ◈ &nbsp;CLASSIFIED TRANSMISSION &nbsp;◈ &nbsp;MULTIVERSE COLLECTIVE &nbsp;◈ &nbsp;2026-06-11
          </div>
          <!-- Wordmark -->
          <div style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#F5F5F5;line-height:1.1;margin-bottom:4px;">
            MULTIVERSE<br/>COLLECTIVE
          </div>
          <div style="font-size:9px;letter-spacing:0.3em;color:rgba(245,245,245,0.3);margin-top:8px;">
            INTERNAL DISPATCH &nbsp;·&nbsp; VOYAGER CHANNEL
          </div>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="display:inline-block;border:1px solid rgba(196,169,106,0.45);padding:4px 12px;background:rgba(196,169,106,0.06);">
            <div style="font-size:8px;letter-spacing:0.2em;color:rgba(196,169,106,0.55);">STATUS</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;color:rgba(196,169,106,0.85);">APPLICANT</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- bottom decorative line -->
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,53,0.35),transparent);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 32px;">
      <tr>
        <td style="font-size:8px;letter-spacing:0.2em;color:rgba(245,245,245,0.15);">PC://INTERNAL/DISPATCH/2026-06-11</td>
        <td style="text-align:right;font-size:8px;letter-spacing:0.15em;color:rgba(255,107,53,0.3);">UPLINK ● ACTIVE</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="height:8px;"></td></tr>

  <!-- ── INTEL SECTION ── -->
  <tr><td>
    <!-- Section label -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
        <td style="padding:0 14px;white-space:nowrap;font-size:9px;letter-spacing:0.3em;color:#FF6B35;">— LATEST INTEL —</td>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
      </tr>
    </table>

    <!-- Intel 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0F1430;border:1px solid rgba(255,107,53,0.14);border-left:2px solid rgba(255,107,53,0.5);">
      <tr><td style="padding:18px 20px;">
        <div style="margin-bottom:10px;">
          <span style="font-size:8px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:2px 8px;">ORG</span>
          <span style="font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.25);margin-left:10px;">2026-06-07</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">
          Why does our organization need to exist?
        </div>
        <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:14px;">
          Recently, many new members have joined us. I want to inform all of our new members that over 100 years ago, the Multiverse Collective came close to total collapse — and how that shapes our mission today.
        </div>
        <a href="https://putopia.vercel.app/intel/INT-628014" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.35);">
          READ DISPATCH →
        </a>
      </td></tr>
    </table>

    <!-- Intel 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0F1430;border:1px solid rgba(255,107,53,0.14);border-left:2px solid rgba(245,245,245,0.2);">
      <tr><td style="padding:18px 20px;">
        <div style="margin-bottom:10px;">
          <span style="font-size:8px;letter-spacing:0.18em;color:rgba(245,245,245,0.45);border:1px solid rgba(245,245,245,0.18);padding:2px 8px;">NOTICE</span>
          <span style="font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.25);margin-left:10px;">2026-05-20</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">
          Console Distribution Temporarily Limited Due to Enrollment Surge
        </div>
        <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:14px;">
          Enrollment volume has exceeded projected allocation capacity. The provisioning team is actively working to secure additional devices. Voyagers awaiting console assignment: your status remains valid.
        </div>
        <a href="https://putopia.vercel.app/intel/INT-628013" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:rgba(245,245,245,0.45);text-decoration:none;border-bottom:1px solid rgba(245,245,245,0.18);">
          READ NOTICE →
        </a>
      </td></tr>
    </table>

    <!-- Intel 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0F1430;border:1px solid rgba(255,107,53,0.14);border-left:2px solid rgba(232,93,4,0.5);">
      <tr><td style="padding:18px 20px;">
        <div style="margin-bottom:10px;">
          <span style="font-size:8px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:2px 8px;">ORG</span>
          <span style="font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.25);margin-left:10px;">2026-04-27</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">
          Rumor: The Field Effect
        </div>
        <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:14px;">
          Establishing a connection with a parallel world appears to generate a stable energy field around the operator. Several members have independently reported an increase in spontaneous acts of goodwill in their surroundings during active observation sessions.
        </div>
        <a href="https://putopia.vercel.app/intel/9c6fdc60-385e-4cec-8e69-aef016a08037" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.35);">
          READ REPORT →
        </a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="height:20px;"></td></tr>

  <!-- ── VOTES SECTION ── -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="height:1px;background:rgba(32,216,144,0.12);"></td>
        <td style="padding:0 14px;white-space:nowrap;font-size:9px;letter-spacing:0.3em;color:#20D890;">● ACTIVE VOTES</td>
        <td style="height:1px;background:rgba(32,216,144,0.12);"></td>
      </tr>
    </table>

    <!-- Vote 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0A0E27;border:1px solid rgba(32,216,144,0.14);">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:8px;letter-spacing:0.18em;color:#20D890;margin-bottom:10px;">OPEN FOR VOTING</div>
        <div style="font-size:13px;font-weight:700;color:#F5F5F5;margin-bottom:12px;line-height:1.45;">
          What format gives us the best chance of being understood on the other end?
        </div>
        <div style="font-size:10px;color:rgba(245,245,245,0.35);margin-bottom:12px;line-height:1.6;">
          Signal encoding debate — Morse code · Raw binary · Musical patterns · Mathematical sequences · Analog wave
        </div>
        <a href="https://putopia.vercel.app/vote" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#20D890;text-decoration:none;border-bottom:1px solid rgba(32,216,144,0.3);">
          CAST YOUR VOTE →
        </a>
      </td></tr>
    </table>

    <!-- Vote 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0A0E27;border:1px solid rgba(32,216,144,0.14);">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:8px;letter-spacing:0.18em;color:#20D890;margin-bottom:10px;">OPEN FOR VOTING</div>
        <div style="font-size:13px;font-weight:700;color:#F5F5F5;margin-bottom:12px;line-height:1.45;">
          A world I have been observing has gone dark. Further attempts may damage my device.
        </div>
        <div style="font-size:10px;color:rgba(245,245,245,0.35);margin-bottom:12px;line-height:1.6;">
          Keep pressing · Proceed cautiously with containment · Stop immediately · Mount and absorb vibration
        </div>
        <a href="https://putopia.vercel.app/vote" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#20D890;text-decoration:none;border-bottom:1px solid rgba(32,216,144,0.3);">
          CAST YOUR VOTE →
        </a>
      </td></tr>
    </table>

    <!-- Vote 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0A0E27;border:1px solid rgba(32,216,144,0.14);">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:8px;letter-spacing:0.18em;color:#20D890;margin-bottom:10px;">OPEN FOR VOTING</div>
        <div style="font-size:13px;font-weight:700;color:#F5F5F5;margin-bottom:12px;line-height:1.45;">
          Key Parallel World Signal Monitoring
        </div>
        <div style="font-size:10px;color:rgba(245,245,245,0.35);margin-bottom:12px;line-height:1.6;">
          Altered history worlds · Advanced technology worlds · Psyche-stabilizing worlds
        </div>
        <a href="https://putopia.vercel.app/vote" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#20D890;text-decoration:none;border-bottom:1px solid rgba(32,216,144,0.3);">
          CAST YOUR VOTE →
        </a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="height:20px;"></td></tr>

  <!-- ── CTA BLOCK — GROUP A (DIRECT) ── -->
  <tr><td style="background:linear-gradient(160deg,#1A0E2A,#0F1430);border:1px solid rgba(255,107,53,0.45);overflow:hidden;">
    <!-- top accent -->
    <div style="height:1px;background:linear-gradient(90deg,transparent,#FF6B35,#E85D04,transparent);"></div>

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px;">
      <tr>
        <td>
          <!-- eyebrow -->
          <div style="font-size:8px;letter-spacing:0.3em;color:rgba(255,107,53,0.6);margin-bottom:16px;">
            ◈ &nbsp;VOYAGER INITIATION &nbsp;◈
          </div>

          <!-- headline -->
          <div style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#F5F5F5;margin-bottom:12px;line-height:1.25;">
            YOUR VOYAGER STATUS<br/>IS READY TO ACTIVATE.
          </div>

          <!-- body -->
          <div style="font-size:11px;color:rgba(245,245,245,0.55);line-height:1.9;margin-bottom:20px;max-width:460px;">
            The Initial Voyager Pack is now available. Secure your position in the first wave — activate your Voyager status, claim your physical badge, and unlock full access to the Collective network.
          </div>

          <!-- price row -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="border:1px solid rgba(255,107,53,0.35);padding:6px 14px;background:rgba(255,107,53,0.06);">
                <span style="font-size:9px;letter-spacing:0.18em;color:rgba(255,107,53,0.55);">ONE-TIME &nbsp;</span>
                <span style="font-size:16px;font-weight:700;color:#FF6B35;">$12</span>
              </td>
              <td style="padding-left:14px;font-size:9px;color:rgba(245,245,245,0.3);letter-spacing:0.08em;line-height:1.6;">
                Physical badge + digital access<br/>Ships US only · Limited first batch
              </td>
            </tr>
          </table>

          <!-- CTA button -->
          <a href="https://putopia.vercel.app/voyager-pack"
             style="display:inline-block;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.2em;text-decoration:none;padding:14px 32px;border:1px solid rgba(255,107,53,0.6);">
            [ ACTIVATE VOYAGER STATUS ]
          </a>

          <!-- fine print -->
          <div style="margin-top:14px;font-size:8px;letter-spacing:0.1em;color:rgba(245,245,245,0.2);">
            Secure checkout via Stripe &nbsp;·&nbsp; Questions? Reply to this email
          </div>
        </td>
      </tr>
    </table>

    <!-- bottom scan line effect -->
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,53,0.2),transparent);"></div>
  </td></tr>

  <tr><td style="height:24px;"></td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="border-top:1px solid rgba(255,107,53,0.1);padding-top:24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:8px;letter-spacing:0.18em;color:rgba(255,107,53,0.4);">
          MULTIVERSE.COLLECTIVE
        </td>
        <td style="text-align:right;font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.18);">
          BUILDING BETTER WORLDS, TOGETHER.
        </td>
      </tr>
    </table>
    <div style="margin-top:12px;font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;line-height:1.8;">
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
