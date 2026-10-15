# Initiation engagement instrumentation

Extends the existing page → price → CTA → server checkout → captured purchase funnel. Events retain its visit, tier, QA, test and attribution properties. No database migration is needed.

- `initiation_scroll_depth`: 25/50/75/90/100, once per mounted visit. Measures the bottom edge of the clipped viewport relative to route content, not the browser document or shell height. Initial viewport exposure counts as reached content, not proof of reading.
- `initiation_section_viewed`: intro, pack_1–4, mission_board, intel, participation, payment, faq. Half of the smaller of the section or clipped viewport must be visible continuously for 1 second.
- `initiation_section_dwell`: sum `active_ms` deltas, not `total_active_ms`. Checkpoints every 10 seconds, on backgrounding/blur, pagehide and unmount. Excludes modal, hidden, unfocused and over-60-second idle time. Visible sections may overlap, so their summed times are not unique page time. Timer intervals are capped at one second to avoid counting suspended execution. Network/browser termination can still lose a final partial interval.
- Calibration events: start, question display/first interaction/submit/back, corrective review, save started/failed/acknowledged, exit. `calibration_attempt_id` correlates questions 1–5. `elapsed_ms` is wall time, not active reading time. Returning to the introduction retains the attempt. Completed-state hydration is not a new completion.
- Answers, location, work and observation are excluded from explicit payloads. The question form is excluded from autocapture and masked in replay.

Use `is_test=false` and `is_internal_qa=false` for production reporting. Filter engagement events to `engagement_version=20261016`. Existing funnel page version is retained for compatibility.

## Payment audit

Production read-only inspection found the analytics trigger installed and no pending analytics outbox rows. Four live orders were canceled; the latest was 2026-10-13, before the October 14 tracking release. No captured customer purchase exists to use as production delivery proof. Existing outbox tests cover capture-only evidence, refund races, deduplication UUIDs, lease loss, retry and ingestion acknowledgements. No live charge or production webhook replay was performed.
