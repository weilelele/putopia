# Draft email — Voyager Initiation stuck payment (DRAFT, NOT SENT)

Owner to review, fill in the placeholders and send personally. An HTML version in the standard Collective email look is in `2026-10-initiation-stuck-payment-email.html`. Contains no buyer email, address or token: use `{{first_name}}`.

---

## English

**Subject:** Your S26 Voyager membership is active — and we're sorry about the error page

Hi {{first_name}},

Thank you for joining the S26 Voyager Initiation, and I'm sorry for the trouble when you did.

**Your payment of $488 on October 24 went through, and you were charged once only.** There is nothing to pay again and nothing to retry.

On our side, something failed after your payment: your membership did not activate, and when you came back from checkout you saw an error page instead of a confirmation. That was our fault, not yours. We fixed it on October 26, and your S26 Voyager membership is now active. Everything from your order is in place.

**Where to see it**

Sign in at multiverseco.org with the account you used at checkout. Open **Initiation** (/voyager-initiation) to see your membership and your order, and **Console** (/console) for your dashboard.

[OPTIONAL GESTURE — owner to decide: any goodwill offer, or delete this line]

If anything looks wrong, or you simply have a question, reply to this email. It reaches the team directly.

Thank you for your patience, and welcome to the Collective.

[SIGNATURE — owner]

---

## 中文翻译（供 owner 审阅，不发送）

**主题：** 你的 S26 Voyager 会员已生效——为错误页面向你道歉

{{first_name}} 你好，

感谢你加入 S26 Voyager Initiation，也为你加入时遇到的麻烦向你道歉。

**你在 10 月 24 日支付的 $488 已经成功，且只扣款一次。** 你不需要再次付款，也不需要重试。

付款之后，我们这边出了故障：你的会员没有成功激活，你从结账页返回时看到的是错误页面，而不是确认页。这是我们的问题，不是你的问题。我们已在 10 月 26 日修复，你的 S26 Voyager 会员现已生效，订单内容均已就位。

**在哪里查看**

用结账时使用的账号登录 multiverseco.org。打开 **Initiation**（/voyager-initiation）查看会员与订单，打开 **Console**（/console）查看你的仪表盘。

[可选补偿 —— owner 决定：任何善意补偿，或删除此行]

如果有任何不对劲，或者只是有疑问，直接回复这封邮件即可，会直接送达团队。

感谢你的耐心，欢迎加入 Collective。

[署名 —— owner]

---

## Facts checked

Verified read-only against production Supabase (REST `select` only) on 2026-10-27:

- `initiation_orders` id `3771b2aa…`: `order_kind = standard` (Complete Voyager Pack), `amount = 48800`, `status = paid`, `created_at` 2026-10-24 20:17 UTC.
- `initiation_orders` for this user: that is the only order, so there is no second order in our records (supports "charged once").
- `initiation_members`: `batch = S26`, `active = true`, `source = paid`, linked to that order, created 2026-10-26 07:10 UTC.

**Not verified** — a later batch of production reads (shipments, voyager profile, order columns) was blocked by the permission classifier and not retried:

- `initiation_orders.currency` and `paid_at` (the 07:10 UTC time above comes from the member row, not the order row).
- `initiation_shipments` (4 packs and their planned months). The email no longer states a schedule, so this only matters for your own records.
- `voyager_profiles`: role `voyager`, batch S26, member number. The member number is deliberately left out of the email.
- "Charged once" is checked only against our own order table. Confirm in the Stripe dashboard that there is a single captured PaymentIntent of $488 for this buyer before sending.

Copy sources, read from `origin/main` (not the checkout's uncommitted work):

- `src/app/voyager-initiation/initiation-view.tsx`: the "Initiation confirmed" member view, links to /voyager-initiation and /console.
- `src/lib/initiation-pricing.ts`: Complete Voyager Pack = $488.
- `src/lib/initiation-email.ts`: wording of the standard confirmation email.

Note: the benefits and dispatch schedule were removed at the owner's request, so the email does not mention packs, the Console or dates.
