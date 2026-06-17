# 10 · 商业化：航行者礼包（Voyager Pack）

## 1. 定位

商业化的核心是一个**一次性买断的实体+数字混合礼包**——花 **$12** 成为航行者，邮寄一份
"Initial Voyager Pack"。它把"付费"包装成"被组织正式接纳、收到入会物料"的仪式，而非冷冰冰的订阅。
展示页 **`/voyager-pack`**（长滚动 iframe 商品页）。

## 2. 锁定的产品决策

- **$12 含运费、仅美国**（Stripe `shipping_address_collection.allowed_countries=['US']`），一次性买断。
- **付费即 role=voyager，与被授予设备的 voyager 完全同权**（含机密 intel、信号解谜参与等）。
- Phase 1 **手动发货**；付款前不额外采集字段；事务邮件复用 Supabase（新账号靠 inviteUserByEmail）。
- 当前批次 `2026 Batch S2`。

## 3. 礼包内容（5 件，文案定稿）

1. Welcome Letter（欢迎信）
2. Voyager Badge（徽章）
3. Mysterious Component Parts（神秘组件，标签含 RANDOM PICK）
4. Voyager Status（数字权益：Batch Seat→`/voyagers`、Inner Circle Access→`/vote`）
5. Priority Match Access（优先匹配权）

> 1–3 为实体邮寄，4–5 为数字即时生效。

## 4. 购买链路

```
/voyager-pack（CTA 按状态变化） ──► /api/checkout ──► Stripe Checkout（US-only）──► webhook ──► provision + 落订单
```

- **CTA 四态**（页面本体永不被遮挡，只换底部按钮）：
  - `buy`：橙色 → `/api/checkout`（Stripe）。
  - `tasks`：`task_gated` 实验组且任务未完成 → "Complete Tasks to Purchase" → `/voyager-path`。
  - `closed`：销售未开放 → 灰按钮 + "launch pending" 弹窗。
  - `voyager`：已是航行者 → 灰绿按钮 + "已激活" 弹窗。
- **无 Stripe key 时**：`/api/checkout` 进入 **mock 模式**，模拟付款并跑完整链路，便于测试。
- **webhook**（`/api/stripe/webhook`）：验签 → 找/建账号 → 落订单地址 → `provisionVoyagerMembership`；
  `charge.refunded` → 退款处理。

## 5. 订单与履约

- `voyager_orders` 表：Stripe 字段 + 美国地址 + 物流追踪（carrier / tracking_number / tracking_url /
  shipped_at / delivered_at），RLS 仅本人可读。
- **Profile 页履约时间线**：`paid → preparing → shipped → delivered` 四段进度 + 追踪链接（见 01）。
- **后台 `/admin/orders`**：Architect 录入承运商/单号、推进状态（驱动追踪邮件）；
  也可**手动建单**（`createOrderManually`，用于线下/赠送/测试，幂等并自动 provision）。

## 6. 批次（Batch）

`batches` 表（单一 `is_current`）。升级时入当前批次，发放会员号。历史成员 `Original Batch`，
当前 `2026 Batch S2`。批次是"入会席位 / 限量感"的叙事载体。

## 7. 数据与权限要点

| 项 | 说明 |
|---|---|
| `voyager_orders` | 订单 + 地址 + 物流；RLS 本人可读，architect 全读 |
| `batches` | 批次，单一 is_current |
| `provision_voyager(uuid)` | 原子升级 RPC（不降级 architect） |
| 价格 | `PACK_PRICE_CENTS = 1200`（`src/lib/stripe.ts`） |
| 销售开关 | `SALES_OPEN` 常量（console / voyager-pack / api/checkout 三处需同步） |

## 8. 当前状态与缺口

- ✅ 商品页、四态 CTA、Stripe checkout（含 mock）、webhook、订单、履约时间线、后台录单、手动建单、批次均已上线。
- ⬜ 退款触发的角色降级尚未实现。
- ⬜ 给已有账号的购买确认邮件待补。
- 🟡 仅美国发货；国际化/多 SKU 未做。

## 9. 未来钩子

- 多 SKU / 标签绑定（World Builder Pack vs Device Seeker Pack）。
- 复购 / 升级礼包；批次限量与"提前解锁 Console（折扣）"接积分体系。
