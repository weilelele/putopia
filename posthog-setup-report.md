<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Putopia Collective platform. PostHog was already partially initialized (`posthog-js` installed, `instrumentation-client.ts` bootstrapped). The wizard extended that foundation with `capture_exceptions`, `defaults`, and `debug` options, installed `posthog-node` for server-side tracking, created a `posthog-server.ts` helper, and instrumented 10 key business events across 8 files — covering both client-side and server-side actions. Users are identified at login and registration to correlate events across sessions.

| Event | Description | File |
|---|---|---|
| `user_logged_in` | User successfully authenticated with email and password | `src/app/login/page.tsx` |
| `login_failed` | Login attempt failed due to incorrect credentials or server error | `src/app/login/page.tsx` |
| `application_submitted` | Visitor submitted a Voyager application (top of conversion funnel) | `src/app/apply/page.tsx` |
| `account_registered` | Invited applicant completed account setup (display name + password) | `src/app/register/page.tsx` |
| `vote_cast` | User cast a vote on an active collective proposal | `src/app/vote/page.tsx` |
| `intel_comment_sent` | User transmitted a comment on an Intel feed entry | `src/app/intel/[id]/page.tsx` |
| `log_comment_sent` | User transmitted a comment on a Voyager log entry | `src/app/logs/[id]/page.tsx` |
| `story_submitted` | Voyager submitted a new story (server-side, pending architect review) | `src/lib/actions/stories.ts` |
| `vote_response_submitted` | Vote response recorded server-side after submission | `src/lib/actions/votes.ts` |
| `application_reviewed` | Architect approved or rejected a Voyager application | `src/lib/actions/applications.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1590722)
- [Voyager Acquisition Funnel](/insights/zcEextaN) — conversion from application submitted → account registered
- [Login Activity](/insights/Unyz2Iv8) — logins vs login failures over time
- [Community Engagement](/insights/7ANuKJd2) — intel comments, log comments, and votes cast
- [Story Submissions](/insights/svKufAXW) — new Voyager stories submitted per week
- [Application Review Outcomes](/insights/SF2r1y71) — applications approved vs rejected by status

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
