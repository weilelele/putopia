# Shopify Initial 试单

Shopify 管理 **$38 Initial** 和 **$488 Complete** 试单。Putopia 根据已核验的订单激活本地测试会员，Pirate Ship 用于后续的实际面单操作。Initial 的 Pack 1 和 Pack 2 是同一笔订单中的两条实体商品行，每条 $19。正式店铺上架和 Putopia 结账切换单独验收。

## 开店和收款

1. 已确认 `jtuuus-k3.myshopify.com` 使用美国区 **Basic 优惠月付**，Santa Clara 发货点邮编为 **95054**。保留店铺密码，开启管理员双重验证。
2. 店主在 **Settings → Payments → Complete setup** 完成 Shopify Payments 核验。若按私营 Delaware 公司开户，选择对应的 **Private corporation / Private company**，填写 **MultiverseCo, Inc.** 的 IRS 登记名称、EIN、业务电话和美国实际经营地址。备好 IRS 发出的 EIN 文件，例如 SS-4 或 147C，供 Shopify 核验。
3. 备好账户代表的法定姓名、出生日期、住宅地址、邮箱、电话、职位和持股比例，以及持股达到 25% 的其他受益所有人资料。非美国居民且没有 SSN 或 ITIN 的代表，填真实的海外住宅地址，再按页面提示提供有效护照照片。外部收款账户用支持 ACH 的美国 USD checking account。银行和身份证件资料直接输入 Shopify 后台。
4. 在 **Settings → Locations** 填写 ZIP **95054** 对应的完整实际发货地址。**Shipping and delivery** 只开放美国本土 48 州及 DC，配置免运费。按现有包邮、含适用税的政策配置价格，检查收税州和结账总额。在 **Customer accounts** 启用新版账户并打开 **Show sign-in links**。测试阶段仅分享内部试单链接。
5. 在 Shopify 安装 Pirate Ship 应用并连接账户，发货地用同一个 95054 地址，产品由 Shopify 管理库存、手动履约。保留 Paid 导入筛选。Pilot 的测试订单不会出现在 Pirate Ship 的导入列表中。

