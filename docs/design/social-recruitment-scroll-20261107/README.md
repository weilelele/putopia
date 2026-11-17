# Recruitment scrolling fix and centered poster

The recruitment main element inherited a viewport-sized grid track inside an overflow-hidden app shell, but its own overflow remained visible. Real mouse/touch gestures left scrollTop at 0 even though the Dashboard link sat at y=2618px on a 390×844 viewport. The earlier check used programmatic element scrolling and did not establish that users could scroll.

The route now has height:100%, min-height:0 and overflow-y:auto, keeping exactly one bounded scroll container without changing shared shell rules or other routes. Real CDP touch swipes at 390×844 and 320×844 scroll to the bottom, and an upward swipe moves back. Desktop wheel at 1440×1000 reaches the bottom. Dashboard button remains fully visible with bottom padding. All cases have no horizontal overflow or page exceptions. See scroll-verification.json and the scrolled-to-application screenshots.

The poster now follows a centered vertical axis: both original logos, each line of approved recruitment copy, the real QR and website. Original brand pixels are restored from the prior finished artwork, preserving the exact protected assets. QR uses the previously verified exact module matrix and was decoded again at 390px-wide preview size to https://multiverseco.org/recruit/social.

## Built-in ImageGen edit prompt

Edit the provided 4:5 recruitment poster ONLY to make its entire composition CENTER-ALIGNED on a single vertical axis. Preserve the same Pack 1 navy paper, warm dark wood, brass clip, original orange wordmark and original orange graphic logo. Preserve the exact approved English copy and its confident hierarchy; do not change meaning, invent a headline or omit any line.
The two logos at the top already align centrally: KEEP their existing size, appearance, aspect ratios and placement. The top 32% should stay visually identical. We will restore original protected logo pixels afterward. Every line below must also be individually horizontally centered, not just the overall paragraph block. The role title is the largest readable off-white text, WE'RE HIRING orange. Give sections generous breathing space, no compressed leading. Courier Prime/typewriter ink printed naturally in the actual physical paper.
Center these exact lines in this order:
WE'RE HIRING
Social Media &
Community Intern

Love games, sci-fi & fantasy?
Turn that curiosity into content.
Create with AI. Connect with people.

The question and the following two lines are three distinct CENTERED lines with roomy line-height, matching the approved poster. Preserve the role name and every word exactly. Position the hiring and invitation groups within 34-68% of image height, like the input, but centrally balanced.
Remove the previous footer QR, its side caption and old left-aligned URL. Leave the bottom 29% plain UNPRINTED dark navy paper; we will composite a verified real QR code centered on the vertical axis, a small centered caption above it and the centered URL below it. Do not generate a QR, footer text or placeholder box in that reserved field. Preserve the large original wordmark AND graphic logo prominently at the top. No new objects, frames, glow or other treatments. Output 4:5 portrait.
