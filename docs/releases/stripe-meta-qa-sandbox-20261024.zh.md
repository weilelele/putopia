# Stripe / Meta Ads 独立线上沙盒

2026-10-24 建立。用于多人测试付款、签名 webhook 和后续 Meta Test Events 联调。

## 入口与隔离范围

| 项目 | 配置 |
| --- | --- |
| 测试购买页 | https://putopia-stripe-meta-qa.vercel.app/voyager-initiation |
| Vercel 项目 | `putopia-stripe-meta-qa` / `prj_8FdDESUZStbfGUcgC1w1vKJAPUPI` |
| 已验收部署 | `dpl_E4u69RN1fgjpQ7fi2G7SifyrqG1u` |
| Stripe 沙盒 | `Putopia Meta Ads QA` / `acct_1UTxRiAPEEV0NYJ8` |
| Stripe 管理入口 | https://dashboard.stripe.com/acct_1UTxRiAPEEV0NYJ8/test/dashboard |
| Supabase 持久开发分支 | `stripe-meta-qa` / `gqcgdmmmmfbatdneacny` |
| Stripe webhook | `https://putopia-stripe-meta-qa.vercel.app/api/stripe/webhook` |
| 价格 | Initial $38 / Complete $488 / Upgrade $460，USD，一次性付款，含税 |

测试站使用独立 Stripe 账户和独立数据库。未复制正式用户、订单、邮件发送密钥、MongoDB、PostHog 或 Meta CAPI Token。部署配置的 `crons` 为空；浏览器 Meta / X / Reddit 广告像素通过 `NEXT_PUBLIC_AD_PIXELS_DISABLED=true` 关闭。

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

本次建立方式是人工结构基线，不是已经修复历史迁移重放链。控制台仍保留初次自动重放的 `MIGRATIONS_FAILED` 状态，数据库服务健康，实际购买链路已独立验收。未来需要重建时仍需按该流程检查依赖，不能直接重置分支并假定自动迁移完整。

## 实际验收

在 390×844 手机竖屏通过测试站进入 Stripe Checkout，使用官方测试卡完成 $38 Initial 付款，再返回测试站。

- Checkout `cs_test_a14v8NGFA4HNqKPxkjD13qqwk536hJC5xoiQeNRrga2vcX2mrt8PU2p05q`：`complete / paid / livemode=false`。
- PaymentIntent `pi_3UTxo6APEEV0NYJ80tNlq3zV`：`succeeded`，测试捕获 `3800` 美分。
- 测试订单 `f017c8c3-9170-4f60-9af2-b29be14af4f3`：`paid`；1 条有效会员记录、2 条 Pack 发货记录。
- 签名完成事件 `evt_1UTxo7APEEV0NYJ8cVTywrJP`：`processed`；该测试事件曾在补齐 QA 序列权限后定向重投。无签名请求返回 HTTP 400。
- 页面显示 `INITIATION CONFIRMED`。机器可读证据与手机截图位于 `output/stripe-sandbox-20261024/`。
- 发现并修复游客空邮箱传入 Stripe 的错误；结账时省略空的 `customer_email`，由 Stripe 收集邮箱。
- `design:check`、TypeScript、lint、814 项测试、本地生产构建与 Vercel 构建通过；lint 保留既有 26 个警告。独立 PR 基于 `origin/main`，其 793 项测试与全部门禁另行通过；814 项对应已部署的完整工作区快照。

复测卡号：`4242 4242 4242 4242`，任意未来有效期、任意三位 CVC；使用虚构收货资料和测试邮箱。只有 $38 路径完成了浏览器付款验收，$488 / $460 的价格已通过 Stripe API 校验，未声称它们也完成了付款。

## 后续 Meta 回流联调

当前测试付款已产生 outbox 事件 `initiation_purchase_f017c8c3-9170-4f60-9af2-b29be14af4f3`，状态 `pending`，原因 `Meta CAPI configuration is missing`。这表示支付到业务入库和回传排队已通，尚未向 Meta 发送或完成广告归因验证。

下一步只在 QA 项目配置对应 Dataset `993248870105581` 的 `META_CAPI_ACCESS_TOKEN` 和 Events Manager 提供的 `META_CAPI_TEST_EVENT_CODE`，再部署并定向发送这个测试 outbox。现有发送代码要求 Stripe 测试事件必须携带 Test Event Code；不要通过去掉测试码来发送。

浏览器广告像素和正式广告投放均未开启。后续若要检查 Pixel / CAPI 去重，需要在明确的 Meta 测试流中单独配置浏览器事件；本次付款测试不能代替这项验收。
