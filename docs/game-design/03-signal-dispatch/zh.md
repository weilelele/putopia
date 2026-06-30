# 03 · 信号派遣（Signal Dispatch / 每日解谜）

## 1. 定位

Signal Dispatch 是产品的**核心日常参与玩法**，也是世界构筑 Stage 2"信号调谐"的引擎。
它把"辨认平行世界信号"做成一种**无对错的众包辨认**：组织每天向社区"求助"——
"这些信号里，哪一个最像 / 哪一个不属于这个世界？"——收集每个人的独立判断，逐日把一个
模糊的世界"调谐"得越来越清晰。页面是 **`/signal`（DISPATCH）**。

> 与"投票中心"（04）的区别：投票中心是经典民调（有明确选项、看结果）；Signal Dispatch 是
> 围绕**某个具体世界**的、连续多天的、视觉/听觉辨认解谜，承载世界生命周期。

## 2. 三个层级对象

```
World（世界，stage=syncing）
  └── Investigation / Thread（一次调查 = signal_threads 一行，绑定一个 world）
        └── Day（一天的解谜 = signal_tasks 一行，day_index 0,1,2…）
              └── Assets（候选素材 = signal_task_assets 多行，is_selected 的才上线）
                    └── Responses（玩家填报 = signal_responses，每人每天一次）
```

- **Investigation（thread）**：严格等于"一个处于信号调谐期的世界"。标题/封面/拥有者都取自 world。
- **Day（task）**：投资里的一天，有题型、题干（手写）、发布状态。`day_index` 串成时间链。
- **Asset**：从素材库取材、裁剪+故障化处理后的图/视频/音频候选；Architect 挑选 `is_selected` 的才对玩家可见。

## 3. 三种题型

| 题型 | 玩法 | 素材 |
|---|---|---|
| **visual_match（视觉关联）** | 给一张"主图（main）"，从若干选项里选"关联最强 / 最像同一个世界"的那张 | 图 |
| **visual_odd_one（视觉异类）** | 给一组图，找"不属于这个世界"的那一张 | 图 |
| **audio_odd_one（听觉异类）** | 给一组声音，听出"不属于这个世界"的那一段 | 音频（从视频抽轨） |

> 每天可换题型（`addDayToInvestigation` 默认沿用上一天题型，Architect 可改）。

## 4. 玩家体验（`/signal`）

`getInvestigationFeed` 返回所有"有已发布解谜"的世界调查，按世界卡片组织，每张卡展开其各天解谜。

**核心规则——独立判断 + 提交后揭晓**：

| 谁 | 看模块/题目 | 参与填报 | 看分布 | 看参与人数 |
|---|---|---|---|---|
| Applicant | ✅ | ❌（无资格） | ❌ | ✅ |
| Voyager（未填该题） | ✅ | ✅ | ❌（填前不可见，保独立判断） | ✅ |
| Voyager（已填该题） | ✅ | — | ✅ 提交后解锁 | ✅ |
| Architect | ✅ | ✅ | ✅（始终可见） | ✅ |

- **无对错**：题面只显示"有多少人参与"，**不显示正确答案，不判对错**。隐藏的"真值（target）"
  只存在后端 thread/asset 上（`is_target`），**永远不下发前端**（`getSignalFeed` 只 select 安全列）。
- **提交后揭晓**：玩家提交 `submitSignalResponse(taskId, assetId)` 后，才解锁该题的**填报分布**
  （每个选项被多少人选），类似投票揭晓。每人每天每题只能填一次（唯一约束）。

## 5. 按世界的投票权限 `vote_scope`

每个世界由 Architect 设定谁能对它的解谜填报（`worlds.vote_scope`，`eligibleToVote` 判定）：

| `vote_scope` | 含义 | 谁能填 |
|---|---|---|
| `self` | 私密探索 | 仅该世界拥有者（discoverer） |
| `voters` | 仅航行者 | role=voyager 及以上 |
| `all`（默认） | 全员 | 任意登录用户（含 applicant） |

> Architect 永远可填。不可填时卡片显示锁定原因："Log in to respond" / "Private — owner only" / "Voyagers only"。
> 注意：DB 的 RLS 仍要求 `signal_responses` 插入者为 voyager+（`signal_responses_insert_voyager`），
> 服务端 action 再叠加 per-world 的 `vote_scope` 判定——两层共同决定最终资格。

## 6. 邮件触达机制

Signal Dispatch 只保留两类邮件，都由每日 cron 端点 `/api/cron/signal-recall` 驱动：

1. **Re-engagement（掉队再参与）** — 针对**连续一段时间没回来**的参与者。`owner_absent`（世界主人连漏最近 2 个已揭示天）与 `voter_churn`（投过票的成员连漏最近 3 个已揭示天）两条规则，每人每次运行最多发一封（`src/lib/signal/engagement.ts`）。
2. **发布者提醒（信号 / 无信号）** — 提交目击后该世界进入 `scan_until` 倒计时（随机 6–8h，`src/lib/signal/scan.ts`）。倒计时结束由 `resolveCompletedScans` 判定（`src/lib/signal/scan-resolve.ts`，`scan_resolved_at` 幂等）：窗口内 architect 调谐了信号 → 发"有信号"（`world-confirmed-email.ts`）；否则 → 发"无信号"（`scan-failed-email.ts`）。

