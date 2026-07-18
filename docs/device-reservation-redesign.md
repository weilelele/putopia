# Device 预订体验重构 — 设计草案

> 目标：把 `/devices` 从「只读设备注册表」重构成一套以 **batch（批次）为主角** 的
> 预订体验。用户浏览可预订的平行批次 → 选择并支付 → 进入一段**有意义的等候旅程**
> （状态推进 + 每阶段邮件），最终拿到一台**在一定程度上独一无二**的设备。长期运营
> 持续上线新 batch。
>
> 本文基于当前代码实际状态撰写（分支 `claude/capacitor-prototype`）。复用了既有的
> `batches` / `voyager_orders` / 邮件基建，尽量不推倒重来。

---

## 0. 一句话与已定的核心决策

**一句话：** batch 成为商品单位。`/devices` 变成「批次预订大厅」，每个 batch 是一张
平行的卡片，处于四态之一；点进去可预订并支付，支付后进入分阶段的等候旅程。

**核心决策（已定）：$12 Pack 与「按批次预订」并存，但两者是一条上升漏斗。**

- **$12 Voyager Pack = 成为 Voyager 的必要入场券。** 保留现状（`/voyager-pack`）：拿周边/徽章、
  **升为 Voyager**、加入 cohort，不含设备。特权不在「买过 pack」这件事，而在**成为 Voyager**；
  pack 是那道门。
- **批次预订 = 「我要一台设备」。** 选定某个 open 批次支付，进入等候旅程，拿到一台带 unit 编号
  的专属设备。**Voyager 买更便宜、还能抢先；非 Voyager 也能买，但明显更贵（§8）。**

漏斗逻辑：先花 $12 成为 Voyager → 再预订设备（便宜 $30~40 + 抢先 12h）永远比不入会直接买划算，
所以购买路径天然把人推向「先入会」。

| | $12 Pack | 批次预订 |
|---|---|---|
| 交付物 | Voyager 身份 + 周边 | **一台设备** |
| 价格 | 固定 $12（Voyager 身份的入场券）| 每批次浮动、但在一个区间内；**Voyager = 批次价；非 Voyager = 批次价 + $30~40**（§8）|
| 购买后 | 一封确认邮件，结束 | 多阶段等候旅程 §6 |
| 谁能买 / 何时 | 所有人，随时 | 开放后**头 12h 仅 Voyager**，之后向所有人（§8.2）|
| persona | 代码里的「World Builder」路径 | 代码里的「Device Seeker」路径 |

> 两条线共用同一套 `voyager_orders` + provisioning，只是 batch 预订多带
> `batch_id / unit_no / device_id / journey_stage`。UI 上明确区分「入会」与「拿设备」两个入口。

---

## 1. 核心重构：batch 作为主角

| | 现状 | 重构后 |
|---|---|---|
| 商品单位 | 扁平 $12 Pack，不绑批次/设备 | **batch**，每个批次独立定价、独立故事 |
| `/devices` | 只读注册表（known/unknown） | **批次预订大厅**（按状态分组 + 搜索） |
| 购买后 | 立刻升 Voyager，一封确认邮件，结束 | 进入**多阶段等候旅程**，每阶段有状态+邮件 |
| 设备归属 | 仅 `devices.current_user_id`（admin 手动） | order → batch → 具体 device，带 unit 编号 |
| 独特性 | 无 | 每批次专属故事/外观/初始世界 + 每台 unit 编号 + 用户在等候中亲手塑造初始世界 |

**每个 batch 的特征（你的描述）：**
- 共享同一套故事背景，但在**外观、初始世界**等方面各有专属性；
- 数量从 1 台到几百台不等；
- 持续上线、放出新批次；
- 用户可搜索当前可预订的批次。

---

## 2. 四种批次状态（公开生命周期）

这四态直接对应你描述的四种设备状态，但它们本质上是**批次**的状态（batch-level），
而不是今天 `devices.status` 那套（那套保留给单台设备的物理状态）。

```
探索中 ──▶ 开放预订 ──▶ 准备中/运输中 ──▶ 已发放
scouting     open          preparing         delivered
(可候补)    (可预订)      (已订满,履约中)   (归档,社会证明)
```

