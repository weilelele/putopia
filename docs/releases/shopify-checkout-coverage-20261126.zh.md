# Shopify 付款方式与结账观测覆盖

## 发布状态

本变更包含 `supabase/schema_v130.sql`、应用服务端以及 Shopify Custom Pixel v3。v130 已应用生产；应用与 Pixel 的发布验收状态以 PR #346 的部署记录为准。代码检查通过不代表 Pixel 编辑器已更新，必须按下面的发布顺序验收。生产收款、取消、退款和权益核验规则保持原有实现。

## 付款方式

独立 worker 通过 Shopify Admin API `OrderTransaction.paymentDetails` 读取 `__typename` 和 `CardPaymentDetails.wallet`，不读取卡号、持卡人、有效期或验证结果。成功 CAPTURE／SALE 优先；必要时只沿该笔扣款的 parentTransaction 查找成功授权。失败、等待中或测试交易不能确定最终付款方式。

| `payment_method` | `checkout_flow` | 证据 |
| --- | --- | --- |
| `shop_pay` / `shop_pay_installments` | `shop_pay` | `SHOPIFY_PAY` wallet 或 Shopify 分期类型 |
| `card` | `standard` | 明确 CardPaymentDetails 且 wallet **为 null** |
| `apple_pay` / `google_pay` / `paypal` / `other_wallet` | `other_express` | 对应 wallet／支付详情类型 |
| `unknown` / `other` | `unknown` | 字段缺失、无法分类或未有成功交易 |

`shopify_payments` gateway 本身不区分 Shop Pay 和普通卡。字段未获取时的 undefined 也不能当作 wallet=null。分类与服务端证据写入 checkout 绑定，并附在之后发送的 checkout、purchase 和诊断事件中。独立的 `initiation_checkout_payment_method_observed` 事件为晚到的付款方式提供同订单关联；此前已发送的事件不重发、不伪造历史步骤或第二笔 Purchase。诊断版本为 `shopify-checkout-diagnostics-v2`。

授权／扣款绑定触发独立 metadata 队列，webhook 后台和现有 cron 处理，失败指数退避至最多六小时。该 worker 只读 Shopify，并且只写本地观测、分类和队列；不执行 capture、cancel、退款、发货、权益或邮件操作。provider 订单签名、账户邮箱及订单绑定须匹配。旧快照不能覆盖新分类；旧 worker 完成不能删掉新扣款排入的工作。v130 给已绑定的正式历史订单补排 metadata 读取任务，实际信息仍须重新读 Shopify。

## 关联失败诊断

Custom Pixel v3 报告阶段缺少／无效关联标记、接口拒绝、重试后网络失败；同一页面内同一原因和事件仅报告一次。不会沿用另一结账的旧引用，也不会从 DOM 猜用户或订单。服务端另记录无效请求、关联不存在、签名不匹配、时间拒绝和存储失败等固定分类。

无法绑定的报告进入按 UTC 小时聚合的 `shopify_observation_health`，不创建 PostHog person 或订单事件；不保存输入值、URL、签名、账户、IP 或原始错误。`source=pixel_unverified` 和 `server` 分开；计数是请求／报告次数，不能解释为受影响人数或直接相加为用户数。公开报告不具备业务写入权限，每个小时／类别的计数上限为 100000。浏览器拦截整个请求时，诊断也可能无法送达，缺失不能补零。关联成功的重复事件继续使用原有持久 outbox、UUID 和去重规则。

## 漏斗口径

使用 `scripts/analytics/shopify-checkout-coverage.sql` 和只读 RPC `report_shopify_checkout_coverage`。输入：结账链接创建 cohort 的起止 UTC、统一观察截止、已验证内部 cohort 与 QA 关联的排除用户数组。服务器事件不能套浏览器 host 过滤；只保留正式店铺及 production/live 记录。该接口只返回聚合，不返回订单、账户或联系方式。

- 按 `standard`、`shop_pay`、`other_express`、`unknown` 分组。组内按账户及订单分别去重；跨组人数不能直接相加。
- 每个 Shopify 步骤独立报告“已观测人数”和“未观测到人数”，不画成必须依次通过的漏斗，也不计算相邻数量相除的步骤转化率。
- 页面内任一 Pixel 阶段／交互可作为页面活动证据；结账链接创建不能冒充页面到达。首次页面到达事件缺失时，其精确时刻未知。
- 真实付款独立取服务端业务 paid_at、正式 Shopify 订单、不同的授权／扣款绑定。Shop Pay 即使所有中间事件缺失，只要已核验扣款，也属于付费成功。历史实际扣款和后续退款需分别报告。
- `unpaid_users` 只表示截至观察截止尚无同组真实付款事实，不表示用户在某一步失败、主动离开或被系统取消。只用明确的校验／交易错误解释已观测失败。
- **付款方式通常到成功授权／扣款时才确定。** 未付款者可能仍在 unknown 组，因此不能拿已知方式组直接比较“普通结账 vs Shop Pay 转化率”，也不能按付款结果分摊 unknown。识别到快捷按钮的交互只证明点击意图，不等于实际使用该方式。
- 一个 cohort 内所有记录使用同一截止。未到齐 6h／24h 观察期时，标为未成熟；任何转化率仍须同批用户、严格顺序和共同观察窗口。每日活动量不能当 cohort 转化。

历史 Shopify 的 `checkout_completed` 并不能反推出先前步骤；`shopify_seq=1` 也不证明用户之前没有操作。Shop Pay 中间观测的实际覆盖能力仍应通过未来自然订单检查，而非承诺全部可见。

## 发布与验收

1. 先应用 v130，再发布应用。旧应用仍可使用原有字段，新增表和字段均为附加观测。确认新表 RLS、service_role 权限和 RPC 可用。
2. 更新现有 **Putopia checkout analytics** 为 `scripts/shopify/customer-events-pixel.js` v3，保留现有同意要求及 Connected 状态，不创建第二个 Pixel。单独更新应用不会自动更新 Shopify 编辑器。
3. 等独立 worker 完成历史已绑定订单的 metadata 读取；核对 method、队列和 `initiation_checkout_payment_method_observed` 的 PostHog 回执。不要调用 financial reconciliation 来回填观测。
4. 用受控合成数据确认 missing_reference、reference_mismatch 等进入健康聚合，不产生人物、Purchase 或业务订单。内部事件继续排除正式指标。
5. 核对下一笔自然 Shop Pay 与普通结账：真实授权／扣款不重复，Purchase 保持一单一次；缺少中间步骤显示未观测到。没有自然样本时写“待观察”。

回滚应用和 Pixel 后新增表／列可保留。不要删除已产生的真实支付、权益或诊断事实。

## 验证

Vitest 只用纯函数／模拟 fetch，覆盖 wallet 分类、父授权、失败尝试、签名、退出追踪、去重、拒绝原因和隐私投影。SQL 使用合成内存 PostgreSQL，覆盖未观测步骤、Shop Pay 无中间步骤仍为已付、未知组、内部排除、统一截止、用户／订单去重、metadata 旧 worker、防覆盖和权限。

```sh
node supabase/tests/shopify-coverage-v130.mjs /path/to/@electric-sql/pglite/dist/index.js
```

[Shopify CardPaymentDetails](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/CardPaymentDetails) · [DigitalWallet](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/DigitalWallet) · [Shop Pay 事件覆盖的官方历史答复](https://community.shopify.dev/t/shop-pay-and-web-pixel-events/17696)
