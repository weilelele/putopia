# 10 · 商业化：Voyager Initiation

> 2026-10-06 补充确认：旧 $12 成员的前两包与 S26 同批寄出（2026 年 10、11 月），当前均未寄出；不按历史付款时间视为已发货。划线 $520 旁增加可点击叹号：已支付 $12 Initial Pack 的成员享有 $120 优惠，以 $400 完成 Initiation。

> 2026-10-06 计数更新：INITIATED 表示 S26 已正式登记的成员，包含付款加入者和获赠 NPC；两者均占用 100 席容量。获赠来源独立记录，不伪造付款订单。Johnaason 为首位 S26 获赠 NPC。Profile 通过 Edit 弹窗修改资料，三阶段用于查看权限；Console Holder 仍须真实设备绑定。

> 更新：2026-10-04。本文记录已确认的商业化定位与对外话术，作为后续页面、商品介绍和支付文案的依据；本次仅更新文档，不代表网站、价格、权限或库存已切换。下方历史记录保留旧 $12 礼包机制，不作为新方案要求。

最新确认：原三阶段入口全部进入 Initiation，返回固定到首页 `/console`。Initiation 同页提供访客、未购买、本次已购买及旧 $12 用户视图；已购买者在此查看包裹进度。Device 介绍与 FAQ 全部重写，NPC 编辑器增加成员批次指定，移除 Device / Worlds 聊天；后续新增仅付款用户动态页。以上为需求更新，不代表代码已全部完成，状态与范围见实施清单。

## 1. 定位与命名

用户支付 **US$520**，通过 **Voyager Initiation** 正式加入 Multiverse Collective，成为 **Voyager**，获得实体物资、机密情报和成员专属参与权益。Console 是其中一项领取权益，设备页的 Claim 入口应引导非成员了解入会方案。

Initiation 表达被组织接纳、开启探索的仪式感。神秘感由名称、叙事与内容承担；价格、权益和交付条件明确说明。不要让用户以为付费后仍需通过不确定的资格考核才能获得已购买权益。

| 使用位置 | 确定用语 | 含义 |
| --- | --- | --- |
| 成员身份 | Voyager | 用户加入后获得的身份 |
| 付费标的／商品名称 | Voyager Initiation | 本次付费入会及所含权益 |
| 页面主标题 | Voyager Initiation | 入会仪式名称 |
| 标题上方小字 | Become a Voyager | 以用户将成为谁为核心 |
| 主标题辅助文案 | One initiation. A lasting place in the Collective. | 点明加入组织的含义 |
| 主按钮 | Become a Voyager · $520 | 明确动作和价格 |
| 实体权益栏目 | Voyager Packs | 入会权益中的实体交付 |
| 第一份欢迎包 | Initial Voyager Pack | 保留现有名称；不与整个入会标的混用 |

不用 Voyager Membership 作为主要营销名称；Voyager Access、Voyager Pass 不作为当前方案名称。避免 Begin Initiation · $520 作为按钮，以免暗示付款仅启动考核。Membership fee／入会费可用于解释费用性质，不作为主标题。已确定为一次性入会，无需续费；对外使用 Pay once to become a Voyager. No recurring membership fee.

## 2. 对外话术

以下为页面的核心英文文案；剩余数量须由真实席位数据替换，不能直接发布占位符。

> **BECOME A VOYAGER**
>
> One initiation. A lasting place in the Collective.
>
> Join the Collective to receive physical packs, read classified intel, and take part in member-only activities.
>
> **BECOME A VOYAGER · $520**
>
> First release: 100 seats · {remaining} seats remaining

中文含义：成为航行者，正式加入 Multiverse Collective。入会后获得组织物资、机密情报与成员专属参与权限。首批开放 100 席，展示真实剩余席位。

上述文案中的“首批”指本次计划的首批席位，不宣称是组织历史上最早的 100 位成员。后续可以继续释出席位，不使用“永远只有 100 位成员”的表达。

