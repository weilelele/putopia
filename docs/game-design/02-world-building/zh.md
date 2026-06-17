# 02 · 世界构筑（World Building）

## 1. 定位

世界构筑是**主轴 B（世界生命周期）**的玩家展示层，也是整个产品的"核心内容引擎"。
它回答："平行世界是怎么从一个模糊念头，被社区一起辨认、调谐，最终确立为档案的。"
对应页面是 **World Records `/worlds`**（档案/管线总览）与 **World Detail `/worlds/[id]`**（单世界详情）。

> 世界的"调谐"过程（每日解谜众包）由 **Signal Dispatch** 承载，见 [03](../03-signal-dispatch/zh.md)。
> 本篇聚焦世界对象本身、3 阶段生命周期、上报入口与档案呈现。

## 2. 3 阶段生命周期

后端 `worlds.lifecycle_state` 有四个内部值，对外**收敛为 3 个公开阶段**（`worldStage()` 映射）：

| 公开阶段 | 内部值 | 含义 | 在 `/worlds` 的区块 |
|---|---|---|---|
| **Stage 1 · Initial Vision（初始构想）** | `proposed` | 玩家刚上报的"迹象"，未审核 | INITIAL VISION（徽章 UNREVIEWED，琥珀色） |
| **Stage 2 · Signal Tuning（信号调谐）** | `picked` / `syncing` | 已被 Architect 选中，正通过每日解谜调谐 | SIGNAL TUNING（徽章 IN REVIEW / BUILDING，绿/蓝） |
| **Stage 3 · Established World（已确立世界）** | `stable` | 已确认存在，正式归档 | ESTABLISHED WORLD（徽章 CONFIRMED，橙色） |

`/worlds` 顶部有统计条（三阶段各自计数），下方依次铺三个区块的卡片网格。

## 3. 玩家旅程

```
① 上报迹象（任何登录用户）           ② Architect 选中并启动调谐            ③ 社区每日辨认信号          ④ 确立归档
   /worlds/submit                     promoteWorldToTuning               /signal Signal Dispatch     stable → World Records
   → proposed (Initial Vision)        → syncing (Signal Tuning)          逐日缩小、聚焦              → established
```

### 3.1 上报迹象 `/worlds/submit`

- 任何登录用户（含 applicant）都可提交。这是**申请人任务 01**（见 [01](../01-identity-progression/zh.md)）。
- 字段：世界名（中/英）、描述、氛围色（gradient_from/to —— 未配图世界用这两个色铺满卡片）。
- 提交即创建 `worlds` 行：`lifecycle_state='proposed'`、`is_verified=false`、`submitted_by=自己`、
  ID 形如 `PROP-XXXX`。同时向 Status 流发 `world_added` 事件，并跳回 `/worlds?submitted=<名>` 展示
  "SIGHTING FILED — 已进入 Architect 审核管线"的成功提示。

### 3.2 Architect 选中 → 启动调谐

- Architect 在后台把某个 `proposed` 世界**晋升为 Signal Tuning**（`promoteWorldToTuning`）：
  为它创建一条 **Investigation（=`signal_threads` 一行，绑定该 world）**，设定该世界的投票权限
  `vote_scope`，并把世界推进到 `syncing`。同时向社区 feed 发"Now Tuning: <世界名>"的系统故事。
- 也可由 Architect **直接新建一个世界进入调谐**（`createWorldForTuning`，ID 形如 `WB-XXXX`），
  用于没有现成玩家上报、运营想自己开题的情况。

### 3.3 调谐中（Stage 2）

详见 [03 Signal Dispatch](../03-signal-dispatch/zh.md)。要点：
- 每个调谐中的世界 = 一个 Investigation thread，下挂多"天（day）"的解谜。
- 卡片封面**实时更新**为该世界最近一天已发布解谜里的第一张视觉素材（`getTuningCovers`），
  封面优先级：实时调谐封面 → 上传的世界图 → 氛围渐变。

### 3.4 确立归档（Stage 3）

- Architect 将世界推进到 `stable`，它进入 **World Records 主档案**（公开、对所有人可见、缓存 60s）。
- 档案卡展示：封面（图或氛围色）、ID、名称、描述、发现者、发现日期。

## 4. 世界对象的数据结构

| 字段 | 说明 |
|---|---|
| `id` | text 主键（`PROP-*` 玩家上报 / `WB-*` 运营建 / 其它历史 ID） |
| `name` / `name_en` | 中/英名称 |
| `discoverer_id` / `discoverer_name` | 发现者（去规范化存名） |
| `discovery_date` | 发现日期 |
| `gradient_from` / `gradient_to` | 氛围色（无图时铺满卡片） |
| `image_path` | 上传的世界图（可选） |
| `description` | 描述 / 初始构想文本 |
| `lifecycle_state` | `proposed/picked/syncing/stable` |
| `vote_scope` | 该世界解谜的投票权限 `self/voters/all`（见 03） |
| `submitted_by` / `submitted_at` | 玩家上报来源 |
| `is_verified` | 历史布尔，stable 世界为 true |

**配图**：`world_images` 表（Supabase Storage `world-images` bucket）。上传走 server action（service_role）
写对象 + 回填公链。`source ∈ {upload, repost}`，转载外链只存 URL。

## 5. 权限与可见性

- **读**：stable 世界**对所有人公开**；proposed/picked/syncing 管线世界对**任意登录用户**可见
  （社区可围观在建世界）。
- **写**：任何登录用户可 insert `proposed` 世界（RLS `worlds_insert_proposed`）；状态流转、配图、
  删除等是 Architect 后台动作（service_role）。

## 6. 当前状态与缺口

- ✅ 3 阶段生命周期、上报入口、档案/管线展示、实时调谐封面、配图上传均已上线。
- 🟡 `picked` 与 `syncing` 在公开层都归"Signal Tuning"，内部区分（IN REVIEW vs BUILDING）仅徽章体现。
- ⬜ 玩家对"自己上报的世界进入了哪个阶段"的主动通知/追踪面板较弱（仅 Dispatch dashboard 的
  `yourWorlds` 列表）。
- ⬜ 世界详情页的社区讨论复用 `comments`（subject_type='world'），但"迹象被采纳/晋升"缺玩家激励闭环。

## 7. 未来钩子

- 上报采纳/晋升 → 给上报者积分或荣誉（接 01 的积分钩子）。
- "我的世界"追踪面板：上报→选中→调谐→确立 的个人进度墙。
- 氛围色之外，开放玩家在 Initial Vision 阶段附图，丰富早期卡片表现。
