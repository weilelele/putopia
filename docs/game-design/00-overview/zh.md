# 00 · 总览：世界观、角色与系统骨架

## 1. 产品定位

Multiverse Collective 是一个**叙事驱动的角色扮演式社区平台**，对外表现为一个神秘组织的"内部网络"。
它不是传统意义上的关卡制游戏，而是把"社区行为"（投稿、投票、辨认信号、讨论）包装进一套
连贯的科幻世界观与身份进阶体系，让用户在"参与社区"的同时获得"扮演航行者、守护多元宇宙"的代入感。

- **载体**：Next.js 16 + Supabase 的 Web 应用，桌面端为侧边导航、移动端为底部导航。
- **风格**：纯橙 + 深空蓝 + 等宽 Courier Prime 字体，整体是一种"复古终端 / HUD 控制台"质感。
- **口号**：*"Building better worlds, together." / "Explore parallel worlds."*

## 2. 核心虚构（世界观）

| 概念 | 含义 |
|---|---|
| **Multiverse Collective（多元宇宙集体 / 组织）** | 玩家加入的秘密组织，对外称"我们守护多元宇宙的秩序"。 |
| **Voyager（航行者）** | 组织成员的身份称谓。被"选中"去观测、探索平行世界。 |
| **Multiverse Console（多元宇宙控制台）** | 核心道具设备——一台像复古收音机/电视的装置，拧动旋钮搜索信号，可看到平行世界的画面。屏幕亮红灯=与平行世界建立了连接；"量子能量按钮"可向平行世界发送讯息。 |
| **Parallel Worlds（平行世界）** | 玩家要去"发现并确认存在"的对象，构成 World Records 档案。 |
| **Signal（信号）** | 平行世界传来的图像/声音碎片；辨认信号是核心日常玩法。 |
| **Architect（建筑师 / 议会）** | 组织的管理层（运营），负责审核、出题、发布。 |

> 叙事基调参考 `content/stories.ts` 中的两篇第一人称故事：玩家收到设备、拧旋钮、第一次被平行世界
> 的人"回看"、红灯亮起的战栗感——这是整个产品想反复唤起的情绪锚点。

## 3. 两条正交的主轴

整个系统可理解为**两条互相正交的状态机**，其余模块都是挂在上面的"内容源"或"任务源"。

### 主轴 A — 用户进度（身份引擎）

```
访客 Guest ──► 申请人 Applicant ──(完成任务)──► 航行者 Voyager ──► (设计中) 解锁更深权益
                                       ▲
                              两条路径择一：
                              · 直接购买 $12 航行者礼包
                              · 任务门控路径（完成前置任务）
```

详见 [`01-identity-progression`](../01-identity-progression/zh.md)。

### 主轴 B — 世界生命周期（World Building 工作流）

```
玩家上报迹象 ──► 初始构想(Initial Vision) ──► 信号调谐(Signal Tuning) ──► 已确立世界(Established World)
   Stage 1                                    Stage 2（每日解谜众包辨认）        Stage 3（归档进 World Records）
```

详见 [`02-world-building`](../02-world-building/zh.md) 与 [`03-signal-dispatch`](../03-signal-dispatch/zh.md)。

> **关键判断**：World Building 与 Signal Dispatch 是同一套后端的两个视角——World Building 是"以世界为中心"
> 的展示，Signal Dispatch 是"以每日解谜为中心"的参与界面。二者共享 `worlds` / `signal_threads` / `signal_tasks` 表。

## 4. 角色权限矩阵

| 角色 | 来源 | 能看 | 能做 |
|---|---|---|---|
| **Guest 访客** | 未登录 | 公开内容（首页广播、公开 intel） | 浏览、申请、看营销引导页 |
| **Applicant 申请人** | 注册后默认 | 绝大多数页面 | 上报世界、投票、读 intel、做测验、围观信号解谜（不可填报） |
| **Voyager 航行者** | 付费或任务门控升级 | 全部内容（含机密 intel） | 申请人全部 + 参与信号解谜、投稿日志、被分配设备、编辑完整档案 |
| **Architect 建筑师** | 后台手动授予 | 全部 + 后台 | 全部管理：出题、审核、发布、CRUD、身份代发 |

> 角色枚举：`guest / applicant / voyager / architect`（`schema.sql` 的 `user_role`）。
> 注册即默认 `applicant`（`handle_new_user` 触发器）。升级到 `voyager` 的唯一写入口是
> `provisionVoyagerMembership()`（付费/手动），或后台审核 application 时直接改角色。

## 5. 信息架构（导航）

**桌面侧边栏**：INTEL（情报）· DEVICE ARCHIVE（设备档案）· VOYAGER LOGS（航行者日志）·
VOYAGERS（成员名册）· VOTING HUB（投票中心）· WORLD RECORDS（世界档案）。

**移动底栏**：主栏 HOME / INTEL / DEVICES / VOYAGERS；"MORE" 抽屉内含
DISPATCH（信号派遣）/ VOYAGER LOGS / VOTING HUB / WORLD RECORDS / MY PROFILE。

**首页 `/console`**：根据登录态切换——
- 访客：品牌 Hero + Multiverse Console 介绍面板 + 申请/登录 CTA + "向我们提问"（运营人 X 账号）。
- 申请人：品牌 Hero + 路径状态条 + Status 动态流 + 航行者升级广告位（A/B）。
- 航行者：欢迎语 + 路径状态条 + Status 流。
- 所有登录态下方拼接：设备登记、最新情报、世界档案、活跃投票等模块预览。

## 6. 模块全景图（本 GDD 覆盖范围）

| 模块 | 状态 | 文档 |
|---|---|---|
| 身份与进度 / 礼包升级 / 标签 | ✅ / 🟡 标签 | 01 |
| 世界构筑（3 阶段生命周期、上报迹象） | ✅ | 02 |
| 信号派遣（投资 thread、每日解谜、Cosmo 取材、召回） | ✅ | 03 |
| 投票中心（角色分级投票） | ✅ | 04 |
| 情报（公开/机密文章、阅读追踪） | ✅ | 05 |
| 航行者日志（故事投稿/审核） | ✅ | 06 |
| 设备档案（已知/未知设备、认领、Device Seeker 锁定） | ✅ / 🟡 | 07 |
| 多元宇宙控制台（设备虚构 + 功能面板） | ✅ | 08 |
| 社区社交（评论线程、身份代发、Status 流、摘要流） | ✅ | 09 |
| 商业化（$12 航行者礼包、Stripe、订单履约、批次） | ✅ | 10 |
| 获客引导（漏斗、UTM 变体、申请、注册、邮件、A/B） | ✅ | 11 |
| 后台运营（各模块管理工具） | ✅ | 12 |

## 7. 未来钩子（已埋点、待设计）

- **积分体系 + Multiverse Console 提前解锁**：`schema_v33` 占位的 `points_ledger` / `console_unlocked_at`，
  当前**暂缓**，未进开发排期。
- **Voyager 标签**：World Builder（识别信号）/ Device Seeker（判断设备位置，当前锁定"即将开放"）。
- **设备探索进度**：未知设备有 `exploration_progress`，目前仅展示，无玩法循环。
- **信号 thread 的 clarity/drift 自动推进**：`schema_v34` 设计过"众包多数 → 次日更清晰"的自动机制，
  v38 已改为**纯手动出题**，这些列保留未用。
