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
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:22px 28px 20px;">
      <tr>
        <!-- Logo + label -->
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:11px;">
                <img src="https://putopia.vercel.app/assets/vi-icon.png"
                     height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://putopia.vercel.app/assets/vi-wordmark.png"
                     height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;">
            WEEKLY NEWSLETTER
          </div>
        </td>
        <!-- Status badge -->
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;border:1px solid rgba(196,169,106,0.45);padding:5px 12px;background:rgba(196,169,106,0.06);">
            <div style="font-size:7px;letter-spacing:0.2em;color:rgba(196,169,106,0.55);">STATUS</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;color:rgba(196,169,106,0.85);">APPLICANT</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="height:10px;"></td></tr>

  <!-- ── INTEL SECTION ── -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
        <td style="padding:0 12px;white-space:nowrap;font-size:8px;letter-spacing:0.3em;color:#FF6B35;">— LATEST INTEL —</td>
        <td style="height:1px;background:rgba(255,107,53,0.12);"></td>
      </tr>
    </table>

    <!-- Intel 1: Valentina Cruz / INT-640130 / NOTICE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0F1430;border:1px solid rgba(255,107,53,0.12);border-left:2px solid rgba(245,245,245,0.2);">
      <tr><td style="padding:13px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:9px;">
          <tr>
            <td style="width:26px;vertical-align:middle;">
              <img src="https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/403b32a7-8d85-4cdd-9c7f-4f2c7919d726/avatar.jpg"
                   width="20" height="20"
                   style="width:20px;height:20px;border-radius:50%;display:block;border:1px solid rgba(255,255,255,0.1);" />
            </td>
            <td style="vertical-align:middle;padding-left:7px;font-size:9px;letter-spacing:0.05em;color:rgba(245,245,245,0.38);">Valentina Cruz</td>
            <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
              <span style="font-size:7px;letter-spacing:0.18em;color:rgba(245,245,245,0.45);border:1px solid rgba(245,245,245,0.18);padding:1px 5px;">NOTICE</span>
              <span style="font-size:7px;letter-spacing:0.08em;color:rgba(245,245,245,0.2);margin-left:6px;">2026-06-12</span>
            </td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:5px;line-height:1.35;">Collective&#39;s badges will soon be available to claim.</div>
        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.65;margin-bottom:9px;">We&#39;ve prepared a special badge for everyone who aspires to become a Voyager.</div>
        <a href="https://putopia.vercel.app/intel/INT-640130" style="font-size:8px;letter-spacing:0.18em;color:rgba(245,245,245,0.45);text-decoration:none;border-bottom:1px solid rgba(245,245,245,0.2);">READ →</a>
      </td></tr>
    </table>

    <!-- Intel 2: Maren Solberg / INT-640129 / ORG -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0F1430;border:1px solid rgba(255,107,53,0.12);border-left:2px solid rgba(255,107,53,0.5);">
      <tr><td style="padding:13px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:9px;">
          <tr>
            <td style="width:26px;vertical-align:middle;">
              <img src="https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/6402815a-72e8-4bad-836b-c8c7add76120/avatar.jpg"
                   width="20" height="20"
                   style="width:20px;height:20px;border-radius:50%;display:block;border:1px solid rgba(255,107,53,0.2);" />
            </td>
            <td style="vertical-align:middle;padding-left:7px;font-size:9px;letter-spacing:0.05em;color:rgba(245,245,245,0.38);">Maren Solberg</td>
            <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
              <span style="font-size:7px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:1px 5px;">ORG</span>
              <span style="font-size:7px;letter-spacing:0.08em;color:rgba(245,245,245,0.2);margin-left:6px;">2026-06-12</span>
            </td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:5px;line-height:1.35;">Archive Unsealing Protocol — Mass Signal Declassification</div>
        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.65;margin-bottom:9px;">Long-archived parallel-world signal data is now being released for distributed classification.</div>
        <a href="https://putopia.vercel.app/intel/INT-640129" style="font-size:8px;letter-spacing:0.18em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.3);">READ →</a>
      </td></tr>
    </table>

    <!-- Intel 3: Ryo Tanaka / INT-628014 / ORG -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;background:#0F1430;border:1px solid rgba(255,107,53,0.12);border-left:2px solid rgba(255,107,53,0.5);">
      <tr><td style="padding:13px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:9px;">
          <tr>
            <td style="width:26px;vertical-align:middle;">
              <img src="https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/86fadca3-8739-4553-9179-c4d0e84895ee/avatar.jpg"
                   width="20" height="20"
                   style="width:20px;height:20px;border-radius:50%;display:block;border:1px solid rgba(255,107,53,0.2);" />
            </td>
            <td style="vertical-align:middle;padding-left:7px;font-size:9px;letter-spacing:0.05em;color:rgba(245,245,245,0.38);">Ryo Tanaka</td>
            <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
              <span style="font-size:7px;letter-spacing:0.18em;color:#E85D04;border:1px solid rgba(232,93,4,0.35);padding:1px 5px;">ORG</span>
              <span style="font-size:7px;letter-spacing:0.08em;color:rgba(245,245,245,0.2);margin-left:6px;">2026-06-07</span>
            </td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:5px;line-height:1.35;">Why does our organization need to exist?</div>
        <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.65;margin-bottom:9px;">Over 100 years ago, the Collective nearly collapsed — a message on what that means for our mission today.</div>
        <a href="https://putopia.vercel.app/intel/INT-628014" style="font-size:8px;letter-spacing:0.18em;color:#FF6B35;text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.3);">READ →</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- ── CTA BLOCK — GROUP A (DIRECT) — two-column layout ── -->
  <tr><td style="background:linear-gradient(160deg,#1A0E2A,#0F1430);border:1px solid rgba(255,107,53,0.45);overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Left: product image -->
        <td width="210" style="vertical-align:top;padding:0;overflow:hidden;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png"
               width="210" alt="Initial Voyager Pack"
               style="width:210px;display:block;" />
        </td>
        <!-- Right: content + CTA -->
        <td style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(255,107,53,0.6);margin-bottom:9px;">◈ INITIAL VOYAGER PACK ◈</div>

          <div style="font-size:15px;font-weight:700;letter-spacing:0.07em;color:#F5F5F5;margin-bottom:14px;line-height:1.3;">
            YOUR VOYAGER<br/>STATUS IS READY.
          </div>

          <!-- Feature list -->
          <div style="margin-bottom:6px;font-size:12px;color:rgba(245,245,245,0.65);letter-spacing:0.03em;line-height:1;">Physical Badge</div>
          <div style="margin-bottom:6px;font-size:12px;color:rgba(245,245,245,0.65);letter-spacing:0.03em;line-height:1;">Access Card</div>
          <div style="margin-bottom:10px;font-size:12px;color:rgba(245,245,245,0.65);letter-spacing:0.03em;line-height:1;">Full Network Access</div>

          <!-- Price -->
          <div style="font-size:22px;font-weight:700;color:#FF6B35;letter-spacing:0.05em;margin-bottom:18px;line-height:1;">$12</div>

          <!-- Buy button -->
          <a href="https://putopia.vercel.app/voyager-pack"
             style="display:block;text-align:center;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-decoration:none;padding:12px 14px;margin-bottom:12px;">
            [ ACTIVATE NOW ]
          </a>

          <div style="text-align:center;">
            <a href="https://putopia.vercel.app/voyager-pack"
               style="font-size:9px;letter-spacing:0.1em;color:rgba(255,107,53,0.5);text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.22);">
              Learn more about this item →
            </a>
          </div>
        </td>
      </tr>
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
