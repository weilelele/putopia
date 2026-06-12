# Putopia 进度体系 — 系统设计文档（Phase 0）

> 范围：把"注册 → Applicant → Voyager(Track) → 付费 World Builder → 每日任务 → 积分 → Multiverse Console"这条完整链路，连同四大开发板块（世界工作流 / 测试 / 任务跟踪 / 每日信号任务），梳理成一套可落地的数据模型与分期路线。
>
> 本文是 **Phase 0 交付物**：先定地基（表结构 + 状态机 + 复用边界），编码前评审。迁移草案为 `if not exists` 幂等增量风格，沿用现有 `schema_vN.sql` 约定。

---

## 1. 体系总览

整套产品是 **两条正交的状态机**，其余功能都是挂在上面的"任务源"和"内容源"。

### 主轴 A — 用户进度状态机（进度引擎）

```
注册 ──► Applicant ──(完成 4 项任务)──► 选 Track ──► Voyager(免费)
            │                                            │
            │                                     购买对应 Pack
            │                                            ▼
            │                              付费 Voyager / World Builder
            │                                            ▼
            │                              每日"分辨信号"任务 ──► 攒积分
            │                                            ▼
            └──(全程可上报迹象 / 评论)        积分达标 ──► 提前解锁 Multiverse Console(折扣价)
```

Applicant 的 4 项任务：
- **(a) 上报迹象** — 提交一段图文，描述相信存在的平行世界迹象（落在主轴 B）
- **(b) 参与投票** — 在最新议题完成 ≥2 次投票
- **(c) 阅读文章** — 读一篇 Architect 的 `intel` 文章
- **(d) 参与测试** — 完成并通过一个 Quiz

### 主轴 B — 世界内容生命周期（WorldLog 工作流）

```
用户上报(相信存在) ──► 社区讨论 / 配图
   ──► 官方 Pick(开始信号对接)
   ──► 信号对接完成(发现稳定平行世界)   ← 现存所有 world 都在这一阶段
```

### 挂载关系

| 类别 | 成员 | 归属 |
|---|---|---|
| 任务源（回写主轴 A） | 上报迹象 / 投票 / 阅读 / Quiz | 完成后由 server action 回写进度引擎 |
| 顶层独立模块 | Signal Tasks（每日信号征集） | **不接进度引擎**；与 World Logs/Voyager Logs 同级，详见 §4.5 |
| 内容/社交 | worlds、intel、stories、comments | 贯穿全程 |

**核心设计判断**：任务跟踪系统（板块 3）是主轴 A 的实现，它本身不产生内容，只"订阅" Applicant 4 个任务源的完成事件。因此必须做成通用的 **任务定义 + 完成判定 + 进度** 模型，而非把 4 个任务硬编码进一个页面——否则扩展到 Multiverse Console 阶段要推倒重来。每日信号征集是另一类东西（无对错的众包收集），独立成模块，不混进进度引擎。

---

## 2. 现状盘点（复用 vs 新建）

### 已有，可复用

| 能力 | 位置 |
|---|---|
| 角色枚举 `guest/applicant/voyager/architect` | `schema.sql` `user_role` |
| 付费态 `member_source/member_no/member_since` | `schema_v20.sql` |
| `worlds` 表 + CRUD（**仅 Architect**，状态只有 `is_verified`） | `schema_v2.sql`、`src/lib/actions/worlds.ts` |
| `intel` 文章（公开/机密分级） | `schema_v2.sql`、`src/lib/actions/intel.ts` |
| `votes` + `vote_responses`（带 `vote_scope`） | `schema.sql`、`src/lib/actions/votes.ts` |
| `stories`（Voyager 图文，发布工作流） | `schema_v2.sql`、`src/lib/actions/stories.ts` |
| `comments`（多态，**已支持 `subject_type='world'`**） | `schema_v18.sql`、`src/lib/actions/comments.ts` |
| 付费链路 `batches`/`voyager_orders`/Stripe/`provisionVoyagerMembership` | `schema_v20.sql`、`src/lib/actions/membership.ts` |

### 需新建

- Track 概念（World Builder / Device Seeker，**可双重身份**）
- 任务系统（定义 + 每用户进度）
- Quiz 模块（单选题）
- 每日"分辨信号"任务（视觉关联 / 听力辨析）
- 积分流水 + Multiverse Console 解锁

### worlds 需改造

当前 `worlds` 是 Architect 后台专属、状态仅 `is_verified` 布尔。需要：① 用户提交入口 + RLS 放开；② 生命周期多状态；③ 配图。

---

## 3. 角色 / Tag / 会员的关系

