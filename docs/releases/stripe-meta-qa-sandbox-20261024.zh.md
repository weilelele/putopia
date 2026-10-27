# Stripe / Meta Ads 独立线上沙盒

> 2026-10-25：QA 站点已暂停，结账与 Stripe webhook 已关闭。数据库暂停待确认，详见末尾关闭记录。

2026-10-24 建立。用于多人测试付款、签名 webhook 和后续 Meta Test Events 联调。

## 入口与隔离范围

| 项目 | 配置 |
| --- | --- |
| 测试购买页 | https://putopia-stripe-meta-qa.vercel.app/voyager-initiation |
| Vercel 项目 | `putopia-stripe-meta-qa` / `prj_8FdDESUZStbfGUcgC1w1vKJAPUPI` |
| 已验收部署 | `dpl_EfjKNmX3458DQrvWVPUCd14xhYxS` |
| Stripe 沙盒 | `Putopia Meta Ads QA` / `acct_1UTxRiAPEEV0NYJ8` |
| Stripe 管理入口 | https://dashboard.stripe.com/acct_1UTxRiAPEEV0NYJ8/test/dashboard |
| Supabase 持久开发分支 | `stripe-meta-qa` / `gqcgdmmmmfbatdneacny` |
| Stripe webhook | `https://putopia-stripe-meta-qa.vercel.app/api/stripe/webhook` |
| 价格 | Initial $38 / Complete $488 / Upgrade $460，USD，一次性付款，含税 |

测试站使用独立 Stripe 账户和独立数据库。未复制正式用户、订单、邮件发送密钥、MongoDB 或 PostHog 凭据。Meta 使用本次新生成的 CAPI Token，仅配置于 QA 项目。部署配置的 `crons` 为空；浏览器 Meta / X / Reddit 广告像素通过 `NEXT_PUBLIC_AD_PIXELS_DISABLED=true` 关闭。

测试站是原应用的独立代码快照，主要用于付款链路。空库没有复制正式内容、NPC、设备库存或 Storage 文件；这些页面可能显示空状态。后续产品代码更新需要显式重新部署此项目。不要将 QA 数据库分支合并进正式库，也不要从正式站复制密钥来填补缺项。

## 凭据与复核

新测试密钥、签名密钥与 QA 数据库凭据保存在 Git 忽略的 `.env.stripe-meta-qa.local`，权限为 `0600`；线上变量仅写入上述 QA 项目。不要把它覆盖到现有 `.env.local`，也不要提交或在聊天里粘贴密钥。

只读复核当前沙盒账户、三档价格及 webhook：

```sh
node scripts/verification/configure-stripe-meta-sandbox.mjs .env.stripe-meta-qa.local
```

脚本的 `--apply` 只用于显式初始化独立测试沙盒：创建或复用当前价格并将本地 `INITIATION_CHECKOUT_ENABLED` 设为 `false`。它不建立数据库、不部署网站，也不自动开放付款。已验收环境日常检查使用上面的只读命令。

## 数据库建立方式

父项目历史迁移缺少基础表，自动分支迁移未能从空库重放。因此使用 Supabase CLI 临时连接做 **schema-only** 基线，导入 `public` 与其依赖的 `membership_private`，保留应用函数、RLS 与标准角色授权，恢复 `auth.users` 的资料创建触发器。没有导出或导入任何业务行。

导入时省略生产专用 `worldflow_reviewer_readonly` 的授权/策略及平台管理员默认权限。应用服务角色显式获得 `public` 序列的 `USAGE, SELECT`，用于会员编号；这补齐了更换对象所有者后不再隐式继承的权限。

QA 库另外应用已有的 `schema_v104.sql` 与 `schema_v106.sql`，以匹配当前游客付款代码；没有因此向正式库应用迁移。新库只初始化 `S26` 批次，`capacity=100`、`checkout_open=true`、`stripe_livemode=false`。Auth 回跳地址仅指向 QA 站，开启匿名测试登录；匿名客户端写入限制已建立。

本次建立方式是人工结构基线，不是已经修复历史迁移重放链。未来需要重建时仍需按该流程检查依赖，不能直接重置分支并假定自动迁移完整。

## 实际验收

在 390×844 手机竖屏通过测试站进入 Stripe Checkout，使用官方测试卡完成 $38 Initial 付款，再返回测试站。

- Checkout `cs_test_a14v8NGFA4HNqKPxkjD13qqwk536hJC5xoiQeNRrga2vcX2mrt8PU2p05q`：`complete / paid / livemode=false`。
- PaymentIntent `pi_3UTxo6APEEV0NYJ80tNlq3zV`：`succeeded`，测试捕获 `3800` 美分。
- 测试订单 `f017c8c3-9170-4f60-9af2-b29be14af4f3`：`paid`；1 条有效会员记录、2 条 Pack 发货记录。
- 签名完成事件 `evt_1UTxo7APEEV0NYJ8cVTywrJP`：`processed`；该测试事件曾在补齐 QA 序列权限后定向重投。无签名请求返回 HTTP 400。
- 页面显示 `INITIATION CONFIRMED`。机器可读证据与手机截图位于 `output/stripe-sandbox-20261024/`。
- 发现并修复游客空邮箱传入 Stripe 的错误；结账时省略空的 `customer_email`，由 Stripe 收集邮箱。
- `design:check`、TypeScript、lint、814 项测试、本地生产构建与 Vercel 构建通过；lint 保留既有 26 个警告。

