# 01 · 身份与进度体系

## 1. 定位

身份体系是**主轴 A（进度引擎）**的实现，决定"玩家是谁、能做什么、下一步去哪"。
它把营销获客（访客→申请人）与付费/养成转化（申请人→航行者）串成一条可视化的"路径（Path）"。

## 2. 角色与升级路径

```
Guest ──注册──► Applicant ──┬── 路径 A：直接购买 $12 航行者礼包 ──► Voyager
                            └── 路径 B：任务门控（完成前置任务）──► Voyager（待销售开放时）
Architect：后台手动授予，不走上面流程
```

- **Guest → Applicant**：提交邮箱申请 → 收 Supabase 邀请邮件 → `/register` 设置昵称+密码 →
  `voyager_profiles` 自动建行（触发器，role=applicant）。详见 [获客与引导](../11-onboarding-acquisition/zh.md)。
- **Applicant → Voyager**：唯一服务端入口 `provisionVoyagerMembership(userId)`——确保 profile 行存在 →
  原子升级（`provision_voyager` RPC：role=voyager + 发放会员号 member_no + 加入当前批次）→
  首次激活时向 Status 流发 `voyager_activated` 事件。**幂等**，对 architect 不降级。
- **后台审核 application=approved** 也会把对应账号直接改成 voyager（`applications.ts`）。

## 3. 航行者路径页 `/voyager-path`（任务门控体验）

这是申请人的"养成主界面"，用一条阶段轨（Applicant → Voyager → Console）+ 任务清单呈现进度。

**当前生效的两个前置任务**（`tasks.ts` 中 `allDone = sighting && quiz`）：

| # | 任务 | 完成判定 | 入口 |
|---|---|---|---|
| 01 | **Report a Sighting（上报迹象）** | 该用户在 `worlds` 表有 `submitted_by` = 自己的一条记录 | `/worlds/submit` |
| 02 | **Qualify for Active Service（通过测验）** | 通过申请人测验，写 `task_quiz_at` 时间戳 | `/quiz` |

> 历史设计里还有"投票≥2 次不同议题（`votes`）"与"读完一篇 intel（`task_intel_at`）"两项，
> 代码仍在追踪，但**已不作为升级门槛**（见 `getApplicantTaskStatus`）。

阶段轨之后是 **Voyager / Console 阶段的权益预览**（用弹窗解释每项权益），以及锁定态提示
（Device Seeker = "材料准备中"、Signal/Console = "即将开放"）。

## 4. 直接购买路径 `/voyager-pack`

绕过任务，直接花 $12 购买"Initial Voyager Pack"即时升级为 Voyager。详见 [商业化](../10-commerce/zh.md)。
两条路径通过 **A/B 实验**在首页广告位上分流（见 §6）。

## 5. 会员号与批次（Batch）

- 升级时由 `provision_voyager` 原子发放**会员号 `member_no`**（如 VOYAGER #007）并写 `member_since`。
- 玩家被分入**当前批次** `batches`（`is_current=true`，如 `2026 Batch S2`）；历史成员为 `Original Batch`。
- `member_source` 区分 `granted`（被授予设备）/ `paid`（付费）。两者**完全同权**。
- Profile 页对"纯 Voyager"展示 `VOYAGER #NNN · <批次>`；Architect 不带会员号。

## 6. A/B 实验：直接购买 vs 任务门控

- `voyager_profiles.experiment_group ∈ {direct, task_gated, null}`，由 `experiment.ts` 首次访问时分配。
- 首页广告位 `VoyagerAdSlot`（仅对 applicant、销售开放时显示）：
  - `direct` → 橙色 "INITIAL VOYAGER PACK" → `/voyager-pack`（直接买）。
  - `task_gated` → 琥珀 "EARN YOUR STATUS" → `/voyager-path`（先做任务）。
- `/voyager-pack` 的 CTA 按 `task_gated` 组校验任务门：未完成则按钮变为"Complete Tasks to Purchase"。

## 7. Voyager 标签（Tag）— 🟡 设计中 / 部分

> 标签是"航行者等级下可叠加的身份标记"，**不是独立角色**。一个 Voyager 可拥有一个或两个标签。

| 标签 | 含义 | 状态 |
|---|---|---|
| **World Builder** | 识别信号、参与世界构筑 | ✅ 当前默认走的方向（`provisionVoyagerMembership` 发的激活事件文案即 "World Builder"） |
| **Device Seeker** | 判断设备位置 | ⬜ 锁定，UI 显示"即将开放 / 材料准备中" |

> `system-design.md` 设计了独立 `voyager_tags` 表（多行=多标签、`is_paid` 绑定 Pack）。
> 当前生产代码尚未建该表；标签主要体现在文案与 `/voyager-path` 的锁定占位上。

## 8. 个人档案 `/profile`

- **身份头部**：头像、昵称、角色徽章、（Voyager）会员号+批次。
- **礼包履约时间线**：`paid → preparing → shipped → delivered` 四段进度 + 物流单号/追踪链接（见商业化）。
- **可编辑信息**：昵称、地点、Bio（≤240 字）、社交链接（X / Instagram / LinkedIn）。
- **权限门**：仅 Voyager / Architect 可编辑档案与看履约；Applicant 看到"PROFILE LOCKED + 去看你的路径"。

## 9. 路径状态条 `PathStatusBar`

首页与档案常驻的"身份小卡"：头像 · 身份 · 设备状态。点设备触发"设备扫描中"弹窗
（航行者尚未分配 Multiverse Console 时的占位文案）。它是进入 Path 的入口锚点。

## 10. 数据与权限要点

| 项 | 位置 |
|---|---|
| 角色枚举 | `user_role`（`schema.sql`） |
| profile 行自动创建 | `handle_new_user()` 触发器，默认 applicant，回填 email（v40） |
| 升级原子函数 | `provision_voyager(uuid)` RPC（`schema_v21`） |
| 会员字段 | `member_source / member_no / member_since / batch_label`（`schema_v20`+） |
| 任务时间戳 | `task_quiz_at / task_intel_at`（`voyager_profiles`） |
| 实验分组 | `experiment_group`（`experiment.ts`） |
| 注册完成标记 | `registered_at`（区别于 `joined_at`=邀请发出时间） |

> **统计口径提醒**：真实"完成注册"= `registered_at` 非空；`joined_at` 只代表邀请邮件已发出，
> 不能用来算转化率。

## 11. 当前状态与缺口

- ✅ 角色、升级、会员号、批次、A/B、Path 页、档案、履约时间线均已上线。
- 🟡 Voyager 标签仅占位；`voyager_tags` 表未建。
- ⬜ 积分体系 / Console 提前解锁未实现（`schema_v33` 占位）。
- ⬜ 退款触发的角色降级、给已有账号的确认邮件仍待补。

## 12. 未来钩子

- 把 World Builder / Device Seeker 真正落表，开放双标签与按标签的深度权益。
- 引入积分（来自信号解谜参与、上报采纳等）→ 折扣解锁 Console 或更高批次席位。
- Path 页接入真实任务进度的实时刷新与"下一步"强引导。