## 3. 三类成员权益

| 类型 | 内容 | 交付或开放方式 |
| --- | --- | --- |
| 实体奖励 | 第一包：欢迎信、成员徽章；第二包：神秘组件；第三包：Multiverse Console | 按所属席位批次的寄送日程安排；设备作为成员领取权益 |
| 实体奖励的后续计划 | 第四包：预期提供，内容待公布 | 内容仍待公布，寄出月份已确定为 2027 年 1 月 |
| 信息权限 | 阅读机密情报 | 加入后获得对应内容权限，随真实内容发布持续更新 |
| 互动权益 | 参与限定投票、优先参与世界记录等 | 按活动开放；“优先”的具体规则仍待确定 |

实体包裹的寄出时间，以本批席位发布日为基准安排相对固定的日程，不按每个人的付款时间重新计时。首批寄出月份已确定：第一包 **2026 年 10 月**，第二包 **2026 年 11 月**，第三包 **2026 年 12 月**，第四包 **2027 年 1 月**。页面逐包展示寄出月份，不等同于送达日期；个人物流状态与批次计划分别展示。后续新增席位需要注明适用批次及补发／寄送安排。

信息和互动体现持续参与价值，但不承诺无限生成、无限包裹或所有未来扩展免费。优先参与可进一步落实为提前开放窗口或保留名额，这些是候选机制，尚未确定。

### 一次性加入与长期权益

页面文案：**One initiation. A lasting place in the Collective.** 配合 **Pay once to become a Voyager. No recurring membership fee.**

- US$520 为一次性 Initiation 费用，没有周期性会费。Voyager 身份与 S26 批次归属长期保留，无需续费。
- 本次包含四个实体包裹及其中一次 Console 领取权益，按已公布的批次日程交付，不代表持续寄送无限包裹。
- 机密情报阅读权限持续开放，随 Collective 实际发布更新；限定投票及活动优先参与资格持续享有，具体依各活动规则。
- 未来新增设备、包裹或特别项目须单独说明是否包含，不默认全部免费。不将本方案统称为“终身无限权益”。

## 4. 页面介绍与加入动作

以“成为 Voyager”为页面核心，将介绍、价格、加入按钮和剩余席位视为一个完整内容区，避免额外悬置的付费卡。宽屏可将加入动作放在介绍右侧；手机优先放在介绍下方，保持自然阅读顺序。

建议内容顺序：**Voyager 介绍与加入 → Voyager Packs → 机密情报 → 成员互动**。实体与两个数字权益区块应能互换顺序；从情报或投票入口进入时，可以优先展示对应权益。可换序是内容结构要求，不表示需要新增用户排序控件。

- 实体用完整图文时间轴呈现前三包与计划中的第四包，保留内容说明及批次日程。
- 信息用真实情报标题、摘要和阅读入口展示价值。
- 互动用具体议题、参与条件和动作展示价值；避免额外装饰图标行、重复说明和泛泛宣传句。
- 价格与席位信息集中出现，剩余席位使用本计划真实数据，不复用站内展示性成员统计。

首批名称为 **S26**；席位上限前突出显示 S26，Limit 旁的叹号按钮打开批次介绍，说明 100 席及四次固定寄送月份。Signal Calibration 使用无标题栏弹窗，关闭按钮独立放在右上角。

### Signal Calibration 前置步骤

页面名称为 Voyager Initiation，路由 `/voyager-initiation`，本轮面向已登录、未付费用户。主按钮使用 Become a Voyager · $520。按钮下以小字号文字和只读方框展示 Signal Calibration 状态；完成后显示勾选，不能手动勾选跳过。

未完成时点击 Become 自动打开二级弹窗，复用当前 `/quiz` 的五题流程和服务端完成记录。成功保存后立即更新勾选状态，关闭弹窗返回入会页；再次点击 Become 时服务端重新校验完成状态。校准本身不启动付款、不预留席位。已经完成当前版本 quiz 的账户无需重做。错误答案沿用原流程的正确答案回顾，不新增考试或分数门槛。