三者是**正交**的，不要塞进一个枚举：

- **role**（已有）：账户阶段 `applicant → voyager`。`provisionVoyagerMembership` 已负责 `applicant→voyager` 升级，是唯一升级入口。
- **tag**（新）：**World Builder / Device Seeker 不是独立身份，而是 Voyager 等级下的 tag**。一个 Voyager 可以拥有其中一个 tag，也可以两个都有。所以用独立表（多行 = 多 tag），而非单列枚举或子角色。
  - `world_builder` — 识别信号
  - `device_seeker` — 判断设备位置（**当前不开放**：UI 显示"即将开放/锁定"，但在 Profile 页两个 tag 都可见，其中一个处于锁定态）
- **membership / Pack**（已有付费态）：是否购买了某 tag 的 Pack。Pack 购买后该 tag 的 `is_paid` 置真，解锁该 tag 的深度权益。

> 注：每日任务（信号征集）不再由 tag/付费门控参与资格——见 §4.5 的重大修订。tag 主要决定 Profile 呈现、Pack 绑定关系与未来的深度权益。

---

## 4. 数据模型与迁移草案

下一个迁移序号为 **`schema_v28`**。按板块分组、各自独立可单独执行。约定：`create table if not exists` / `add column if not exists`，显式 `grant`，RLS 用 `exists(select 1 from voyager_profiles where id=auth.uid() and role in (...))`，内容表用 text slug 主键、事件表用 uuid，复用 `set_updated_at()` 触发器。

### 4.1 `schema_v28` — Voyager Tag（World Builder / Device Seeker）

> Tag 是 Voyager 等级下的可叠加标记，不是独立身份。多行表示一个用户拥有多个 tag。

```sql
create type public.voyager_tag as enum ('world_builder', 'device_seeker');

create table if not exists public.voyager_tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.voyager_profiles(id) on delete cascade,
  tag         public.voyager_tag not null,
  is_paid     boolean not null default false,   -- 是否已购买该 tag 的 Pack
  order_id    uuid references public.voyager_orders(id) on delete set null,
  selected_at timestamptz not null default now(),
  paid_at     timestamptz,
  unique (user_id, tag)
);

alter table public.voyager_tags enable row level security;

create policy "tags_select_own" on public.voyager_tags
  for select using (user_id = auth.uid());
create policy "tags_select_architect" on public.voyager_tags
  for select using (exists (select 1 from public.voyager_profiles
    where id = auth.uid() and role = 'architect'));

grant all on table public.voyager_tags to service_role;
grant select on table public.voyager_tags to authenticated;
```

写入（选 tag / 标记付费）走 service_role 的 server action，集中在 `membership.ts`，与 `provisionVoyagerMembership` 同一处。Profile 页同时渲染两个 tag：`world_builder` 正常，`device_seeker` 渲染为"即将开放/锁定"占位（不可选）。

### 4.2 `schema_v29` — 世界生命周期 + 配图（板块 1）

```sql
create type public.world_lifecycle as enum ('proposed', 'picked', 'syncing', 'stable');

alter table public.worlds
  add column if not exists lifecycle_state public.world_lifecycle not null default 'stable',
  add column if not exists submitted_by    uuid references public.voyager_profiles(id) on delete set null,
  add column if not exists submitted_at    timestamptz;

-- 现存数据全部回填为 stable（与"目前所有 world 都在第三阶段"一致）
update public.worlds set lifecycle_state = 'stable' where lifecycle_state is null;

create table if not exists public.world_images (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null references public.worlds(id) on delete cascade,
  url         text not null,             -- Supabase Storage 公链；或外部转载 URL
  storage_path text,                     -- 上传到 Storage 时的对象路径（外链时为空）
  caption     text,
  source      text,                      -- 'ai' | 'photo' | 'repost'
  uploaded_by uuid references public.voyager_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists world_images_world_idx on public.world_images (world_id);
```

**图片存储（回答 Q1）：用 Supabase Storage。** 新建 public bucket `world-images`，上传走 server action（service_role）写对象、拿公链回填 `world_images.url` 并记 `storage_path`。
- **AI 生成 / 实拍**：用户在前端选文件 → 上传到 bucket → 落 `url + storage_path`。
- **转载外链**：`source='repost'` 时只填 `url`、`storage_path` 留空——这条路不需要额外流程，但要注意两点：① 外链可能失效（不归我们托管），② 防盗链/热链可能加载失败。若要稳，可在后台把转载图也"抓取转存"到 bucket，但首版可以先只存 URL。
- bucket 建议设 Storage RLS：写入仅 service_role，读公开。