> **已移除：** 旧的 **Recall** 机制（`recall.ts`）——「每解锁一新天就提醒所有参与者」。它单次未填即触发、无频率上限，会对流失用户造成近乎每日的轰炸，且职责与 re-engagement 重叠。`signal_tasks.published_at / recall_sent_at`、`signal_recall_log` 等遗留字段/表保留但不再写入。

## 7. 出题工作流（Architect 后台 `/admin/signal-tasks`）

这是 Signal Dispatch 的"内容生产线"，**纯手动**（v38 起取消了自动出题/自动推进）：

```
① 启动调谐                ② 加一天                ③ 取材生成候选              ④ 人工挑选            ⑤ 发布
promoteWorldToTuning      addDayToInvestigation   generateCandidates /        setAssetSelected     setTaskPublished
/createWorldForTuning                             pullForgeAssets             setAssetRole/Order    （发 feed 故事）
```

### 7.1 素材来源 — Cosmo 内容库（只读）

- 解谜素材来自一个外部 MongoDB 内容库 **Cosmo**（`src/lib/cosmo.ts`）：频道 channel（含 freq）→
  内嵌 band → band 的 `imagePoolIds/videoPoolIds` → 取 ai-image / ai-video（过滤已完成、未删除）。
- 音频用 band.soundtrack 或从视频抽音轨。

### 7.2 处理管线（裁剪 + 故障化）

`src/lib/signal/process.ts` + `av.ts`：
- **图片**：按 `crop_config`（形状方/圆/矩、面积比例、位置、故障强度 glitchIntensity 0–100）裁剪+故障化。
- **视频**：裁剪+故障化生成短片段，并额外产出一张**动图 WebP（display_url）**用于前端自动循环展示。
- **音频**（audio_odd_one）：从视频抽取音频片段（约 25% 视频无音轨，会过采样补足）。
- 处理结果上传到 Storage `signal-assets` bucket，回填 `processed_url` / `display_url`。

### 7.3 取材两种方式

- **随机 Forge 导入**（`generateCandidates`）：对每个来源（channel+band）随机采样 N 个素材跑管线。
- **精确 Forge 挑选**（`pullForgeAssets`）：先浏览某 band 的素材（`listBandAssets`），手选具体 asset id 跑管线。

### 7.4 挑选与发布

- 所有候选先以 `is_selected=false` 落候选池；Architect 翻 `is_selected=true` 决定哪几个上线、
  设角色（main/option）与展示顺序。
- 发布（`setTaskPublished`）会：盖 `published_at`、重置召回护栏；若该天属于某 thread，自动向社区
  feed 发"Day N · <世界名>：新信号已上线"的系统故事。

## 8. 首页派遣看板 `getDispatchDashboard`

登录用户在首页可见的 Signal Dispatch 统计卡：
- `awaitingYou`：你有资格投、但还没投的已发布解谜数。
- `inTuning`：所有调谐中世界的已发布解谜总数。
- `yourWorlds`：你发现的世界及其当前阶段。

## 9. 数据与权限要点

| 表 | 角色 | 关键列 |
|---|---|---|
| `signal_threads` | **仅 architect**（含隐藏真值） | group_*/target_*（来源与真值）、`world_id`、`status(open/locked/lost)`、clarity/drift（v34，已弃用） |
| `signal_tasks` | 已发布对登录者可见 | `type`、`prompt`、`day_index`、`prev_task_id`、`published_at`、`recall_sent_at` |
| `signal_task_assets` | 仅 `is_selected` 且所属 task 已发布时可见 | `media`、`processed_url`、`display_url`、`asset_role`、`is_target`（不下发） |
| `signal_responses` | 仅本人可读自己；分布走 service_role 聚合 | 唯一(user,task) |

## 10. 历史演进（重要）

- 早期 `schema_v32/v33`：信号题是"独立顶层模块、与世界无关"的每日征集。
- `schema_v34`：引入 thread + 隐藏真值 + "众包多数→次日更清晰（clarity）/ 偏离→更糊（drift）"的**自动推进**设想。
- `schema_v38`（当前）：**把信号调谐焊接进世界生命周期**——thread 严格=一个调谐中的世界，
  且改为**纯手动出题**，clarity/drift 自动机制退役（列保留未用）。
- 这意味着 `system-design.md` 的 Phase 4 描述已被 v34/v38 的"World Building 化"重构覆盖，**以本篇为准**。

## 11. 当前状态与缺口

- ✅ 三题型、独立判断+揭晓、per-world 权限、召回、Cosmo 取材、裁剪/故障化、手动出题与发布均已上线。
- 🟡 隐藏真值 `is_target` 与 thread 的 `status(locked/lost)` 已存但**无玩法消费**（无自动确立/丢失）。
- ⬜ "调谐到什么程度算确立"目前靠 Architect 主观推进，无量化的 clarity 阈值玩法。
- ⬜ 玩家侧缺少"我的辨认准确度/贡献"成长反馈（因为刻意无对错）。

## 12. 未来钩子

- 用隐藏真值做"赛后揭晓 / 该世界最终被确认为 X"的剧情回收，但保持参与期不剧透。
- 重新启用 clarity/drift 的某种弱化版本，作为世界"调谐进度条"的可视化。
- 把召回从邮件扩展到站内通知 / 推送。
