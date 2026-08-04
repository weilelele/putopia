# Device Batch 默认邮件文案审核稿

本文只整理 Device Batch 相关邮件。点击 Follow 不发送邮件；Follow 只决定成员是否接收后续的 Batch 重大进展。

文案中的 `{变量}` 会在发送时替换为对应 Batch、订单或物流数据。邮件默认使用英文，与当前 Device 页面语言一致。

## 统一结构

- 发件人：`Multiverse Collective`
- Reply-to：`voyagers@multiverseco.org`
- 顶部：Multiverse Collective wordmark
- 默认页脚：`Building better worlds, together.`
- Batch 链接：`/devices/batches/{BATCH_SLUG}`

## 1. Batch 重大进展

触发：Architect 在 Batch 后台确认后，手动发送给 followers。

**Subject**

`{BATCH_CODE} update — {UPDATE_TITLE}`

**Eyebrow**

`{BATCH_CODE} · field update`

**Title**

`{UPDATE_TITLE}`

**Intro**

`A major update has been added to the {BATCH_NAME} record.`

**正文**

`{UPDATE_DATE}`

`{UPDATE_BODY}`

**CTA**

`Read the full record →`

**Footer**

`You received this because you follow this Batch.`

## 2. Distribution Pack 进入 Current

触发：Architect 将某个 Pack 设为 Current 后，手动发送给该 Batch 的有效购买者。

**Subject**

`{BATCH_CODE} — {PACK_LABEL} in progress`

**Eyebrow**

`{BATCH_CODE} · distribution`

**Title**

`{PACK_LABEL}`

**Intro**

`{PACK_LABEL} is now the active distribution stage for your Batch.`

**信息字段**

- Distribution：`{PACK_LABEL}`
- Status：`in progress`
- Window：`{PACK_WINDOW}`
- Field note：`{PACK_SUMMARY}`

**CTA**

`View distribution record →`

**Footer**

`This is a transactional update for a Batch you claimed.`

## 3. Distribution Pack 标记 Completed

触发：Architect 将某个 Pack 设为 Completed 后，手动发送给该 Batch 的有效购买者。

**Subject**

`{BATCH_CODE} — {PACK_LABEL} completed`

**Eyebrow**

`{BATCH_CODE} · distribution`

**Title**

`{PACK_LABEL}`

**Intro**

`{PACK_LABEL} has been marked complete for your Batch.`

**信息字段**

- Distribution：`{PACK_LABEL}`
- Status：`completed`
- Window：`{PACK_WINDOW}`
- Field note：`{PACK_SUMMARY}`

**CTA**

`View distribution record →`

**Footer**

`This is a transactional update for a Batch you claimed.`

## 4. Claim 支付成功

触发：Stripe 确认付款成功。

**Subject**

`{BATCH_CODE} — Your Batch claim is confirmed`

**Eyebrow**

`Payment confirmed`

**Title**

`Your Console is secured`

**Intro**

`Payment has been verified and your name is now attached to this Batch record.`

**信息字段**

- Batch：`{BATCH_CODE}`
- Distribution：`{PACK_COUNT} packs`
- Total：`{ORDER_TOTAL} {CURRENCY}`

**CTA**

`Open batch record →`

**Footer**

`Building better worlds, together.`

## 5. 开始备货

触发：订单状态更新为 Preparing。

**Subject**

`{BATCH_CODE} — Your first distribution is being prepared`

**Eyebrow**

`Order update`

**Title**

`Preparation has started`

**Intro**

`The field team has moved your Batch claim into preparation.`

**信息字段**

- Batch：`{BATCH_CODE}`
- Distribution：`{PACK_COUNT} packs`

**CTA**

`Open batch record →`

**Footer**

`Building better worlds, together.`

## 6. 包裹发出

触发：订单状态更新为 Shipped。

**Subject**

`{BATCH_CODE} — A Batch package is on its way`

**Eyebrow**

`Shipment update`

**Title**

`Package dispatched`

**Intro**

`A package connected to your Batch claim has left the field station.`

**信息字段**

- Batch：`{BATCH_CODE}`
- Distribution：`{PACK_COUNT} packs`
- Tracking：`{TRACKING_NUMBER}`，存在时显示

**CTA**

- 有合法物流链接：`Track package →`
- 没有物流链接：`Open batch record →`

**Footer**

`Building better worlds, together.`

## 7. 包裹签收

触发：订单状态更新为 Delivered。

**Subject**

`{BATCH_CODE} — Your Batch package was delivered`

**Eyebrow**

`Delivery update`

**Title**

`Delivery recorded`

**Intro**

`The carrier has marked your Batch package as delivered.`

**信息字段**

- Batch：`{BATCH_CODE}`
- Distribution：`{PACK_COUNT} packs`
- Tracking：`{TRACKING_NUMBER}`，存在时显示

**CTA**

`Open batch record →`

**Footer**

`Building better worlds, together.`

## 8. 支付失败

触发：Stripe 确认异步付款失败。

**Subject**

`{BATCH_CODE} — Your Batch payment needs attention`

**Eyebrow**

`Payment update`

**Title**

`Payment was not completed`

**Intro**

`Your claim has not been activated. You can return to the Batch record and try again.`

**信息字段**

- Batch：`{BATCH_CODE}`
- Distribution：`{PACK_COUNT} packs`

**CTA**

`Return to claim →`

**Footer**

`Building better worlds, together.`

## 9. 退款完成

触发：Stripe 确认全额退款，或 Architect 在后台将订单标记为 Refunded。

**Subject**

`{BATCH_CODE} — Your Batch payment was refunded`

**Eyebrow**

`Payment update`

**Title**

`Refund recorded`

**Intro**

`A refund has been recorded for this Batch claim.`

**信息字段**

- Batch：`{BATCH_CODE}`
- Distribution：`{PACK_COUNT} packs`

**CTA**

`Open batch record →`

**Footer**

`Building better worlds, together.`