**RLS 放开用户提交**（新增 `proposed` 态的 insert 策略；保留 Architect 全权）：

```sql
-- 认证用户可提交"提案中"的世界
create policy "worlds_insert_proposed" on public.worlds
  for insert with check (
    submitted_by = auth.uid()
    and lifecycle_state = 'proposed'
    and exists (select 1 from public.voyager_profiles where id = auth.uid())
  );
-- 提案/已选中的世界对所有认证用户可读（供社区讨论）；
-- 现有 worlds_select_voyager 仅 voyager+ 可读，需补 applicant 可见 proposed/picked
create policy "worlds_select_pipeline" on public.worlds
  for select using (
    lifecycle_state in ('proposed', 'picked')
    and auth.uid() is not null
  );
```

> 讨论复用 `comments`（`subject_type='world'`，已支持）。Pick / 推进状态是 Architect 后台动作（`updateWorld` 加 `lifecycle_state` 流转 + 审计）。

### 4.3 `schema_v30` — 任务引擎（板块 3，地基）

通用"任务定义 + 进度"模型，覆盖 Applicant 4 任务，并预留到 Console。

```sql
create type public.task_stage as enum ('applicant', 'voyager', 'console');
create type public.task_kind  as enum
  ('report_sighting', 'cast_votes', 'read_intel', 'pass_quiz', 'daily_signal');

create table if not exists public.task_definitions (
  key          text primary key,          -- 'applicant.report_sighting' 等稳定标识
  stage        public.task_stage not null,
  kind         public.task_kind  not null,
  title        text not null,
  description  text,
  target_count integer not null default 1, -- 如投票需 2 次 → 2
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  config       jsonb not null default '{}'  -- 完成判定参数（如指定 quiz_id）
);

create table if not exists public.user_task_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.voyager_profiles(id) on delete cascade,
  task_key      text not null references public.task_definitions(key) on delete cascade,
  current_count integer not null default 0,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  unique (user_id, task_key)
);
create index if not exists user_task_progress_user_idx on public.user_task_progress (user_id);

alter table public.user_task_progress enable row level security;
create policy "progress_select_own" on public.user_task_progress
  for select using (user_id = auth.uid());
grant all on table public.user_task_progress to service_role;
grant select on table public.user_task_progress to authenticated;
```

**完成判定策略**：不要让前端写进度。各任务源的 server action 里，在原有写入成功后调用统一的 `recordTaskProgress(userId, taskKey, increment)`（service_role），它读 `target_count`，达标即写 `completed_at`。四个 Applicant 任务的口径（已确认）：

- **(a) 上报迹象** `report_sighting`（target 1）：世界提交成功 → +1。
- **(b) 参与投票** `cast_votes`（target 2，**按不同议题去重**）：`submitVoteResponse` 成功后，统计该用户在 `vote_responses` 中 **distinct `vote_id`** 的数量，达到 2 即完成。即"任意两个议题各投一票"——不限 `vote_scope`，不要求同一最新议题。实现上 `recordTaskProgress` 对这类任务用"重算 distinct 计数"而非简单 +1，避免同一议题重复投票被计两次（`config: { "distinct_on": "vote_id" }`）。
- **(c) 阅读文章** `read_intel`（target 1）：**滚动到底即算完成**。阅读页底部加哨兵元素，`IntersectionObserver` 触发后调 `markIntelRead(intelId)` → +1。
- **(d) 参与测试** `pass_quiz`（target 1）：Quiz 通过 → +1。这是获得购买 Pack 资格的 4 个前置任务之一，并非"通过即得 Pack"。

这样"哪些任务、要做几次、怎么去重"全由 `task_definitions` + `config` 数据驱动，新增阶段只加行。

### 4.4 `schema_v31` — Quiz 测试模块（板块 2）

```sql
create table if not exists public.quizzes (
  id           text primary key,          -- slug
  title        text not null,
  description  text,
  pass_score   integer not null default 1, -- 需答对题数
  is_active    boolean not null default true,
  created_by   uuid references public.voyager_profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     text not null references public.quizzes(id) on delete cascade,
  prompt      text not null,
  options     jsonb not null,            -- [{key,label}] 单选
  answer_key  text not null,             -- 正确 option key（不下发前端）
  sort_order  integer not null default 0
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id);

create table if not exists public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.voyager_profiles(id) on delete cascade,
  quiz_id     text not null references public.quizzes(id) on delete cascade,
  score       integer not null,
  passed      boolean not null,
  answers     jsonb not null,
  created_at  timestamptz not null default now()
);
```