| 状态 | code | 是否可预订 | 大厅卡片 UX | 主 CTA |
|---|---|---|---|---|
| **探索中** | `scouting` | 否 | 悬念卡：无价格，只有起源线索 + `exploration_progress` 进度。制造期待 | 「关注这个批次」→ 加入 per-batch 候补名单（收集邮箱，开放时首个通知） |
| **开放预订** | `open` | **是** | 完整详情：价格、专属故事、外观图、初始世界、**剩余名额进度条**（137/200 已预订）、**预订者名单 + 评论区**（§9）。开放后头 12h 显示「Voyager 抢先中 · 剩 Xh」| 「预订这个批次」（非 Voyager 在抢先期内为「Voyager 抢先中」禁用态）|
| **准备中/运输中** | `preparing` | 否（已订满） | 「已订满」徽章 + 批次级履约进度（准备→质检→发货）。已预订者看到自己的个人旅程；未预订者看「关注下一批」 | 预订者→「查看我的进度」；其他人→「候补下一批」 |
| **已发放** | `delivered` | 否 | 归档卡：本批次已全部送达，展示完成的故事 + 已激活世界画廊 + 谁拥有（社会证明/传承感）| 「看看这批次成为了什么」 |

> 状态由 admin 推进（配合容量自动辅助：订满可自动从 `open`→`preparing` 给出提示）。
> 大厅默认排序：`open` 置顶 → `scouting` → `preparing` → `delivered` 归档在最下。

---

## 3. 数据模型改动

尽量在既有表上加列，不新建重复表。

### 3.1 `batches` 升级为富实体

现状（`schema_v20.sql`）：`id, label, sort_index, is_current, opened_at`。新增：

```sql
-- schema_vN.sql (新迁移，勿改旧文件)
alter table public.batches
  add column if not exists code            text unique,          -- 'CAIRO-01'，用于搜索/URL slug
  add column if not exists state           text not null default 'scouting',
                                            -- 'scouting'|'open'|'preparing'|'delivered'
  add column if not exists title           text,                 -- '开罗发现'
  add column if not exists origin_location text,                 -- 'Cairo, Egypt'
  add column if not exists story           text,                 -- 共享背景 + 本批次专属叙事
  add column if not exists appearance      text,                 -- 外观描述（专属性）
  add column if not exists initial_world_name text,              -- 初始世界名
  add column if not exists initial_world_from text,              -- 渐变色（复用 worlds.gradient_*）
  add column if not exists initial_world_to   text,
  add column if not exists hero_image_path text,
  add column if not exists total_units     integer,              -- 容量：1 ~ 数百
  add column if not exists price_cents      integer,             -- 每批次定价（Voyager 价），落在一个目标价带内
  add column if not exists non_member_surcharge_cents integer default 3500, -- 非 Voyager 附加价（$30~40，§8.3）
  add column if not exists currency        text not null default 'usd',
  add column if not exists stripe_price_id text,                 -- 可选：每批次一个 Stripe Price
  add column if not exists opens_at        timestamptz,          -- state→open：Voyager 抢先开始时刻
  add column if not exists public_at       timestamptz,          -- 向所有人开放时刻（默认 opens_at + 12h，见 §8）
  add column if not exists closes_at       timestamptz,          -- 预订截止（可空）
  add column if not exists est_ship_at     timestamptz;          -- 预计发货

-- reserved_count 用 count(voyager_orders where batch_id=… and status in ('paid',…)) 派生，不落列
-- public_at 默认 = opens_at + interval '12 hours'；[opens_at, public_at) 即 Voyager 抢先窗口
```

`is_current` 保留给现有入会/批次归属逻辑向后兼容；**公开 UI 一律读 `state`**。

### 3.2 `voyager_orders` 接上 batch 与 unit（独特性）

现有履约字段（`status/batch_label/地址/carrier/tracking_*/paid_at/shipped_at/delivered_at`）
已经够用，只需补两处关系与编号：