[Shopify 套餐](https://www.shopify.com/pricing) · [美国 Shopify Payments 核验资料](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/united-states/requirements) · [含税定价](https://help.shopify.com/en/manual/taxes/include-exclude-taxes) · [客户账户](https://help.shopify.com/en/manual/customers/customer-accounts/manage) · [Pirate Ship 应用](https://apps.shopify.com/pirate-ship) · [Pirate Ship 导入条件](https://support.pirateship.com/en/articles/4582645-troubleshoot-common-shopify-integration-problems)

## 两笔内部试单

- 创建两个物理商品变体，建议 SKU 为 `INITIAL-PACK-1` 和 `INITIAL-PACK-2`。每个 $19，禁止折扣，各取一件。用草稿订单的结账链接邀请内部测试者，订单绑定已确认邮箱的本地 Putopia 测试账号。同一个邮箱用于 Shopify 结账。验收时确认包邮、含适用税、总额正好 $38。
- 在 Shopify Payments 中开启 **Test mode** 并选手动捕获，使用官方测试卡进入托管结账。核对地址后，在订单中捕获测试款。只授权时，同步应拒绝激活会员。测试捕获后，对账命令应在本地登记一个 S26 Initial 席位，生成两条包裹记录并解锁 Voyager 会员，Console 权限保持关闭。
- **试单 A 验证分开发货。** Shopify 桌面后台进入 **Orders → 订单 → Unfulfilled → ⋯ → Split fulfillment**。先履约 Pack 1，再履约 Pack 2，分别填内部模拟用的追踪号与 HTTPS 链接，关闭这两次测试的发货通知。每一步重新对账，确认两个商品行各显示自己的追踪号。收到面单信息后，Putopia 显示 Preparing。承运商揽收、运输和送达事件用本地样例验证。客户订单详情可用真实下单邮箱的测试账号查看，Shop App 的试单展示需另行实测。
- **试单 B 验证退款。** 使用另一位新测试用户，在两包都还未寄出时，对 Pack 2 选一件，向原测试支付方式退 $19。交易成功后同步，Pack 2 应取消，Pack 1 仍可发，会员仍有效。再对 Pack 1 选一件退剩余 $19，总退款 $38。同步后两包应取消，会员撤销。可再跑一次，确认重复同步仍只有一笔订单、一条会员记录和两条包裹记录。
- **首张真实面单单独验收。** Pirate Ship 的同地点导入单可能会随第一张面单把整单标为已履约。两包都从 95054 发时，先在 Shopify 拆履约。需要实际寄送时，用 Pirate Ship 独立创建每张面单，再把对应追踪号填回各自的 Shopify 履约。若 Pack 1 使用普通邮票，照常单独履约，买家页面会缺少该信封的承运商扫描。

[草稿订单和结账链接](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders) · [Shopify Payments 测试卡](https://help.shopify.com/en/manual/payments/shopify-payments/testing-shopify-payments) · [手动捕获](https://help.shopify.com/en/manual/fulfillment/managing-orders/payments) · [拆分履约](https://help.shopify.com/en/manual/fulfillment/fulfilling-orders/single-fulfillment) · [退款](https://help.shopify.com/en/manual/orders/refund-cancel-order) · [Pirate Ship 拆单说明](https://support.pirateship.com/en/articles/2340176-can-i-merge-or-split-an-order)

## 接入和运行

- Shopify Dev Dashboard 创建同组织的自用应用，安装到这家店。授予 `read_orders`，开通订单邮箱及地址字段所需的受保护客户数据访问。脚本通过同组织的客户端凭据换取短期令牌，只读 Shopify Admin GraphQL。退款和履约都在 Shopify 管理员后台操作。
- 使用一个独立、本地的 Supabase 开发库。加载 Initiation 相关 schema 和追踪号字段 `supabase/schema_v116.sql`，再仅在本地应用 Shopify 测试迁移 `supabase/schema_v117.sql`。将本地 S26 置为 `checkout_open=false, stripe_livemode=false`。Putopia 本地站点和对账命令均连接同一个库。只使用内部测试身份和数据。
- 用已验证邮箱的本地 Putopia 测试账号，起始身份为 Applicant，且没有之前的订单、履约或会员记录。每个测试账号绑定一笔试单。对账程序默认只检查，不写入。打开 `--apply` 后仅写本地库。此阶段每次付款、发货或退款后手动运行，实时 Webhook 和公开结账由下一阶段接入。

用 git 忽略的 `.env.shopify-pilot.local` 或仓库外的私有文件填写下列变量。只用本地开发库的服务密钥。

```dotenv
SHOPIFY_PILOT_SHOP=jtuuus-k3.myshopify.com
SHOPIFY_PILOT_CLIENT_ID=<Dev Dashboard client ID>
SHOPIFY_PILOT_CLIENT_SECRET=<Dev Dashboard client secret>
SHOPIFY_PILOT_USER_ID=<local test user UUID>
SHOPIFY_PILOT_SUPABASE_URL=http://127.0.0.1:54321
SHOPIFY_PILOT_SUPABASE_SERVICE_ROLE_KEY=<local service-role key>
```

用 Node 22.18 或更高版本。订单 ID 取后台 URL `/orders/` 后的数字，区别于页面上的 `#1001` 等显示编号。

```bash
node --env-file=.env.shopify-pilot.local scripts/shopify/sync-initial-pilot.mjs <order-id>
node --env-file=.env.shopify-pilot.local scripts/shopify/sync-initial-pilot.mjs <order-id> --apply
```

[Shopify 客户端凭据](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant) · [受保护客户数据](https://shopify.dev/docs/apps/launch/protected-customer-data)

## $488 Complete 试单

- 继续使用同一家店、只读应用和独立的测试数据库。在本地应用 `supabase/schema_v118.sql`。使用新的、已确认邮箱的 Applicant 测试账号，并用相同邮箱完成 Shopify 测试结账。
- 草稿订单加入四个实体商品行。Pack 1、2 沿用 `INITIAL-PACK-1` 和 `INITIAL-PACK-2`，各 $19。`COMPLETE-PACK-3` 为 $450，`COMPLETE-PACK-4` 为 $0。这是内部试单的分摊方式。用免费的 Standard 配送，关闭预计送达日期和该费率的运输时长。
- 测试款捕获后，使用同一条命令加 `--complete --apply`。确认 Voyager 激活、Console 领取权限可用、四条记录为待发。分别录入模拟追踪号，重新同步，核对每件包裹的状态、号码和链接。没有承运商扫描时显示 Preparing。
- 当前 Complete 试单只接受未退款的订单。使用 Shopify 实际订单 `#1002` 验证初始同步、单包更新和四包更新。线上结账切换和 Complete 退款另行验收。

## 从 Putopia 发起测试结账

1. 在 Shopify Bundles 创建两个固定套餐商品。Initial 按 Pack 1、2，Complete 按 Pack 1、2、3、4。设置套餐价 $38 和 $488，确认 Pack 3 显示为 Pack 3: Multiverse Console。仅启用测试所需的销售渠道。
2. 在使用 `schema_v118.sql` 的本机开发环境，给每个套餐分配一个新 Applicant 测试账号，使用已确认的 `@example.com` 邮箱。填入 `SHOPIFY_INITIAL_PILOT_USER_ID` 和 `SHOPIFY_COMPLETE_PILOT_USER_ID`。将套餐的 `gid://shopify/ProductVariant/…` 填入 `SHOPIFY_INITIAL_PILOT_VARIANT_ID` 和 `SHOPIFY_COMPLETE_PILOT_VARIANT_ID`。若店铺的 Online Store 锁定，使用 Headless 渠道的私有 Storefront API 令牌作为 `SHOPIFY_PILOT_STOREFRONT_TOKEN`，并在该渠道启用这两个测试套餐。
3. 用对应账号打开 `/voyager-initiation?bundle=initial` 或 `/voyager-initiation?bundle=standard`。点 **Continue** 创建购物车，确认 Shopify 预填的邮箱与套餐明细正确。测试款捕获后，在原 Putopia 标签页点 **CONFIRM TEST PAYMENT**。网站使用下单时签名的引用认领订单。分别更新每个 Pack 的测试履约后，点会员页的 **SYNC TEST SHIPMENTS** 核对追踪号。

Shopify 店铺处于私密模式时，新浏览器会话可能先进入店铺密码页。用现有店铺密码进入测试会话，然后回到 Putopia 再点一次 **Continue**，生成新的结账链接。邮箱来自当前已验证的 Putopia 登录账号。

Headless 试单 `#1006`（$38）和 `#1007`（$488）已验证测试付款、签名订单对应的会员激活及两包／四包追踪回写。Complete 的 Console 领取入口已解锁。录入履约后，如果 Shopify API 尚未返回刚保存的追踪号，在会员页再次同步。

Headless 尚未接通时，可以在本机用 `SHOPIFY_INITIAL_PILOT_DRAFT_URL` 和 `SHOPIFY_COMPLETE_PILOT_DRAFT_URL` 指定两个已绑定对应测试客户的未付款固定套餐草稿。这个路径的预填来自 Shopify 草稿里的测试邮箱，核验时用邮箱和固定套餐变体匹配订单。启用购物车时移除这两个配置。

## 未登录访客试单

在隔离开发环境配置 `SHOPIFY_GUEST_PILOT_EMAILS`，值为以逗号分隔的合成 `@example.com` 测试邮箱。访客可从 Initiation 选套餐，也可直接打开 `/shopify-guest-test?bundle=initial` 或 `/shopify-guest-test?bundle=standard`。表单邮箱用于预填 Headless 购物车。Putopia 在浏览器的签名 cookie 中保留本次试单的引用，Shopify 订单也带同一引用。

付款后回原 Putopia 标签页点 **After Payment, Verify Email**。本机 Supabase 会向 Mailpit 发送单次验证链接。用原浏览器打开邮件，Putopia 校验已验证邮箱、试单引用、套餐及付款状态，再将订单关联到该账号并激活会员。用下一笔试单时使用另一枚已配置的合成邮箱。

$38 访客测试单 `#1008` 已在无 Putopia 会话时完成邮箱预填和测试付款。付款前验证请求保持待付款，验证邮件完成后进入会员页并显示 Initial 与两个待发包裹。

## 正式收款接入准备

首次切换范围为 $38 Initial 与 $488 Complete。$460 升级暂用现有 Stripe 流程，已经开始的 Stripe 结账仍由 Stripe 对账。准备中的 v121 包含 Shopify 预留席位、授权绑定、扣款确认、会员和 Console 权限，以及按 Pack 写入追踪号。v121 尚未应用到生产，`INITIATION_SHOPIFY_LIVE_ENABLED` 尚未启用。

- **Shopify。** 两个固定套餐须能从 Headless 生成新的购物车。当前商店有密码页，且 Shopify Payments 为 Test mode，捕获方式是 Automatically at checkout。正式流程需验证未登录 Shopify 的买家能进入托管结账，核对美国配送区、包邮、实收和支付方式，再用授权后捕获验证 Putopia 的配送限制和席位校验。
- **Vercel。** 生产服务端需要 `SHOPIFY_LIVE_CLIENT_ID`、`SHOPIFY_LIVE_CLIENT_SECRET`、`SHOPIFY_LIVE_STOREFRONT_TOKEN`、`SHOPIFY_LIVE_INITIAL_VARIANT_ID`、`SHOPIFY_LIVE_COMPLETE_VARIANT_ID`。密钥存入 Production 环境，套餐 ID 对应目前测试单 #1006 和 #1007 使用的固定套餐。
- **Shopify → Putopia。** 将订单创建、已支付、更新、取消及退款等事件投递到配置好的 `/api/shopify/webhook`。验证 Shopify 签名、订单与邮箱绑定、单笔授权和完整扣款、重复事件、失败重试、退款与异常订单处理。还要逐包核对履约事件与会员页。
- **切换。** 先从隔离环境验证签名事件到扣款确认，再验证正式 Shopify 购物车、付款后的访客激活和会员入口。完成后在 Shopify 关闭 Test mode，在 Vercel 启用公开开关并核对生产路由。回退时关闭公开开关，保留回调和对账，已发出的 Shopify Checkout 仍可核对。
