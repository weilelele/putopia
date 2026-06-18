# 12 · 后台与运营（Admin & Operations）

## 1. 定位

后台（`/admin/*`，仅 architect）是整套游戏的**"游戏主持 / 关卡编辑器"**——几乎所有"内容"和"进度"
都由 Architect 在后台手动驱动：出题、审核、发布、CRUD、发货、代发。理解后台 = 理解"这个游戏由谁
在背后运营、用什么节奏喂内容"。

## 2. 后台工具清单

| 路由 | 作用 | 关联系统 |
|---|---|---|
| `/admin` | 后台首页/入口 | — |
| `/admin/signal-tasks` | 信号解谜出题：建调查→加天→Cosmo 取材→挑选→发布 | 03 |
| `/admin/worlds` | 世界 CRUD（颜色/渐变/生命周期流转） | 02 |
| `/admin/votes` | 议题 CRUD | 04 |
| `/admin/intel` | 情报 CRUD（公开/机密） | 05 |
| `/admin/create-news` | AI 辅助生成情报草稿 | 05 |
| `/admin/stories` | 日志审核（发布/撤稿/编辑/删除） | 06 |
| `/admin/devices` | 设备 CRUD + 图片 + 分配（=升级 voyager） | 07 |
| `/admin/mc-config` | 控制台功能面板配置 | 08 |
| `/admin/voyagers` | 成员管理（含手动升级） | 01 |
| `/admin/orders` | 订单履约：录单号、推进状态、手动建单 | 10 |
| `/admin/quiz` | 申请人测验题库 CRUD（含答案，服务端评分） | 01 |
| `/admin/onboarding-preview` | 落地引导文案/变体编辑与预览 | 11 |
| `/admin/intel`（intel）/ `/admin/activity` | 活动/动态管理 | 09 |
| `/admin/analytics` / `/admin/devices`(devices 调试) | 分析与运营看板 | — |

## 3. 关键运营能力

- **身份代发（impersonation）**：Architect 可"POST AS"任意 voyager/architect 身份发评论，撑社区氛围
  （真实操作者记在隐藏的 `posted_by_id`）。
- **手动升级**：`provisionVoyagerByEmail`（按邮箱升 voyager）、审核 application=approved 直接升级。
- **手动建单/发货**：`createOrderManually`（线下/赠送/测试），后台录承运商+单号驱动追踪邮件。
- **AI 辅助**：情报草稿生成（`news-gen.ts`）。
- **测验评分**：`answer_key` 绝不下发前端，服务端 `submitQuizAnswers` 评分，pass_mark=4；
  通过写 `task_quiz_at`。

## 4. 测验（Quiz）系统补充

测验是申请人任务 02 的载体（页面 `/quiz`）：

- `quiz_questions`：prompt + options(jsonb) + answer_key（仅服务端）；默认题库 `applicant-baseline-v1`。
- 玩家答题 → 服务端评分 → 答对 ≥4 题即 passed → 写 `task_quiz_at`（幂等）。
- 后台全 CRUD + 拖拽排序。

## 5. 权限模型

- `/admin/*` 与 `/profile` 由 `proxy.ts`（Next.js 16 的 middleware 改名）做路由级保护：admin 需 architect。
- 内容写入普遍走 **service_role（admin client）**，绕过 RLS；读取按 RLS 分级。
- 例外：`can_edit_onboarding` 是页面级授权，允许非 architect 编辑落地引导。

## 6. 当前状态与缺口

- ✅ 各模块后台工具、代发、手动升级/建单、AI 草稿、测验评分均已上线。
- 🟡 后台高度依赖人工节奏（信号解谜纯手动出题）——运营成本是核心约束。
- ⬜ 缺少统一的"运营仪表盘"（跨模块的待办/健康度/转化总览）；分析散在 `/admin/analytics` + PostHog。

## 7. 未来钩子

- 运营仪表盘：待出题的调谐世界、待审日志、待发货订单、漏斗转化一屏总览。
- 半自动出题工具（在保留人工挑选的前提下，提升 Cosmo 取材效率）。
- 运营动作的审计与回滚（代发、升级、退款全链路可追溯）。
