# Password recovery rollout

The login page sends reset requests through Supabase Auth, which manages email rate limits and one-time tokens. The reset page verifies the token when the user submits a new password. It does not sign the browser into the app.

Before making the flow available on production:

1. In Supabase Authentication → URL Configuration, confirm the **Site URL** is `https://multiverseco.org` (no trailing slash). The template uses this fixed origin, so a preview sharing production Auth will also send users to production.
2. Confirm [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) is configured for delivery to public users. Disable link tracking on authentication emails so the provider does not rewrite the one-time link.
3. Install [reset-password.html](../../supabase/email-templates/reset-password.html) in Authentication → Email Templates → **Reset Password**. Use the subject `Reset your Multiverse Collective password`. Coordinate this with deployment of the reset route.

In a separate test Supabase project, use the same template with that project's own Site URL. With a test account, request a link from `/login`, open the link in another browser, set a new password, and log in with it. Reopening the used link should offer a new request instead of allowing another reset. Also verify that an unknown address receives the same on-screen response.