> 评分在 server action 内做（`answer_key` 绝不下发前端）；通过即调 `recordTaskProgress(..., 'applicant.pass_quiz')`。Quiz 通过是"获得购买 Pack 资格"的闸门——购买入口校验该 attempt。

### 4.5 `schema_v32` — 每日信号征集（Signal Tasks，板块 4）

> **重大修订（按你的说明）：这不是测验，没有标准答案。** 它的语义是"组织每天向社区**求助 / 征集**信号判断"——我们在收集大家各自独立的填报，而不是考大家对错。因此：
> - **不存 `answer_key`、不判 `is_correct`、不发 result 对错。**
> - 题面**不显示答案**，只显示**有多少人参与**。
> - 为保证独立判断：**用户在自己提交之前，看不到任何人的填报分布**；提交后才解锁聚合分布（类似投票揭晓）。
> - 这是一个**与 World Logs / Voyager Logs 同级的顶层导航标签**（首页导航栏可见），不是埋在某个 tag 里的子页面。

```sql
create type public.signal_task_type as enum ('visual_match', 'visual_odd_one', 'audio_odd_one');

create table if not exists public.signal_tasks (
  id          uuid primary key default gen_random_uuid(),
  task_date   date not null,
  type        public.signal_task_type not null,
  prompt      text,
  assets      jsonb not null,            -- 图/音 URL 列表 + 主图标记
  is_published boolean not null default false,  -- 后台排期，发布日才对外可见
  sort_order  integer not null default 0,
  created_by  uuid references public.voyager_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists signal_tasks_date_idx on public.signal_tasks (task_date);

create table if not exists public.signal_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.voyager_profiles(id) on delete cascade,
  task_id     uuid not null references public.signal_tasks(id) on delete cascade,
  selected    text not null,             -- 用户选的项；无对错，仅记录填报
  created_at  timestamptz not null default now(),
  unique (user_id, task_id)            -- 每题每人填一次
);
create index if not exists signal_responses_task_idx on public.signal_responses (task_id);
```

题型沿用：`visual_match`（主图找关联最强）/ `visual_odd_one`（5 图找不属于本世界的）/ `audio_odd_one`（听声辨异）。每天 2–5 题 = 同一 `task_date` 下若干行。

**可见性与参与权（已确认）：**

| 谁 | 看模块/题目 | 参与填报 | 看聚合分布 | 看参与人数 |
|---|---|---|---|---|
| Applicant | ✅ 能看到这个模块和题目 | ❌ 不能填 | ❌（自己没填） | ✅ 能看"多少人参与了" |
| Voyager（未填该题） | ✅ | ✅ | ❌（填前不可见，保独立判断） | ✅ |
| Voyager（已填该题） | ✅ | — | ✅ 提交后解锁分布 | ✅ |

> 即：Applicant 只能围观"有多少人参与"，不能参与、也看不到分布；Voyager 可以参与，但**必须先提交才能看到别人的填报**。聚合查询走 server action（`getSignalResultDistribution`），仅在 `signal_responses` 中存在该用户记录时才返回分布；参与人数 `count(*)` 对所有人开放。RLS：`signal_responses` 仅本人可读自己的行，分布统计走 service_role 聚合返回。

> 注：参与资格当前定为 `role='voyager'`（不再由 tag/付费门控）。是否要进一步限定到某 tag，留作后续小调整即可。

### 4.6 `schema_v33` — 积分 + Console 解锁（**暂缓，先不深入**）

> 按你的说明，积分这块暂不深入设计。下面只保留占位草案，等主线（Phase 1–4）跑通后再细化数值与规则；现在**不进入开发排期**。

```sql
create table if not exists public.points_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.voyager_profiles(id) on delete cascade,
  delta       integer not null,
  reason      text not null,
  ref_type    text,
  ref_id      text,
  created_at  timestamptz not null default now()
);
create index if not exists points_ledger_user_idx on public.points_ledger (user_id, created_at);

alter table public.voyager_profiles
  add column if not exists points_balance integer not null default 0,
  add column if not exists console_unlocked_at timestamptz;
```

> 设想：流水 + 余额双写；达阈值展示"提前解锁 Console（折扣价）"，价格逻辑接现有 `batches`/`voyager_orders`。**待后续确认积分来源、数值、阈值与折扣后再实现。**

---

## 5. 关键 server action 改动清单

