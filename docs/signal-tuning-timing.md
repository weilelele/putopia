# Signal Tuning 时间机制 — 开发文档（v1 草案）

> 目的：澄清 Initial Vision → Signal Tuning 的完整时间规则，并定义需要开发的具体功能。
> 本文是**澄清用规格**，不是最终实现。代码标识符/列名用英文，说明用中文。

---

## 0. 一句话概括

一个世界的生命周期由**三段时间**串起来：

```
提交 Initial Vision
   │
   │  ① scan 窗口（6–8h 随机）          ← 等待「是否真的存在」
   ▼
第一题放出
   │
   │  ② 投票窗口（24h 固定）            ← 每道题开放投票
   ▼
第一题关闭
   │
   │  ③ gap 空档（后台固定时长）        ← searching 屏，倒计时到下一题
   ▼
第二题放出 → 投票 24h → gap → 第三题 …（循环）
```

---

## 1. 三个参数

| 参数 | 含义 | 取值 | 存储位置 |
|------|------|------|---------|
| **scan 窗口** | 提交后到第一题放出的等待 | **6–8h 随机** | `worlds.scan_until`（已存在） |
| **投票窗口** | 每道题开放投票时长 | **24h，固定，不可配** | 代码常量 `VOTE_WINDOW_HOURS = 24` |
| **gap 空档** | 一题关闭 → 下一题放出的空档 | 后台固定时长（如 4h） | `signal_threads.gap_hours`（**新增**） |

> 一道题的完整周期 `C = 24 + gap_hours`。例如 gap=4 → 每 28h 推进一题。

---

## 2. 已确认的决策（全部锁定）

1. scan 窗口改为 **6–8h**（现状代码是 8–10h，需改常量）。
2. 投票窗口 **24h 固定**，后台不提供配置。
3. **第一题的 24h 从 scan 结束那一刻 (`scan_until`) 开始计时** —— 即 `reveal_anchor_at = scan_until`。
4. gap 空档展示为**独立的一屏 searching 页**（复用现有 searching 屏）。
5. 若 gap 结束时下一题还没被 Architect 写出 → 显示**「搜索失败」**；**之后 Architect 在后台补上并 publish，该题立即放出**（其 24h 从补上那刻起算，后续题顺延）。
6. **`gap_hours` 默认 4 小时。**
7. **旧数据一次性接管到新模型**（见 §6 迁移）。

> 决策 5 的「补上即放出」使每题的**实际放出时间可能晚于排程**，因此时间公式从单一 `anchor + k·C` 升级为**逐题前向链**（见 §5）。

---

## 3. 完整时间线（举例）

设 scan 在 `D1 12:00` 结束，`gap_hours = 4`，周期 `C = 28h`：

| 题 | 放出 (open) | 关闭 (close) | gap 空档 |
|----|------------|-------------|---------|
| Q0 | D1 12:00 | D2 12:00 | D2 12:00 → 16:00（searching） |
| Q1 | D2 16:00 | D3 16:00 | D3 16:00 → 20:00（searching） |
| Q2 | D3 20:00 | D4 20:00 | D4 20:00 → D5 00:00 |
| … | 每周期 +28h | | |

- `Q0 open = anchor`（= scan_until）
- `Qk open = anchor + k·C`
- `Qk close = Qk open + 24h`
- gap 期间 searching 倒计时指向 `Q(k+1) open`

---

## 4. 状态机（世界详情页 / signal feed）

给定 `now`，世界处于以下唯一状态：

| 状态 | 条件 | 用户看到 |
|------|------|---------|
| **SCANNING** | `now < scan_until` | scan 倒计时 hero（6–8h） |
| **SCAN_FAILED** | scan 结束且无 Q0 | 扫描失败 hero（可 re-scan） |
| **TUNING_OPEN** | `phase.kind === 'open'` | 该题，可投票 |
| **TUNING_GAP** (searching) | `phase.kind === 'gap'` | searching 屏 + 倒计时到下一题 |
| **SEARCH_FAILED** | `phase.kind === 'search_failed'` | 「搜索失败」屏（补上后立即转回 OPEN） |
| **ESTABLISHED** | 世界 `lifecycle_state = stable`（人工） | 正式世界页（本文范围外） |

（`phase` = §5 `tuningPhase(now)` 的返回。）

---