复测卡号：`4242 4242 4242 4242`，任意未来有效期、任意三位 CVC；使用虚构收货资料和测试邮箱。只有 $38 路径完成了浏览器付款验收，$488 / $460 的价格已通过 Stripe API 校验，未声称它们也完成了付款。

## Meta CAPI 验收

Dataset / Pixel：`993248870105581`（Multiverse Console Pixel）。经授权选择 **Set up without Dataset Quality API** 生成新 Token，未增加 Dataset Quality API 权限；Token、`TEST63642` 测试码及 QA 专用手动调用密钥以 Secret 变量保存到 QA 项目的 production / preview 环境，并重新部署生效。这里的 production 是独立 QA 项目的部署环境，不是正式业务项目。域名允许列表新增 `putopia-stripe-meta-qa.vercel.app` 及其子域，没有扩大为 `vercel.app`。

2026-10-24 14:17（Asia/Shanghai）通过 QA 受保护的现有回传入口手动补发原沙盒订单，无定时任务：

- 订单 `f017c8c3-9170-4f60-9af2-b29be14af4f3`；Stripe `livemode=false`，实际测试支付 $38。
- 事件 `Purchase`，ID `initiation_purchase_f017c8c3-9170-4f60-9af2-b29be14af4f3`；沿用原付款时间，`value=38`、`currency=USD`、`action_source=website`。
- 事件来源保存为 QA 购买页；Events Manager 显示 QA 域名。
- 回传批次 `meta.claimed=1 / sent=1 / retried=0 / failed=0`；outbox 为 `sent`、`last_error=null`、`sent_at=2026-10-24T06:17:44.168Z`。
- Meta 回执 Trace ID：`Aj6l8SZAqTeNzUS3RYascA5`。
- **Meta Test Events 实际显示 Purchase / Processed / Server，38 USD，事件 ID 与该订单一致。**

证据：`output/stripe-sandbox-20261024/meta-purchase-verification.json` 与 `meta-purchase-processed.png`。验收页：https://eventsmanager.facebook.com/events_manager2/list/dataset/993248870105581/test_events?business_id=1428361782309735

手动入口同时处理其他分析 outbox。本次总响应 HTTP 503 来自未配置 PostHog 的两条分析事件重试；Meta 子任务成功，不能把总状态码解释为 Meta 失败。QA 无生产 PostHog 凭据，也未因此新增该服务配置。

浏览器广告像素仍关闭。本次仅证明服务器 CAPI 测试事件接收，未验收浏览器 Pixel / CAPI 去重或实际广告归因，未开启广告投放。测试 Stripe 事件强制携带 Test Event Code；正式 Stripe 事件不会携带该码。新 Token 是该 Dataset 的有效凭据，应始终仅在服务器保存。

## 同步 GTM 团队

建议发送测试站链接、上述验收截图及以下事件规范，不发送 CAPI Token：

> 独立 Stripe / Meta QA 环境已打通。$38 测试订单的服务器 Purchase 已在 Dataset 993248870105581 的 Test Events 显示 Processed。Purchase 使用实际付款金额（美元值）、USD 和固定事件 ID initiation_purchase_<订单 UUID>。请核对 GTM 是否已有 Purchase 触发，避免在成功页刷新时重复上报；若要并行发送浏览器 Purchase，请与后端对齐同一个 event_id，并单独联调去重。当前 QA 浏览器广告像素关闭，测试码只用于测试，CAPI Token 不进入 GTM Web 容器或浏览器。

## 2026-10-25 关闭记录

按用户“沙盒可以关闭了”的指示执行：

- 独立 Vercel QA 项目已暂停；购买页实测 HTTP 503、`x-vercel-error=DEPLOYMENT_PAUSED`。
- QA 数据库 S26 批次 `checkout_open=false`，并保持 `stripe_livemode=false`；本地 QA env 的 `INITIATION_CHECKOUT_ENABLED=false`。
- 独立 Stripe 沙盒 webhook `we_1UTxcNAPEEV0NYJ8m8FjcGur` 已停用，回读为 `disabled`；检查没有未完成的 Checkout 会话，无需过期额外会话。
- 原测试订单、Meta 回执、截图、数据库和沙盒账户均保留，未删除历史数据。正式项目未改动。
- **QA 数据库尚未暂停**：平台返回 `Persistent branch cannot be paused`。CLI 的 `--persistent=false` 未实际改变属性；浏览器的切换操作被自动审批拒绝，因 Preview 模式可能改变数据保留和自动清理行为。目前停在模式切换确认框，需用户明确授权后才能转换并暂停。该分支没有 GitHub 仓库连接。

无密钥机器回执：`output/stripe-sandbox-20261024/shutdown-verification.json`。若需恢复，先核对数据库状态和凭据，再恢复测试 webhook 与结账开关，最后恢复 QA 项目流量；不能仅恢复网站就视为沙盒已可用。