## 5. 上线前待确定事项

- $12 Initial Voyager Pack 停止新销售。旧成员补款价已确定为 $400（划线原价 $520），保留数字权益与前两包；详见下方最新规则。
- 第四包的具体内容；所有包裹的运费、税费、配送地区和售后条件。首批四包寄出月份已确定，见上方日程。
- 后续新增付费项目的具体范围与价格，发布时单独说明。
- 世界记录优先参与的具体机制，以及新增席位适用的寄送安排。
- 100 个席位对应的设备供给与交付安排：[Kyoto One 发布记录](../../releases/kyoto-one/README.md)原为 50 台，不能据此宣称已有 100 台可供领取。
- 页面、支付项目、席位计数及权益发放的实施与验证另行开展。

## 旧 $12 用户：临时成员与 Continue Initiation

2026-10-06 用户确认；本节取代“旧用户仅有单包”“升级金额待定”的旧方案。专属页面价格、优惠说明和两包未寄出展示已实现；支付与权益数据尚未切换，前两包的个人进度追踪明确后续实现。

| 项目 | 未完成新 Initiation 的旧 $12 用户 | 完成后 |
| --- | --- | --- |
| 定位 | 临时成员，已有数字权益，Initiation 尚待完成 | 正式完成 Initiation |
| 机密 Intel、成员投票及其他数字成员权益 | 保留，与正式成员同样享有；不因未补款封锁 | 保持 |
| Pack 1：Initial Voyager Pack | 已拥有 | 保留，不重复发放 |
| Pack 2：Mysterious Widgets | 已拥有 | 保留，不重复发放 |
| Pack 3：Multiverse Console | 未拥有，不可 Claim | 获得领取权益；仍受实际设备库存约束 |
| Pack 4：A Fourth Delivery | 未拥有 | 获得 |
| 本次支付 | **额外支付 US$400，一次性完成**；原价 US$520 划线 | 不再重复售卖同一 Initiation |

$400 为本次收取金额，不是 $520−$12 的自动抵扣公式，也不是新的 $12 商品。真实旧付款资格必须在服务端验证，不能只凭角色或前端显示优惠。现有只允许 $520 的商品校验、数据库金额约束与支付回调需同步支持明确的旧成员补款商品；没有完成这些改动前不能只改按钮开启收费。

### 专属页面设计

- 沿用 Voyager Initiation 页面，主动作改为 **CONTINUE INITIATION**，不再使用首次入会的 Become 文案。
- 价格区同一视觉组展示 **~~$520~~ $400**：$520 为划线原价，$400 是强调的当前实收价；按钮为 **CONTINUE INITIATION · $400**。
- 权益分成已经拥有与完成后获得：前两包、Intel、投票显示已拥有；Console／第四包提示完成 Initiation 后解锁，避免把已有权益重新售卖。
- Device Claim 对这类用户弹窗提示继续完成 Initiation；确认后前往其专属视图，付款前不能分配设备。
- 在 Initiation 页面追踪前两包的真实进度，**后续再做**；当前不得填充虚假的备货／发货数据。完成后前两包延续原记录，再加入第三、第四包，不能新建重复履约。
- 不自行增加临时身份到期日、催收倒计时或数字权限失效日期。

成员是否提前占用 S26 名额、旧批次及编号如何迁移仍待明确；本次不自动将所有历史 $12 用户计入 S26。

上线余项见 [会员化大版本上线清单](launch-checklist.zh.md)。

## 6. 历史记录：$12 Initial Voyager Pack

以下保留旧方案与当时的实现记录，仅供追溯；其中“当前”“已上线”“待补”等描述均指记录时状态，不代表本次核验结论，也不将旧方案的美国包邮等条件自动沿用至新方案。