## 5. 纯时间数学（可单测，无 DB/DOM）

放 `src/lib/signal/reveal.ts`。核心从「单一公式」改为**逐题前向链** —— 因为决策 5（失败后补写立刻放出）让每题的实际放出可能晚于排程。

**常量与周期：**

```ts
export const VOTE_WINDOW_HOURS = 24
// 周期 C = 24 + gap_hours
```

**每题实际放出时间（前向递推）：**

```
openAt(0) = anchor                                  // = scan_until
openAt(k) = max( openAt(k-1) + C, publishedAt(k) )  // k >= 1
```

- `publishedAt(k)` = 第 k 题被 publish 的时刻（**已有列** `signal_tasks.published_at`）。
- **正常**（提前写好）：`publishedAt(k) ≤ openAt(k-1)+C` → `openAt(k) = openAt(k-1)+C`（整齐排程节奏）。
- **迟到**（搜索失败后才补）：`publishedAt(k) > openAt(k-1)+C` → `openAt(k) = publishedAt(k)`（补上即放出），后续题从这个更晚的点顺延。
- 第 k 题未 publish → `openAt(k)` 待定。

**关闭时间：** `closeAt(k) = openAt(k) + 24h`

**阶段判定 `tuningPhase(now)`：** 令 `k` = 最大的「已 publish 且 `openAt(k) ≤ now`」的题。

```
无此 k（now < openAt(0)）        → before（仍在 scan）
now < closeAt(k)                → open，第 k 题开放，closeAt(k) 关闭
now ≥ closeAt(k)（第 k 题已关）：
    nextOpen = openAt(k) + C
    第 k+1 题已 publish 且 now < openAt(k+1) → gap，倒计时到 openAt(k+1)
    第 k+1 题未 publish：
        now < nextOpen   → gap，倒计时到 nextOpen（预计放出）
        now ≥ nextOpen   → search_failed（逾期未补；补上后 openAt(k+1)=publishedAt → 立即放出）
```

**函数签名：**

```ts
export interface DaySchedule { dayIndex: number; openAt: Date | null; closeAt: Date | null }

// 由 anchor + gap + 各已发布题的 published_at 算出整条链
export function buildSchedule(
  anchorISO: string | null,
  gapHours: number,
  publishedDays: { dayIndex: number; publishedAtISO: string }[],
): DaySchedule[]

export type TuningPhase =
  | { kind: 'before' }
  | { kind: 'open';          index: number; closeAt: Date }
  | { kind: 'gap';           index: number; nextOpenAt: Date }
  | { kind: 'search_failed'; index: number }  // 第 index 题（最后开放的）已关，下一题逾期未补

export function tuningPhase(schedule: DaySchedule[], gapHours: number, now?: Date): TuningPhase
```

> `tuningPhase` 只算**时间档位**；「该题是否可投」由 §7 叠加 `phase.kind === 'open' && day_index === phase.index`。

---

## 6. 数据模型变更与旧数据迁移

**唯一的新列。** `published_at` 已存在（schema_v39，且已在 publish/unpublish 时自动维护），链模型直接复用，无需新增。

**迁移 `schema_vN.sql`（新文件，勿改旧文件）：**

```sql
-- gap：题间空档（小时）。NOT NULL DEFAULT 4 → 所有现有 thread 自动获得 4h。
ALTER TABLE public.signal_threads
  ADD COLUMN IF NOT EXISTS gap_hours INTEGER NOT NULL DEFAULT 4;
```

**旧数据如何「一次性接管」（决策 7）—— 基本自动：**

新模型读三样东西，全部已具备：
- `reveal_anchor_at`（已存在）
- `gap_hours`（上面的 `NOT NULL DEFAULT 4` 让现有行立即拥有 4h）
- 各题 `published_at`（已存在并已 backfill）

⚠️ **注意一个语义变化：** 旧的在飞行中世界，其 Day 0/1/2 多在 anchor 附近一次性写好（背靠背 24h、无 gap）。换到新模型后，链会把它们按 28h 重新拉开 → **正在进行的世界的"当前题"可能往前挪一格**（一道已关的题可能重新开放）。

因此迁移收尾要做一次人工核对：