```sql
alter table public.voyager_orders
  add column if not exists kind     text not null default 'reservation', -- 'pack' | 'reservation'：区分两条购买线
  add column if not exists batch_id text references public.batches(id),  -- 真正的 FK（今天只有 batch_label 文本）
  add column if not exists unit_no  integer,                             -- 批次内编号：'037 / 200'
  add column if not exists device_id text references public.devices(id), -- 履约时绑定的具体设备
  add column if not exists seeded_world_id uuid references public.worlds(id), -- 用户在等候中共创、绑定进设备的 signal patch/世界
  add column if not exists is_seed  boolean not null default false,      -- 冗余标记：seed（假账号）订单，便于名单/统计过滤（见 §9）
  add column if not exists journey_stage text not null default 'reserved';
  -- journey_stage: reserved|sealed|seeding|paired|shipped|delivered|activated (见 §6)
```

`unit_no` 用 per-batch 序列或 `reserved_count+1` 在支付成功时分配。`kind='pack'` 用于把
$12 轻量入会订单与 `kind='reservation'` 设备预订订单区分开——这也是「谁买过 Initial
Pack」的判定依据之一（见 §8）。

### 3.3 device ↔ world / signal patch 绑定（目前完全不存在）

今天没有 device→world 的 FK。若日后要让「设备从一开始就接收某些世界的信号」，最小改动是把
绑定放在 **order** 上（`seeded_world_id`），而不是 device 表——order 是天然的归属载体。
**但设备与 Signal Path 的具体绑定机制待后续定义**（§6 stage 3），本轮先不实现；`seeded_world_id`
先作为占位列保留。设备与人仍靠 `devices.current_user_id` 关联。

---

## 4. 页面架构 / 路由

| 路由 | 角色 | 说明 |
|---|---|---|
| `/devices` | **批次预订大厅** | 按 §2 四态分组 + 搜索。保留 `McConsolePanel` 作为 lore 头部 |
| `/devices/batch/[code]` | **批次详情 + 预订** | 故事、外观、初始世界、名额进度、预订 CTA |
| `/devices/[id]` | 单台设备 lore | 保留，主要服务「探索中」的未接触信号卡 |
| `/reservation`（或并入 voyager-path 的 CONSOLE 节点）| **我的等候旅程** | 个人订单追踪器：当前阶段、时间线、亲手塑造初始世界的入口 |
| `/admin/batches` | **批次运营台** | 新建/编辑批次、切状态、设容量与定价、推进履约、写每阶段文案 |

`/voyager-pack` 保留不变（$12 轻量入会线）。批次预订是独立入口：大厅 → 批次详情 →
`/api/checkout?batch=<id>`。首页/门禁需要有两个清晰区分的 CTA：「加入（$12）」与
「预订一台设备」。`/activate` 的 redirect 目标按运营主推哪条线再定。

---

## 5. 预订流程

```
大厅 /devices
  └─ 选一个 open 批次 ──▶ /devices/batch/[code]
        └─ [预订这个批次]
              ├─ 未登录 → /login?redirect=/api/checkout?batch=<id>
              └─ 已登录 → GET /api/checkout?batch=<id>
                    ├─ 校验：state=open、未订满、**抢先窗口**（now<public_at 且非 Voyager → 拒，提示剩余时间）
                    ├─ 定价（§8）：Voyager → batch.price_cents；非 Voyager → + non_member_surcharge_cents（$30~40）
                    ├─ 建 voyager_orders(kind='reservation', status=pending, batch_id, unit_no 预留)
                    ├─ Stripe Checkout（price_data{算出的总额} 或 batch.stripe_price_id[+ pack line_item]）
                    │     shipping_address_collection、metadata{order_id,batch_id}
                    └─ 成功 → /join/success?session_id=… → 触发等候旅程 §6
```

复用现有 `/api/checkout/route.ts`，把「固定 $12 Pack」参数化为「按 batch 取价 + 会员差价」。
支付成功写入 `batch_id / unit_no / kind='reservation'`。非 Voyager 结账页优先展示「+$12 成为
Voyager：本单更便宜 + 抢先」的转化引导（是否因附加价购买而自动升 Voyager 见 §8.3 待决策）。

**订满处理：** 结账入口先做一次乐观校验 `reserved_count < total_units`；Stripe 回调/成功
时做最终校验，超卖则退款并置 order 为 `refunded`（边界情况，量小可先人工兜底）。