| 文件 | 改动 |
|---|---|
| `lib/actions/membership.ts` | 新增 `selectTag` / `markTagPaid`（写 `voyager_tags`）；`provisionVoyagerMembership` 升级后联动 |
| `lib/actions/worlds.ts` | 新增 `submitWorld`（用户提案，`proposed`）、`pickWorld`/`advanceWorld`（Architect 流转）、`addWorldImage`（含 Storage 上传）；`getWorlds` 支持按 `lifecycle_state` 过滤 |
| 新 `lib/actions/tasks.ts` | `recordTaskProgress`、`getMyTaskProgress`、`getApplicantChecklist` |
| 新 `lib/actions/quizzes.ts` | `getQuiz`、`submitAttempt`（服务端评分，**有对错**） |
| 新 `lib/actions/signal-tasks.ts` | `getTodaySignalTasks`、`submitSignalResponse`（**无对错、仅记录填报**）、`getSignalResultDistribution`（仅本人已填后返回分布）、`getSignalParticipantCount`（对所有人开放） |
| `lib/actions/votes.ts` | `submitVoteResponse` 成功后按 distinct `vote_id` 重算 → `recordTaskProgress('applicant.cast_votes')` |
| 新 `lib/actions/intel.ts` | `markIntelRead`（滚动到底触发）→ `recordTaskProgress('applicant.read_intel')` |

> 注意：每日信号征集是**独立顶层模块，不接入任务进度引擎**（它不是 Applicant 清单里的任务，也不计对错/积分）。`task_definitions` 的 `daily_signal` 枚举值先保留给未来 Console 阶段，当前不使用。

---

## 6. 分期路线图

| Phase | 内容 | 迁移 | 产出闭环 |
|---|---|---|---|
| **0** | 本设计文档评审 + 迁移定稿 | — | 地基锁定 |
| **1** | WorldLog 前台工作流：用户提交 + 配图(Storage 上传) + 讨论 + Architect Pick/流转 | v29 | 任务(a) 有真实入口 |
| **2** | Quiz 模块（单选 + 服务端评分 + 后台出题） | v31 | 任务(d) 完成、Pack 闸门就绪 |
| **3** | 任务引擎 + Applicant Dashboard，串 4 任务 → 选 tag → 购 Pack → 升 Voyager / 拿 World Builder tag | v28, v30 | **完整主线跑通（第一阶段开放）** |
| **4** | Signal Tasks 顶层模块（后台排期出题 + 填报 UI + 提交后揭晓分布 + 参与人数） | v32 | 与 World Logs/Voyager Logs 同级的日常征集 |
| **5** | 积分 + Multiverse Console 提前解锁 | v33 | **暂缓**，待主线跑通后再设计 |

> 顺序原则：Phase 1–3 完成即可演示"注册 → 付费成为 Voyager(World Builder tag)"的完整链路，且每步都复用已有的 votes/intel/comments/payment，新建集中在 worlds 工作流与 Quiz。Phase 4 的 Signal Tasks 独立于主线，可与 Phase 3 并行或随后接入导航。

---

## 7. 待确认问题 — 已拍板（2026-06-09）

1. **配图存储** → ✅ 用 **Supabase Storage**（bucket `world-images`）。转载外链只存 URL、不需额外流程，但需接受外链可能失效/热链失败的风险（首版接受）。
2. **阅读完成判定** → ✅ **滚动到底即算完成**（底部哨兵 + IntersectionObserver）。
3. **投票口径** → ✅ **≥2 次、按不同议题去重**（任意两个议题各投一票即可），不限 `vote_scope`。
4. **Quiz 与 Pack** → ✅ Quiz 是获得购买资格的 **4 个前置任务之一**，不是"通过即得 Pack"。
5. **Device Seeker** → ✅ 显示"**即将开放/锁定**"；Profile 页两个 tag 同时可见，其一锁定。World Builder / Device Seeker 是 **Voyager 等级的 tag**（可拥一个或两个），不是独立身份。
6. **积分规则** → ⏸ **暂缓**，本轮不深入。
7. **Applicant 与每日任务** → ✅ Signal Tasks 升为**顶层导航标签**（同 World Logs/Voyager Logs）。**无标准答案**，是组织向社区求助征集。Applicant 能看到模块与题目、能看"多少人参与"，但**不能填报、看不到分布**；Voyager 可填，但**自己提交前看不到他人填报**（保独立判断），提交后揭晓分布。

### 仍待你确认的小项

- (Q1 衍生) 转载图首版"只存 URL"是否可接受？还是要后台抓取转存到 bucket？
- (Q5 衍生) 选 tag 与"成为 Voyager"的先后：是"完成 4 任务 → 先免费选 tag 成为 Voyager → 再买该 tag 的 Pack"，还是"买 Pack 时一并确定 tag"？（影响 `voyager_tags` 是先插 `is_paid=false` 行还是购买时才插行）
