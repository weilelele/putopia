/* Newsletter preview — Group B (task_gated)
   Visit /newsletter/task-gated to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Task Gated', robots: 'noindex' }

export default function TaskGatedNewsletterPage() {
  return (
    <div style={{ background: '#060A1A', minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'monospace' }}>
        <div style={{
          marginBottom: 12, textAlign: 'center',
          fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em',
          color: 'rgba(255,107,53,0.45)',
        }}>
          ◈ NEWSLETTER PREVIEW — GROUP B (TASK GATED) ◈
        </div>
        <div dangerouslySetInnerHTML={{ __html: TASK_GATED_HTML }} />
      </div>
    </div>
  )
}

export const TASK_GATED_HTML = `
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

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 32px 24px;">
      <tr>
        <td>
          <div style="font-size:9px;letter-spacing:0.35em;color:rgba(255,107,53,0.6);margin-bottom:16px;">
            ◈ &nbsp;CLASSIFIED TRANSMISSION &nbsp;◈ &nbsp;MULTIVERSE COLLECTIVE &nbsp;◈ &nbsp;2026-06-11
          </div>
          <div style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#F5F5F5;line-height:1.1;margin-bottom:4px;">
            MULTIVERSE<br/>COLLECTIVE
          </div>
          <div style="font-size:9px;letter-spacing:0.3em;color:rgba(245,245,245,0.3);margin-top:8px;">
            INTERNAL DISPATCH &nbsp;·&nbsp; VOYAGER CHANNEL
          </div>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="display:inline-block;border:1px solid rgba(232,160,32,0.45);padding:4px 12px;background:rgba(232,160,32,0.06);">
            <div style="font-size:8px;letter-spacing:0.2em;color:rgba(232,160,32,0.55);">STATUS</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;color:#E8A020;">APPLICANT</div>
          </div>
        </td>
      </tr>
    </table>

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
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
        <td style="padding:0 14px;white-space:nowrap;font-size:9px;letter-spacing:0.3em;color:#FF6B35;">— LATEST INTEL —</td>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0F1430;border:1px solid rgba(255,107,53,0.14);border-left:2px solid rgba(245,245,245,0.2);">
      <tr><td style="padding:18px 20px;">
        <div style="margin-bottom:10px;">
          <span style="font-size:8px;letter-spacing:0.18em;color:rgba(245,245,245,0.45);border:1px solid rgba(245,245,245,0.18);padding:2px 8px;">NOTICE</span>
          <span style="font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.25);margin-left:10px;">2026-06-12</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">
          Collective&#39;s badges will soon be available to claim.
        </div>
        <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:14px;">
          For some time we have been debating whether to reveal our existence to others. We have prepared a special badge for everyone who aspires to become a Voyager — so that when we see each other across the world, we can share a knowing smile.
        </div>
        <a href="https://putopia.vercel.app/intel/INT-640130" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:rgba(245,245,245,0.45);text-decoration:none;border-bottom:1px solid rgba(245,245,245,0.18);">
          READ NOTICE →
        </a>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;background:#0F1430;border:1px solid rgba(255,107,53,0.14);border-left:2px solid rgba(255,107,53,0.5);">
      <tr><td style="padding:18px 20px;">
        <div style="margin-bottom:10px;">
          <span style="font-size:8px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:2px 8px;">ORG</span>
          <span style="font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.25);margin-left:10px;">2026-06-12</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.4;">
          Archive Unsealing Protocol — Mass Signal Declassification
        </div>
        <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:14px;">
          The Collective initiates controlled release of long-archived parallel-world signal data. All members are directed to participate in signal-locking procedures. Time investment per unit is minimal; aggregate contribution yields significant expansion of world-mapping coverage.
        </div>
        <a href="https://putopia.vercel.app/intel/INT-640129" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.35);">
          READ DISPATCH →
        </a>
      </td></tr>
    </table>

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
          Over 100 years ago, the Multiverse Collective came close to total collapse. Understanding that history is essential — our goal is not aggression, but building connections across worlds on goodwill and positive energy.
        </div>
        <a href="https://putopia.vercel.app/intel/INT-628014" style="display:inline-block;font-size:9px;letter-spacing:0.2em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.35);">
          READ DISPATCH →
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

  <!-- ── CTA BLOCK — GROUP B (TASK GATED) ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(232,160,32,0.35);overflow:hidden;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,0.5),transparent);"></div>

    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px;">
      <tr>
        <td>
          <div style="font-size:8px;letter-spacing:0.3em;color:rgba(232,160,32,0.6);margin-bottom:16px;">
            ◈ &nbsp;YOUR PATH TO VOYAGER &nbsp;◈
          </div>

          <div style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#F5F5F5;margin-bottom:12px;line-height:1.25;">
            COMPLETE YOUR FIELD<br/>ASSESSMENT TO ADVANCE.
          </div>

          <div style="font-size:11px;color:rgba(245,245,245,0.55);line-height:1.9;margin-bottom:20px;max-width:460px;">
            The Multiverse Collective evaluates all Applicants before granting Voyager status. Complete four tasks to demonstrate your readiness — then your Voyager Pack will be waiting for you.
          </div>

          <!-- Task progress list -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(232,160,32,0.1);">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;font-size:11px;color:rgba(232,160,32,0.4);">01</td>
                    <td style="padding-left:12px;font-size:10px;letter-spacing:0.1em;color:rgba(245,245,245,0.45);">Report a Sighting</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(232,160,32,0.1);">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;font-size:11px;color:rgba(232,160,32,0.4);">02</td>
                    <td style="padding-left:12px;font-size:10px;letter-spacing:0.1em;color:rgba(245,245,245,0.45);">Cast Two Votes</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(232,160,32,0.1);">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;font-size:11px;color:rgba(232,160,32,0.4);">03</td>
                    <td style="padding-left:12px;font-size:10px;letter-spacing:0.1em;color:rgba(245,245,245,0.45);">Read an Architect Report</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;font-size:11px;color:rgba(232,160,32,0.4);">04</td>
                    <td style="padding-left:12px;font-size:10px;letter-spacing:0.1em;color:rgba(245,245,245,0.45);">Pass the Field Assessment</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- CTA button -->
          <a href="https://putopia.vercel.app/console"
             style="display:inline-block;background:rgba(232,160,32,0.1);color:#E8A020;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.2em;text-decoration:none;padding:14px 32px;border:1px solid rgba(232,160,32,0.5);">
            [ VIEW MY PROGRESS ]
          </a>

          <!-- After completion note -->
          <div style="margin-top:20px;padding:14px 16px;background:rgba(255,107,53,0.04);border:1px solid rgba(255,107,53,0.12);">
            <div style="font-size:8px;letter-spacing:0.15em;color:rgba(255,107,53,0.45);margin-bottom:6px;">UPON COMPLETION</div>
            <div style="font-size:10px;color:rgba(245,245,245,0.4);line-height:1.7;">
              Once all four tasks are marked complete, the Initial Voyager Pack ($12) will unlock — securing your badge and full network access.
            </div>
          </div>

          <div style="margin-top:14px;font-size:8px;letter-spacing:0.1em;color:rgba(245,245,245,0.2);">
            Questions about your progress? Reply to this email
          </div>
        </td>
      </tr>
    </table>

    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,0.2),transparent);"></div>
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
