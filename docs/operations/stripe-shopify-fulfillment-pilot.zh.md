# Stripe 已付款订单的 Shopify 发货试单

Shopify 后台负责分包、面单和追踪。Stripe 订单提供实收依据，MultiverseCo 的原订单号和两个 Pack 记录用于回写。首次验收范围是一笔已扣款、两包待发、无退款或争议的 $38 Initial。Shopify 店铺开好后，先手工建这一张订单，再用脚本核验并同步，便于逐包核对。

## 开店后的准备

1. 在 Shopify Basic 保留店铺密码，在 **Settings → Locations** 加入 ZIP 95054 的完整发货地址和电话。设置手动履约。
2. 创建两个需要发货的实体商品，SKU 为 `INITIAL-PACK-1` 和 `INITIAL-PACK-2`，每个 $19，仅供后台试单。填实际包装重量。订单免运费，确认总额 $38 USD，按 Stripe 原单记录适用税费。
3. 发店铺的 `*.myshopify.com` 地址，准备一个同组织、安装到本店的 Shopify Dev Dashboard 自用应用。首轮只需要 `read_orders` 和读取订单邮箱及收货地址的权限。密钥放进私有环境文件。给面单付款可按 Shopify 后台要求完成发货地址、账单和身份核验。
4. 网站接入时先应用 `supabase/schema_v116.sql`，再部署读取追踪号的会员页。上线前在独立测试环境验证。试单库、Stripe 账户与 Shopify 店铺都要指向同一笔待发业务订单。

