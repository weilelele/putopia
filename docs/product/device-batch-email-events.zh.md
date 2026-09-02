# Device Batch 邮件事件

这份清单定义 Device Batch 从关注、购买到出货期间会发送的邮件。后台的内容保存与邮件发送是两个独立动作：编辑或保存 Batch 不会自动群发。

## 事件矩阵

| 场景 | 收件人 | 触发方式 | 邮件内容 |
| --- | --- | --- | --- |
| Batch 重大进展 | 开启邮件关注的 followers | 后台手动确认发送 | 最新进展标题、日期、摘要、Batch 入口 |
| Claim 支付成功 | 购买者 | Stripe webhook 自动 | 购买确认、Batch、价格、Pack 数量 |
| 支付失败 | 购买者 | Stripe webhook 自动 | 支付未完成、重新进入 Batch 的入口 |
| 开始备货 | 购买者 | 后台更新订单状态 | 当前订单状态与 Batch 入口 |
| 包裹发出 | 购买者 | 后台更新订单状态 | 物流单号；有合法物流链接时直接进入物流页 |
| 包裹签收 | 购买者 | 后台更新订单状态 | 签收记录与 Batch 入口 |
| 退款完成 | 购买者 | Stripe 全额退款事件或后台状态更新 | 退款记录 |
| Pack 进入 Current | 该 Batch 的有效购买者 | Batch 后台手动发送 | 当前 Pack、时间窗、现场说明 |
| Pack 标记 Completed | 该 Batch 的有效购买者 | Batch 后台手动发送 | 已完成的 Pack、时间窗、现场说明 |

## 发送规则

- Follow 和 Unfollow 只更新关注状态，本身不发送邮件。Follow 成功后，成员才会进入后续重大进展邮件的接收名单。
- Batch 重大进展必须勾选发送确认，再点击邮件按钮；保存草稿不会发送。
- Distribution Pack 只有在状态为 `current` 或 `completed` 时才能通知 holders。
- 同一事件使用固定 event key 去重。后台重复点击、Stripe webhook 重试或页面重载不会重复发送已经记录成功的邮件。
- 发货邮件在物流信息变化后可再次发送；不同物流信息会生成新的事件记录。
- 订单邮件只用于 `device_batch_claim`，不会改变现有 Voyager Pack 邮件逻辑。
- 群发按小批次节流，避免超过邮件服务的默认速率限制。

## 配置

- `RESEND_API_KEY`：Resend API key。未配置时不发送，并把失败原因保留给后台。
- `RESEND_FROM`：通过域名验证的发件人。
- `COLLECTIVE_REPLY_TO`：成员回复邮件时进入的团队邮箱。
- `NEXT_PUBLIC_SITE_URL`：邮件内 Batch 链接的站点根地址。

Device 分支原 v57/v58 的前置表结构已保存在 `supabase/schema_v68.sql`；`main` 的 v57/v58 是 iOS 推送迁移，不可替换。首次安装 Device 功能需先应用 v68，再应用 v59–v67 中尚未应用的部分。已安装 Device 功能的数据库不要重放旧前置定义，先核对实际结构。详见 [合并与迁移说明](../releases/device-worlds-main-integration.md)。迁移本身不会发送邮件。