```sql
-- 列出仍在 Signal Tuning 的世界（可能受影响）
SELECT t.id AS thread_id, w.id AS world_id, w.name, w.lifecycle_state, t.reveal_anchor_at
FROM public.signal_threads t
JOIN public.worlds w ON w.id = t.world_id
WHERE w.lifecycle_state IN ('picked','syncing')
  AND t.reveal_anchor_at IS NOT NULL;
```

- 若结果为 **0 行**（早期阶段很可能）→ 无需处理，迁移完成。
- 若有在飞行世界 → 逐个 **re-anchor**：把 `reveal_anchor_at` 重设为合适时间，让其"当前应开放的题"留在 open（按需提供每行 SQL）。

**`reveal_interval_hours`：** 被「24h 固定 + gap_hours」取代，成员侧判定不再读它。列暂留（不破坏旧数据），标记 deprecated，后续清理。

**`reveal_anchor_at` 语义收紧：**
- 旧：第一次 publish Day 0 时 = 当时时间。
- 新：**scan 结算为 READY 时，设为 `scan_until`**（决策 3）。Architect「Restart from now」仍可覆盖为当前时间。

**scan 范围改动不影响存量：** 改 `SCAN_MIN/MAX_HOURS` 只影响**新提交**；已 rolled 的 `scan_until` 保持原值。

---

## 7. 服务端投票关闭（`submitSignalResponse`）

现状（origin/main, line ~810）：按 `floor((now-anchor)/interval)` 算激活日，非激活日拒绝。

**改为：** 用链 + `tuningPhase` 判定：

```ts
const schedule = buildSchedule(thread.reveal_anchor_at, thread.gap_hours, publishedDays)
const phase = tuningPhase(schedule, thread.gap_hours, new Date())
if (phase.kind !== 'open' || (task.day_index ?? 0) !== phase.index) {
  return { ok: false, error: 'Voting for this day has closed' }
}
```

（`publishedDays` = 该 thread 所有 `is_published` 题的 `{ dayIndex, publishedAtISO }`。）

效果：
- gap 空档期 → 任何题都不可投（`phase.kind === 'gap'`）。
- 只有「当前开放的那一题」可投，过期题/未来题/空档全部拒绝。

---

## 8. 成员侧渲染（`buildPublishedDays` 等）

重写当前的 `buildPublishedDays`（origin/main 已有 searching 雏形，但 searching 仅在「Architect 没跟上」时触发且 `failed` 恒为 true）。新逻辑：

```
schedule = buildSchedule(anchor, gap, publishedDays)
phase    = tuningPhase(schedule, gap, now)

switch phase.kind:
  before:        返回空（详情页此时本就是 scan 状态）
  open:          显示第 phase.index 题（可投）+ 更早的题只读结果
  gap:           TUNING_GAP：searching 屏（failed:false），倒计时 = phase.nextOpenAt，
                 展示上一题（phase.index）的众选结果（pickWinnerAsset）
  search_failed: SEARCH_FAILED：searching 屏（failed:true），无倒计时
```

> 决策 5 的「补上即放出」**自动成立**：Architect 补写 day phase.index+1 并 publish 后，下次读取时
> `publishedAt` 进入链 → `openAt(index+1) = publishedAt → ≤ now` → `tuningPhase` 直接落到 `open`，
> 无需任何额外触发或写操作。

`SearchingState` 扩展：`failed: false` 用于 TUNING_GAP（有倒计时），`failed: true` 用于 SEARCH_FAILED。
字段沿用现有 `searchUntil` / `prevDayIndex` / `prevAsset`。

---

## 9. scan ↔ 第一题对齐（决策 3）— 惰性解析，无需持久化

**实现采用惰性回退**，比"在 READY 时写 anchor"更稳健（无结算时序竞态）：

> **anchor = `thread.reveal_anchor_at ?? world.scan_until`**，在每次读取时解析。

- 新世界：`reveal_anchor_at` 为 null（`setTaskPublished` **不再**在 publish 时盖 anchor）→ anchor = `scan_until` → Q0 的 24h 精确地从 scan 结束起算。
- Architect「Restart from now」：写 `reveal_anchor_at = now`，优先于 `scan_until`。
- 旧的在飞行世界：`reveal_anchor_at` 已有值 → 继续使用（§6 接管）。

所有读取点统一用这个回退：`submitSignalResponse`、`buildPublishedDays`、`getInvestigationFeed`、`getDispatchDashboard`、`recall.ts`、`engagement.ts`、admin 预览（经 `InvestigationConfig.scanUntil`）。