[外部已付款订单](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders) · [Shopify 应用客户端凭据](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant) · [受保护客户数据](https://shopify.dev/docs/apps/launch/protected-customer-data) · [Shopify 面单条件](https://help.shopify.com/en/manual/fulfillment/shopify-shipping/setting-up-shopify-shipping)

## 操作和验收

1. 运行 `prepare` 核验原单和 Stripe 实际扣款。确认两个包都未寄出且没有旧面单追踪号。需要填收件人时，在授权的私有终端加 `--details` 查看原收件地址和会员邮箱。
2. 在 Shopify **Orders → Drafts → Create order** 建草稿，关联该邮箱，填写原收件地址，加入各一个 SKU。加入脚本输出的完整订单标签 `mc-stripe-<原订单 UUID>`。检查该标签只对应这一个订单。选择 **Mark as paid** 记录外部已付款。发票链接和再次收款属于其他流程。
3. 运行 `sync` 预检，确认选中的 Shopify 订单与原单匹配。用桌面端 **Unfulfilled → ⋯ → Split fulfillment** 拆为两个 Pack。为 Pack 1 买面单或手动录入实际追踪号，先同步 Pack 1，确认 Pack 2 在 Shopify 和会员页仍待发。第二包准备好后重复操作。若从 Pirate Ship 独立买面单，回填到对应的 Shopify 履约记录。
4. 每次先跑无 `--apply` 的预检，再运行 `sync ... --apply` 回写。会员页应显示各包的实际追踪号和链接。面单创建对应 Preparing，揽收或在途对应 Dispatched，承运商确认后对应 Delivered。此试单需要两张可追踪面单，才能核验两个追踪号。
5. 重跑同步，确认两包和一笔订单的数量不变。若 Stripe 出现退款、争议或 Shopify 出现重复订单，先暂停这笔待发单并人工核对。原 Stripe 交易的退款在 Stripe 处理。

[Shopify 拆分履约](https://help.shopify.com/en/manual/fulfillment/fulfilling-orders/single-fulfillment#split-a-fulfillment) · [Shopify 购买与打印面单](https://help.shopify.com/en/manual/fulfillment/features-overview#shipping-labels-and-carrier-services) · [Stripe 退款](https://docs.stripe.com/refunds)

## 私有环境与命令

使用 Node.js 22.18 以上。将下列变量填进 git 忽略的 `.env.shopify-fulfillment.local` 或仓库外的私有文件。Stripe 使用可读取正式 PaymentIntent 和 Charge 的密钥，Supabase 使用对应环境的服务密钥。

```dotenv
SHOPIFY_FULFILLMENT_SUPABASE_URL=https://<project>.supabase.co
SHOPIFY_FULFILLMENT_SUPABASE_SERVICE_ROLE_KEY=<service-role key>
SHOPIFY_FULFILLMENT_STRIPE_READ_KEY=<restricted live key>
SHOPIFY_FULFILLMENT_SHOP=<store>.myshopify.com
SHOPIFY_FULFILLMENT_CLIENT_ID=<app client ID>
SHOPIFY_FULFILLMENT_CLIENT_SECRET=<app client secret>
```

```bash
node --env-file=.env.shopify-fulfillment.local scripts/shopify/sync-stripe-initial-fulfillment.mjs prepare <order-uuid>
node --env-file=.env.shopify-fulfillment.local scripts/shopify/sync-stripe-initial-fulfillment.mjs sync <order-uuid>
node --env-file=.env.shopify-fulfillment.local scripts/shopify/sync-stripe-initial-fulfillment.mjs sync <order-uuid> --apply
```

脚本读取 Shopify，写入只发生在显式 `--apply` 时。回写只关联既有订单和更新两条既有 Pack 记录。批量建单和自动通知接入可在试单验收后进行。

## 2026-11-17 正式迁移预检

在正式 Putopia 数据库中找到 84 条有金额、状态为已付或已发的源记录。逐笔查正式 Stripe 的付款、捕获金额、币种和最新扣款的退款／争议状态后，76 条与源记录一致，且收件地址完整。以下数字是预检结果，正式导入时重新对账。

| 类别 | 源记录 | Stripe 和地址核验通过 |
| --- | ---: | ---: |
| Initial $38 | 11 | 11 |
| Complete $488 | 6 | 6 |
| 旧版 Voyager Pack $12 | 66 | 59 |
| 独立 Console 订单 | 1 | 0 |
| 合计 | 84 | 76 |

- 待核对的 8 条包含 5 条缺少可用的正式付款引用、2 条无法从当前 Stripe 账户读取的付款、1 条存在退款或争议的扣款。与付款核验异常重叠的 3 条还缺完整地址。
- 17 笔新套餐对应 46 条待发 Pack。历史 Voyager Pack 有 1 条已发记录，保留其追踪号与已发状态。另有 1 条已关联 Complete 的 $0 Console 领取单，沿用原套餐的 Pack 3 关系，避免生成第二次购买或额外待发包裹。
- `jtuuus-k3` 返回 8 笔测试单、0 笔正式单。已安装的 `Putopia Initial Pilot` App 当前只有 `read_orders`。批量创建正式订单需要 `write_orders`，用 API 恢复历史履约需要对应的履约写入权限。本次只读盘点没有向 Shopify 写入客户资料或发出通知。
- GitHub 的 `main` 比试单分支基线多 7 个提交，`initiation-view.tsx` 的三方合并预检有 2 处冲突。生产数据库还没有 `initiation_shipments.tracking_number`，需要先准备生产迁移并验证兼容性。试单收款、访客验证、分包回写依赖本机测试配置，生产新单继续由现有收款流程处理，直至生产集成验收。

正式导入前先核验一笔 Initial 和一笔 Complete，保留原订单号、原成交日期、实收及税额、订单邮箱、收件地址和包裹位置。使用原订单号建立唯一映射，核对重跑时订单仍只有一笔。导入设为外部已付款，关闭导入触发的客户确认信，保留待发状态与历史追踪号。退款仍在原 Stripe 交易处理。两笔验收后扩大到其余已核验订单，并在合并前验证 Shopify 向 Putopia 的生产履约回写和失败重试。

[Shopify 导入订单 API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderCreate) · [Shopify 导入通知选项](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/OrderCreateOptionsInput) · [Shopify 履约权限](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate)

## 正式试单操作

1. 在 Putopia Initial Pilot 的 Dev Dashboard 版本中保留 `read_orders`，添加 `write_orders` 和 `write_merchant_managed_fulfillment_orders`。发布版本后，在店铺后台批准新增权限，再跑下方 `prepare` 确认 `missingScopes` 为空。
2. 正式 Supabase 依次应用尚未上线的 `schema_v116.sql` 和 `schema_v119.sql`。v117 和 v118 用于隔离的 Shopify 测试流程。v119 校验实时退款／争议、Pack 位置、源单与 Shopify 订单的唯一绑定。
3. 选一笔 Initial 和一笔 Complete。用各自的 UUID 执行 `import`，再执行 `split`。Shopify 按原金额记录外部付款，保留成交日期和地址，关闭导入触发的订单与发货通知。每个 Pack 在 ZIP 95054 的发货地点独立待发。
4. 核对两笔 Shopify 订单与 Putopia 原单的金额、地址、履约分组和订单绑定。已经获得真实追踪号的 Pack 才在 Shopify 发货并执行 `sync`；确认会员页的对应包裹显示该号码，其他包裹保持原状态。若 Shopify 写入发生超时，先按源单标签对账。保留数据库导入预约，直到确认能安全重试。
5. 正式两单验收后再处理余下订单。旧版 $12 订单使用独立的商品映射和历史发货状态，需单独验收。预检异常的 8 单留给人工核对。

```bash
node --env-file=.env.shopify-fulfillment.local scripts/shopify/import-stripe-bundle.mjs prepare initial
node --env-file=.env.shopify-fulfillment.local scripts/shopify/import-stripe-bundle.mjs prepare standard
node --env-file=.env.shopify-fulfillment.local scripts/shopify/import-stripe-bundle.mjs import <order-uuid> --apply
node --env-file=.env.shopify-fulfillment.local scripts/shopify/import-stripe-bundle.mjs split <order-uuid> --apply
node --env-file=.env.shopify-fulfillment.local scripts/shopify/import-stripe-bundle.mjs sync <order-uuid> --apply
```

[Shopify 发布应用版本](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard) · [Shopify 应用权限](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes) · [Shopify 拆分履约 API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderSplit)