### 1. 定位

商业化的核心是一个**一次性买断的实体+数字混合礼包**——花 **$12** 成为航行者，邮寄一份
"Initial Voyager Pack"。它把"付费"包装成"被组织正式接纳、收到入会物料"的仪式，而非冷冰冰的订阅。
展示页 **`/voyager-pack`**（长滚动 iframe 商品页）。

### 2. 锁定的产品决策

- **$12 含运费、仅美国**（Stripe `shipping_address_collection.allowed_countries=['US']`），一次性买断。
- **付费即 role=voyager，与被授予设备的 voyager 完全同权**（含机密 intel、信号解谜参与等）。
- Phase 1 **手动发货**；付款前不额外采集字段；事务邮件复用 Supabase（新账号靠 inviteUserByEmail）。
- 当前批次 `2026 Batch S2`。

### 3. 礼包内容（5 件，文案定稿）

1. Welcome Letter（欢迎信）
2. Voyager Badge（徽章）
3. Mysterious Component Parts（神秘组件，标签含 RANDOM PICK）
4. Voyager Status（数字权益：Batch Seat→`/voyagers`、Inner Circle Access→`/vote`）
5. Priority Match Access（优先匹配权）

> 1–3 为实体邮寄，4–5 为数字即时生效。

### 4. 购买链路

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

### 5. 订单与履约

- `voyager_orders` 表：Stripe 字段 + 美国地址 + 物流追踪（carrier / tracking_number / tracking_url /
  shipped_at / delivered_at），RLS 仅本人可读。
- **Profile 页履约时间线**：`paid → preparing → shipped → delivered` 四段进度 + 追踪链接（见 01）。
- **后台 `/admin/orders`**：Architect 录入承运商/单号、推进状态（驱动追踪邮件）；
  也可**手动建单**（`createOrderManually`，用于线下/赠送/测试，幂等并自动 provision）。

### 6. 批次（Batch）

`batches` 表（单一 `is_current`）。升级时入当前批次，发放会员号。历史成员 `Original Batch`，
当前 `2026 Batch S2`。批次是"入会席位 / 限量感"的叙事载体。

### 7. 数据与权限要点

| 项 | 说明 |
|---|---|
| `voyager_orders` | 订单 + 地址 + 物流；RLS 本人可读，architect 全读 |
| `batches` | 批次，单一 is_current |
| `provision_voyager(uuid)` | 原子升级 RPC（不降级 architect） |
| 价格 | `PACK_PRICE_CENTS = 1200`（`src/lib/stripe.ts`） |
| 销售开关 | `SALES_OPEN` 常量（console / voyager-pack / api/checkout 三处需同步） |

### 8. 当前状态与缺口

- ✅ 商品页、四态 CTA、Stripe checkout（含 mock）、webhook、订单、履约时间线、后台录单、手动建单、批次均已上线。
- ⬜ 退款触发的角色降级尚未实现。
- ⬜ 给已有账号的购买确认邮件待补。
- 🟡 仅美国发货；国际化/多 SKU 未做。

### 9. 未来钩子

- 多 SKU / 标签绑定（World Builder Pack vs Device Seeker Pack）。
- 复购 / 升级礼包；批次限量与"提前解锁 Console（折扣）"接积分体系。


[全站切换实施清单 / Site rollout checklist](initiation-rollout.zh.md)

## 本轮最高优先级与配送入口

2026-10-06：最高优先级为正式支付、设备领取闭环、NPC 入会管理、权限统一、配送与售后。$520 付款时在 Stripe 收集收货信息，参考原 Device 购买流程；$400 补款沿用。Device Claim 复用已确认地址，不重复收集。旧用户未补款也保留前两包的配送权益。[售后草案](shipping-aftercare-draft.zh.md)尚未作为正式条款发布，完整任务见[上线清单](launch-checklist.zh.md)。