**前置条件（Rule 2a）：** Architect 必须在 scan 窗口内（6–8h）写好并 publish Q0，世界才会 READY；否则 SCAN_FAILED。`scan-resolve.ts` 无需改动（anchor 不再持久化）。

---

## 10. 下游连带（邮件）

`recall.ts` 与 `engagement.ts` 用 `revealAt(anchor, interval, dayIndex)` 与 `isRevealed` 判定「第 k 天是否已揭示」。周期模型改变后**必须同步**：

- 改用 §5 的 `buildSchedule` 取每题 `openAt`（替代 `anchor + k·interval`）。
- 召回邮件（24h 后提醒未投的人）的「24h」自然对齐到该题的 `[openAt, closeAt]` 窗口。
- 否则邮件会在错误时间触发。

属于本次必改项，列入清单。

---

## 11. 后台 UI（`/admin/signal-tasks`）

现状：单个输入框「REVEAL EVERY (HOURS)」。

**改为：**
- 移除可配的「reveal interval」。
- 新增「**GAP BETWEEN QUESTIONS (HOURS)**」输入框 → 写 `gap_hours`。
- 投票窗口显示为只读说明「24h（fixed）」。
- 时间线预览（已有 `computeRevealAt` 预览）按新周期重算。
- 「Restart from now」保留语义（覆盖 `reveal_anchor_at = now`）。

---

## 12. 边界处理（全部已定）

| # | 情况 | 处理 |
|---|------|------|
| E1 | `gap_hours` 默认值 | **4h**（决策 6） |
| E2 | gap 结束 Architect 仍没写下一题 | 显示「搜索失败」；补写并 publish 后**立即放出**（决策 5）—— 由 §5 链模型 `openAt(k)=max(scheduled, publishedAt)` 自动成立 |
| E3 | 旧的在飞行中世界 | 一次性接管：`gap_hours` 默认接管 + 人工核对在飞行世界（§6）。语义变化已说明。 |
| E4 | scan 期间 Architect 写好 Q0 但 scan 未结束 | Q0 已 publish，详情页仍 SCANNING（决策 3：必须等 `scan_until`） |
| E5 | 历史题（已关闭）是否只读可见 | 是，只读展示结果（与现状一致） |

---

## 13. 开发清单（按阶段）

**Phase 1 — 纯逻辑（可先单测）** ✅
- [x] `scan.ts`：`SCAN_MIN_HOURS = 6`, `SCAN_MAX_HOURS = 8`
- [x] `reveal.ts`：新增 `VOTE_WINDOW_HOURS`、`buildSchedule`、`tuningPhase`（含 `search_failed`）、`hasOpened` + 单测（正常/迟到/搜索失败/恢复）
- [x] 迁移 `schema_v51.sql`：`signal_threads.gap_hours INTEGER NOT NULL DEFAULT 4`（`published_at` 已存在，无需新增）

**Phase 2 — 服务端** ✅
- [x] `submitSignalResponse`：改用 `buildSchedule`+`tuningPhase` 做开放/关闭判定
- [x] `buildPublishedDays` + `getInvestigationFeed` + `getDispatchDashboard`：按 §8 重写（`scheduleView`）
- [x] anchor 惰性回退 `reveal_anchor_at ?? scan_until`（§9）；`setTaskPublished` 不再盖 anchor；`scan-resolve.ts` 无需改动

**Phase 3 — 下游 & UI** ✅
- [x] `recall.ts` / `engagement.ts`：揭示时间换算到 `buildSchedule.openAt`（含 anchor 回退）
- [x] searching 屏：`SearchingState.failed` 已区分 gap（倒计时）vs search-failed，UI 无需改动（决策 4）
- [x] `/admin/signal-tasks`：gap_hours 输入框（替换 reveal-interval）+ 时间线预览改用链

**Phase 4 — 验证 & 迁移收尾**
- [x] `tsc --noEmit`（0 error）/ `lint`（0 error）/ `vitest`（58 passed）
- [ ] preview 上端到端：提交 → scan → Q0 开 → 关 → gap → Q1；并验证「搜索失败 → 补题 → 立即放出」
- [ ] 生产跑 §6 的在飞行世界 SELECT，按需 re-anchor；应用 `schema_v51.sql`
