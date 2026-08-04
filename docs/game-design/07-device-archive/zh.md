# 07 · 设备档案（Device Archive）

> 新版批次探索、申领、可配置阶段发放与持有者等待体验，见
> [`../../product/device-batch-experience.zh.md`](../../product/device-batch-experience.zh.md)。
> 本文以下内容仍用于记录当前产品现状。

## 1. 定位

设备档案是 **Multiverse Console 实体设备的登记册**——把核心道具"设备"做成可追踪的世界观资产：
有的设备已知归属与状态，有的还是"未知信号"待探索。它把虚构的"组织在全球追踪一台台控制台"
具象化，也是 Device Seeker 标签（设计中）的承载对象。页面 **`/devices`（DEVICE ARCHIVE）**
与 **`/devices/[id]`（详情）**。

## 2. 两类设备

| 类别 `knowledge` | 含义 | 关键字段 |
|---|---|---|
| **known（已知）** | 已确认归属/状态的设备 | `status`、`current_user_id/name`（操作者） |
| **unknown（未知）** | 拦截到信号但未建立联系 | `exploration_progress`（0–100 探索进度） |

设备状态 `status ∈ {available, in_use, needs_repair, unknown}`，在卡片上用绿/橙/红/灰色标识。

## 3. 玩法 / 体验

- 浏览设备登记册（Voyager+ 可见全部；首页对登录者展示"未知 1 + 已知 2"预览混排）。
- 设备详情：名称、归属地、描述、状态、当前操作者；评论讨论（comments，subject_type='device'）。
- **认领流程** `/devices/claim`：与 $12 礼包关联的"First Parts Pack（Cairo Batch 01）"——
  首页对 Architect 显示高亮的认领卡（`ClaimPreviewCard`，$12，"AWAITING CLAIM"）。
- **设备分配 = 升级 voyager**：Architect 在后台把设备分配给某人 → 该人升级为 voyager（`member_source=granted`）。
  这是与"付费升级"并列的另一条 Voyager 来源。

## 4. Device Seeker 标签 — ⬜ 锁定

"判断设备位置"是规划中的 **Device Seeker** 标签玩法（与 World Builder 并列的航行者方向）。
当前 UI 在 `/voyager-path` 等处显示"材料准备中 / 即将开放"，未实现实际玩法循环。

## 5. 数据与权限

| 项 | 说明 |
|---|---|
| `devices` 表 | id(text)、name、knowledge、location、description、image_path、status、current_user_*、exploration_progress、batch_id |
| 读 | `getAllDevices`（缓存 60s，全员同一份）；RLS 仅 voyager+ 可读 |
| 写 | Architect CRUD + 图片上传（Storage `devices` bucket）；assign/release/更新进度 |
| 动态流 | 分配/释放/更新发 `device_updated` Status 事件 |

> 历史静态数据见 `content/devices.ts`（Unit 001 "The Originator" 等带剧情的样例），现已迁移到 DB。

## 6. 当前状态与缺口

- ✅ 已知/未知设备、状态、操作者、认领卡、分配=升级、图片、评论、动态流均已上线。
- 🟡 `exploration_progress` 仅展示，无"推进未知设备探索"的玩法。
- ⬜ Device Seeker 标签玩法未实现（锁定占位）。

## 7. 未来钩子

- Device Seeker：让航行者通过线索/解谜推进未知设备的 `exploration_progress`，进度满 → 设备"确立"。
- 设备与航行者的"持有/流转"叙事（参考 Unit 001 被德国 Voyager 持有 20 年的设定）。