---

## 6. 等候旅程（让等候有意义）— 订单阶段 + 邮件

这是「让等候有价值 + 让设备独一无二」的核心。每个订单沿 `journey_stage` 推进，每次推进
= 一个状态变化 + 一封邮件 + `/reservation` 页面上的一次可见变化。有些自动、有些 admin 驱动。

| # | stage | 触发 | 邮件（主题示意） | UI 变化 / 意义 |
|---|---|---|---|---|
| 1 | `reserved` | 支付成功（自动） | 「预订确认 · 你是 CAIRO-01 的 #037」 | 发放 **unit 编号**，旅程时间线出现 |
| 2 | `sealed` | 批次订满/截止，`open→preparing`（自动或 admin） | 「批次已封存，探索开始」 | 大厅里批次转 preparing；给出「独一无二」的第一层——名额锁定 |
| 3 | `seeding` | admin 开放共创窗口 | 「为你的设备做点什么」 | **共创/个性化槽位**（命名、投票、定制等，见 §6b）。与 Signal Path 的绑定**待后续定义**；先用 §6b 的轻量玩法占位，写入 `seeded_world_id`/`unit_name` 等 |
| 4 | `paired` | admin 把具体 `devices` 行配给 order | 「你的设备已配对 · MC-xxxx」+ 照片 | 揭示这台被修复设备的**出处/编号/照片**（provenance reveal） |
| 5 | `shipped` | admin 填 carrier+tracking（列已存在） | 「已发货」+ 物流单号 | 时间线到运输；`preparing` 批次可标注运输中 |
| 6 | `delivered` | admin 置 delivered（`delivered_at`）| 「激活指南」 | 开始 `deviceDays`「CONSOLE HOLDING」计数（HUD 已有）|
| 7 | `activated` | 用户激活后，其世界上线 | 「你的世界已上线」 | 承接 signal/world 系统；`seeded_world_id` 世界公开，用户记为 discoverer |

**复用邮件基建：**
- 交易类骨架直接沿用 `buildVoyagerPackEmail` 的深色模板风格；
- 第 3、7 阶段这种「因人/因世界而异」的邮件，**复用 `world-confirmed-email.ts` 那套模式**
  —— Claude（`claude-opus-4-8`）逐条生成专属文案 + 固定外壳 + 用时间戳列幂等
  （给 `voyager_orders` 加 `*_email_sent_at` 幂等列，或复用 `journey_stage` 判重）。
  这正是让每台设备「感觉独一无二」的文案手段。

**批次共享 vs 个体独特的分工：** 同一 batch 的第 1/2/5/6 阶段文案共享（批次故事一致）；
第 3/4/7 阶段按 unit 个体化（编号、亲手共创的世界、配对到的具体设备照片）。

### 6b. 付款→收货之间：可参与 + 可了解的内容菜单

阶段推进（上表）是「里程碑」；里程碑之间需要**持续可玩/可看的内容**，把死等变成有意义的过程。
下面把候选拆成两类，都挂在 `/reservation` 与批次详情页，随时间/阶段解锁。性价比标注：
🟢 便宜可复用 / 🟡 中 / 🔴 重。

**A. 可参与（互动 / 共创 / 归属）**

1. 🟢 **给你这台设备命名（callsign）** — 你为 `unit_no` 这台起名，随铭牌/证书交付。加
   `voyager_orders.unit_name`。最便宜、最强的归属钩子。
2. 🟢 **预订者专属投票** — 作为本批预订者，对批次级决定投票（这批先探索哪个世界、批次徽章、
   优先修复哪些部件）。复用 `votes`/`vote_responses`。制造「我们共同决定」的参与感。
3. 🟡 **外观小定制** — 从受限选项里选封印色 / 刻印符号 / finish，admin 履约时照做。既个性化又
   给你一个真实可交付的定制动作。加 `voyager_orders.customization jsonb`。
4. 🟡 **校准小任务（calibration）** — 等候期一串小任务/问答「把设备校准到你」，产出随设备交付的
   个人档案；每完成一项解锁一段 lore。复用现有 quiz 基建。
