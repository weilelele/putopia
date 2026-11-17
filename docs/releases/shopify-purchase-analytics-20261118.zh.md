# Shopify 支付漏斗埋点调整

实现分支为 `codex/shopify-purchase-analytics`。应用代码和 `supabase/schema_v125.sql` 尚待发布，迁移尚未应用于生产。

## 漏斗与事件

| 行为或事实 | 事件 | 统计规则 |
| --- | --- | --- |
| 进入 Initiation | `initiation_page_viewed` | 沿用站内访问 |
| 实际看到主价格 | `initiation_price_viewed` | 至少 50% 可见、连续 1 秒、无弹窗 |
| 点击付款 | `initiation_cta_clicked` | 沿用现有事件，区分套餐与页面入口 |
| 服务端生成并绑定结账链接 | `initiation_checkout_started` | 同一订单一次，`checkout_evidence=server_checkout_created` |
| 浏览器收到有效链接并准备跳转 | `initiation_checkout_redirected` | 标明 `payment_provider` 和 `checkout_path`，使用 Beacon 发送 |
| 发起结账失败 | `initiation_checkout_failed` | 记录步骤及 HTTP 状态，错误文案不进入埋点 |
| 核验实付 | `initiation_purchase_completed` | Shopify 已核验扣款，或 Stripe 已核验付款 |

站内自动采集继续提供套餐单选控件的点击记录。统计套餐点击次数时，沿用已验证的控件筛选条件，在同一访问内截止到首次付款点击。

## Shopify 和 Stripe 的关联

Shopify 结账保存原访问的 `page_visit_id`、广告 UTM、广告组 ID、PostHog 浏览器 distinct ID 和 session ID。两个 PostHog ID 只接受 UUID，拒绝邮箱及任意文本。回传事件使用保存的浏览器身份，支持用户付款时尚未完成账户激活的路径。旧订单缺少浏览器身份时继续使用业务用户 ID。

`payment_provider=shopify|stripe` 由服务端订单绑定或经过验证的跳转域名决定。`analytics_version=checkout-providers-v2` 用于区分本次埋点实现。`page_version` 和 `pricing_version` 保留页面和实际报价的含义。

Shopify purchase 使用现有核验流程写入的订单和 capture 绑定。必须同时有正式订单、已批准的 authorization、不同的 capture、`status=paid` 及原始 `paid_at`。套餐、金额、店铺和本地订单绑定均须匹配。授权阶段只产生 checkout。上报前再次读取本地状态和 capture 绑定。

两个渠道共用现有 outbox。事件 UUID、原始时间和订单唯一键在重试中保持一致。Shopify 新结账链接绑定与 checkout 事件写入同一事务，付款确认由现有 paid 触发器入队。浏览器追踪退出选择继续生效，发送失败由 cron 重试。迁移不回填历史订单。

发送至 PostHog 的属性不含结账 URL、cart key、激活链接、邮箱、地址、支付凭据或原始错误响应。

## 日报与回本分析

商业路径使用价格曝光 → 付款点击 → 结账 → 已核验实付。账户注册单独统计，允许先付款后注册。留资到实付的队列只要求同一用户、留资早于付款以及统一观察窗口，另报告注册前付款人数。

正式付款同时纳入 Shopify 与 Stripe。Shopify 订单不能要求存在 Stripe Session 或 PaymentIntent。Shopify 用 `initiation_shopify_checkouts` 的订单及 capture 绑定核验，Stripe 保留原有 live 付款核验。按本地订单 ID 去重，金额按业务订单实际金额及币种拆分。测试和 QA 排除规则继续适用。

首次邮箱留资需要合并 applications 和已确认的结账邮箱接收事实，按规范化邮箱的历史首次成功接收去重。预建 auth 账户不代表完成注册。跨入口关联或历史数据不足时标记覆盖范围与未知项。

结账数量以 outbox 的 `event_time` 计日，另列浏览器跳转数量。链接创建、浏览器跳转和 Shopify 页面到达分别解释。迁移前缺少 checkout 事件的 Shopify 记录，其实际结账开始时间写未知。

## Shopify 内部步骤与 Meta

当前改动覆盖站内行为、结账链接及实付回传。Shopify 内部的 `checkout_started`、`checkout_contact_info_submitted`、`checkout_address_info_submitted`、`checkout_shipping_info_submitted`、`payment_info_submitted` 和 `checkout_completed` 需要在 Shopify Customer Events 配置 Pixel 后接入。实际页面加载、地址、配送和支付阶段的流失，在 Pixel 上线并验收前写未知。

Pixel 仅转发阶段名称、事件 ID、时间及无个人信息的订单关联键。订单实付以已核验的服务端 capture 为准。Shopify 的 `checkout_completed` 可能因页面未加载而漏发。

Meta Purchase 的现有自建 CAPI worker 仍以 Stripe 为依据。上线前应核对 Shopify 的 Facebook & Instagram 渠道是否已经回传 Purchase，并确定事件去重与金额口径。该项需在 Shopify／Meta 后台核验，当前 PR 不声称已接通 Shopify 广告归因。

## 验证与发布

先应用 v125，再发布应用代码，最后核对生产中新触发的 Shopify checkout／purchase 是否有 provider、原始时间和正确金额。历史 `disabled=true` 记录保留原状。此前的历史日报需要用业务订单重核，不能从新增埋点倒推过去的页面行为。

本地 SQL 验证只使用合成内存数据库。

```sh
node supabase/tests/shopify-analytics-v125.mjs /path/to/@electric-sql/pglite/dist/index.js
```

SQL 验证覆盖无历史回填、仅预留席位时无 checkout、URL 绑定时入队、重放去重、paid 时间、追踪退出、事务回滚及权限。Vitest 覆盖 Shopify／Stripe 证据分流、跨域访客关联、授权未扣款、金额与身份校验、退款状态、重复发送及隐私字段。

[Shopify checkout_started](https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_started) · [Shopify checkout_completed](https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_completed)