5. 🟢 **Ask-the-Architect / 批次 AMA** — 预订者提问，architect（真人或 lore 人设）在批次板集中
   回答。复用 `comments` / reply-tracking。
6. 🟡 **邀请同行（crew）** — 邀请朋友；同批预订则结为 cohort/星座，交付时互相可见。社交 + 拉新。
7. 🔴 **共创绑定进设备的内容** —— **与 Signal Path 的关联待后续定义**（原 signal patch，先占位，
   不阻塞其余）。

**B. 可了解（了解 / 期待）**

8. 🟢 **档案逐页解密（dossier）** — 每批一个「案卷」，按周解密新页：设备在哪被发现、修复记录、
   绑定的世界。lore 慢放，制造追更。落在 `batch_updates`。
9. 🟢 **修复进度仪表** — 全批「修复 X/Y、质检、封存、发货」HUD 进度条；派生自订单/批次状态。
10. 🟡 **预热「信号预览」** — 激活前收到来自你那个世界的 teaser 传输/明信片（短 lore 文字/图/音），
    像设备在预热；到货前就和世界建立关系。
11. 🟢 **车间日志（build log）** — 真实修复线的照片/短视频（**物理实拍**）+ **lore 叙事视频**交织，
    持续更新。挂 `batch_updates`（`kind` 分 `physical`/`lore`），复用 onboarding 视频基建。
12. 🟢 **往期批次战报** — 预订者可翻看已交付批次的世界与故事（`delivered` 归档），传承感 + FOMO。

**C. 仪式感（临近交付）**

13. 🟢 **真伪证书 / provenance 卡** — 数字证书：unit 编号、批次故事、发现日期，可保存的纪念物。
14. 🟡 **激活预约 / 开箱引导** — 临近到货，预约你的「激活时刻」，App 把首次开机做成一场仪式。

**新闻播报 = 内容底座。** 8/9/11 都落到一张轻表
`batch_updates(batch_id, kind, title, body, media_path, published_at)`，admin 在批次运营台发布，
可触发「本批次新进展」邮件。这些更新下面就是 §9 的评论区（也是 seed 账号的填充舞台）。

> **建议先落这批 🟢**：命名(#1) · 投票(#2) · 档案解密(#8) · 进度仪表(#9) · 车间日志(#11) ·
> 证书(#13)。全便宜、复用现成表，直接服务「归属 + 稀缺 + 仪式」三个目标。

---

## 7. 独一无二机制（汇总）

1. **批次专属性**：每 batch 专属故事线、外观、初始世界（`batches` 新列）。
2. **Unit 编号**：批次内序号 `037 / 200`，贯穿邮件与 `/reservation`、设备铭牌文案。
3. **等候期共创/个性化**（seeding 阶段）：命名、投票、定制等（§6b）把「等候」转化为「共创」。
   （与 Signal Path 的深度绑定待后续定义。）
4. **Provenance reveal**（paired 阶段）：揭示这台被修复设备的具体出处/照片/编号。
5. **激活即上线**：交付后激活，`seeded_world_id` 世界公开，用户永久记为 discoverer
   （接 `worlds.discoverer_id/name`），进入公共叙事，成为永久记录。

---

## 8. 权限与定价：特权挂在 Voyager 身份上

### 8.1 特权属于 Voyager，$12 Pack 是入场券

**不是「买过 pack 的人有特权」，而是「Voyager 有特权」**——买 $12 Pack 是成为 Voyager 的
必要条件（主要入口）。所以：

- **判定**：`voyager_profiles.role in ('voyager','architect')`。gating 一律用这个，最简单、
  覆盖所有入会路径。`voyager_orders.kind='pack'` 仅用于分析/文案，不用于 gating。
- Voyager 的两项核心特权：**(1) 抢先 12h（§8.2） (2) 更便宜地拿设备（§8.3）**。
- 非 Voyager 不是不能买设备，而是**更慢（要等 12h）+ 更贵（多付 $30~40）**。

### 8.2 12 小时 Voyager 抢先窗口（每个批次开放时都有）

批次进入 `open` 那一刻起：

```
[opens_at ── 12h ── public_at) : 仅 Voyager 可预订
[public_at ────────────▶       : 所有人可预订
```

- `public_at` 默认 = `opens_at + 12h`（§3.1）。
- 结账入口（§5）与批次详情 CTA 都做闸门：`now < public_at && !isVoyager` → 拦截，展示
  「Voyager 抢先中 · 剩 Xh Ym」倒计时 + 「$12 成为 Voyager，立刻可订 + 更便宜」的引导。
- 数量少的稀缺批次，这 12h 往往就能被 Voyager 订走——这正是给会员的核心特权。

### 8.3 定价规则（价差刻意拉大）

- **$12 Pack = 成为 Voyager 的必要门槛**，一次性。
- **设备价按批次浮动，但都落在一个区间内**（`batches.price_cents`，配一个目标价带）。
- **Voyager 预订 = 批次价**（便宜 + 抢先）。
- **非 Voyager 预订 = 批次价 + $30~40 附加**（`batches.non_member_surcharge_cents`，可给默认）。

| 买家 | 预订一台设备付的钱 | 抢先 |
|---|---|---|
| Voyager | `batch.price_cents` | ✅ 头 12h 即可 |
| 非 Voyager | `batch.price_cents + $30~40` | ❌ 等 public_at |

因为附加价（$30~40）远高于 $12，**「先花 $12 成为 Voyager 再买」永远更划算**——漏斗自我强化。
结账时对非 Voyager 主推「+$12 成为 Voyager：本单更便宜 + 抢先」，把转化点前置。

> **待你拍板（§13）：非 Voyager 走附加价买了设备，是否因此自动成为 Voyager？**
> 推荐**否**——保持「买 Pack 才是成为 Voyager 的必要条件」这条规则干净，附加价只是「不入会的
> 溢价」；结账页强力上引导他改走 +$12 入会路径。（若选「是」，附加价里其实就含了会员，逻辑
> 会和「pack 是必要条件」冲突，需重新定义。）

可选叠加：某些稀缺批次设 `requires_voyager` 布尔（仅 Voyager 可订，比抢先窗口更硬）。
`stripe.ts` 里 Voyager 复购 Pack 可给会员价。

---

## 9. 预订者名单、评论与 seed 账号（人造稀缺）

**核心规则：所有购买信息都绑定到 batch**（`voyager_orders.batch_id`）。因此每个批次详情页都能
展示**谁已经预订了这批设备**——一份预订者名单（头像 + display_name + `unit_no`），下面是评论区。
这份名单 + 评论就是稀缺感与社群感的来源。

**Seed 账号填充（人造稀缺）——运营手段：**

- 一批 100 台，可能其中六七十台由**我们自己生成的 seed 账号**「预订」，并在名单下留言、评论，
  制造「快订满了 / 很热闹」的观感。
- 数据模型支持：`voyager_profiles.is_seed boolean default false` 标记 seed 账号；
  `voyager_orders.is_seed`（冗余）标记 seed 订单。名额进度条与「已预订 X/Y」**默认把 seed 计入**
  （这正是制造稀缺的目的），但**统计后台/真实营收报表必须能 `where is_seed=false` 过滤**，否则
  自己的经营数据会被污染。seed 账号从 admin 批次运营台批量生成 + 投放评论。

> ⚠️ **务必留意的边界（不是阻拦，是提醒你有意识地划线）：** 向**真实付费用户**展示由 seed 账号
> 伪造的「预订数 / 评论」，在电商语境下属于「虚假稀缺 + 虚假评价」，多地消费者保护法规（如美国
> FTC 对虚假评论/代言、虚假稀缺声明的规则）对此有明确约束，可能带来合规与信任风险。建议：
> (a) 把 seed 内容严格限定在**世界观/lore 层**（把它当作 ARG 里的 NPC/剧情角色，而非「真实买家」），
> 避免以「真实成交」的口吻误导付费决策；(b) 数据侧用 `is_seed` 严格隔离，任何对外「售罄/名额」
> 数字若混入 seed，心里要清楚那是**运营叙事**而非真实库存。技术上我会照你的规则实现，这段只是
> 把风险摆在明处，具体尺度你来定。

---

## 10. 搜索

批次数量不大，先做**客户端过滤**即可：按 `code` / `origin_location` / `title` / 故事关键词
过滤，配合状态筛选 chip（开放预订 / 探索中 / 已发放）。默认聚焦「开放预订」。数量增长后
再下沉到服务端查询。

---

## 11. 复用清单（尽量不重造）

| 需求 | 复用什么 |
|---|---|
| 结账 | `src/app/api/checkout/route.ts`（参数化按 batch 取价）+ `src/lib/stripe.ts` |
| 订单/履约字段 | `voyager_orders`（status/地址/carrier/tracking/paid_at/shipped_at/delivered_at 已全） |
| 入会 provisioning | `provisionVoyagerMembership`（幂等）、`getCurrentBatch` |
| 批次实体 | `batches` 表（加列即可） |
| 交易邮件骨架 | `buildVoyagerPackEmail` / `sendEmail` |
| 个体化邮件（独特文案，幂等） | `world-confirmed-email.ts` 模式（Claude 生成 + 时间戳幂等） |
| 持有时长 HUD | `path-status-bar` 的 `deviceDays`「CONSOLE HOLDING」 |
| admin 履约 | `updateOrderFulfillment` / `/admin/orders`（扩展出 `/admin/batches`）|
| 进度视频（物理 + lore）| onboarding 视频基建（`onboarding` storage bucket、`video_url*`）|
| 名单评论区 / AMA | `comments` 表（`subject_type` union 加 `'batch'`）|
| 预订者投票 / 校准 | `votes`/`vote_responses`、quiz 基建 |
| signal patch 共创 | 现有 signal 系统（`signal_threads` / `signal-tasks`）—— **绑定机制待定义** |

---

## 12. 分阶段落地建议

- **M1 — 批次为商品单位（可卖）**：`batches` 加列 + admin 批次台 + 大厅四态展示 + 批次详情
  + 参数化结账（含 12h Voyager 抢先窗口 + Pack 差价定价 §8）+ `reserved`/`sealed` 两个旅程
  阶段与邮件 + **批次预订者名单**。**能预订、能收钱、能封批、能显示谁订了。**
- **M2 — 有意义的等候**：`paired`（provenance reveal）阶段 + `/reservation` 个人旅程页 +
  个体化邮件（Claude 模式）+ **6b 内容层先落 🟢**（命名 · 投票 · 档案解密 · 进度仪表 · 车间日志
  `batch_updates` · 证书）+ **名单评论区**。（signal patch 共创待定义后另排。）
- **M3 — 履约闭环**：`shipped`/`delivered`/`activated` 接入现有 tracking 与 signal/world
  上线；`delivered` 打通 `deviceDays`。
- **M4 — seed 运营与权限层**：seed 账号批量生成 + 名单/评论投放（`is_seed` 隔离，§9）；
  `requires_voyager` 专属批次、Voyager 复购 Pack 会员价。

> 注：seed 填充（§9）虽列在 M4，但若首批就想要「热闹感」，可在 M1 名单上线后即少量启用。

---

## 13. 待决策清单

1. ~~Pack 与批次预订关系~~ → **已定：并存 + 上升漏斗**。
2. ~~特权归属~~ → **已定：挂在 Voyager 身份；$12 Pack 是必要入场券；价差拉大到 $30~40**。
3. **[待拍板]** 非 Voyager 走附加价买了设备，是否**自动成为 Voyager**？（§8.3，推荐否）
4. 定价实现：每批次单价（`price_cents` 动态 `price_data`）还是每批次挂一个 Stripe Price
   （`stripe_price_id`）？数量少建议后者，频繁上新建议前者。附加价用一个额外 line_item 表达。
5. **[待定义]** 设备 ↔ Signal Path 绑定机制（§6 stage 3 / §3.3）——你说之后再定义。
6. seed 稀缺的尺度与边界（§9）：seed 计入对外「售罄/名额」数字到什么程度？评论投放多真实？
   —— 合规风险与信任成本由你定线，我按你的规则实现。
7. 超卖兜底：先人工退款，还是一开始就做名额乐观锁 + 自动退款？
