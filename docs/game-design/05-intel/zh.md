# 05 · 情报（Intel）

## 1. 定位

Intel 是组织的**官方公告 / 世界观叙事载体**——由 Architect 发布的"情报文章"，用来推进剧情、
公布设备动向、组织通知。它既是访客的"门面内容"，又是分级权益（机密情报）的体现。
页面 **`/intel`（INTEL，列表）** 与 **`/intel/[id]`（详情）**。

## 2. 玩法 / 体验

- Architect 在后台撰写情报：标题、正文、配图、标签 `tag ∈ {NOTICE, DEVICE, ORG}`、是否机密 `classified`。
- 列表与首页"LATEST INTEL"展示卡片（发布者头像/名、日期、标签、评论数）。
- 详情页可读全文 + 评论讨论（复用 comments，subject_type='intel'）。
- **阅读追踪**：滚动到底触发 `markIntelRead()`，写 `voyager_profiles.task_intel_at`——
  历史上是申请人任务之一（现已不作为升级门槛，但仍记录）。

## 3. 分级可见性

| 类别 | 谁能看 |
|---|---|
| `classified=false`（公开） | 所有人（含访客） |
| `classified=true`（机密） | voyager / architect（RLS 强制） |

> 机密情报是付费/升级权益的一部分（"付费即与被授予设备的 voyager 同权，含机密 intel"）。

## 4. 数据与权限

| 项 | 说明 |
|---|---|
| `intel` 表 | id(text)、title、content、images、tag、classified、publisher_id/name、timestamp |
| 读 | 公开走缓存 `getPublicIntel`（60s，含发布者头像）；机密走 RLS 的 `getAllIntel` |
| 写 | Architect（service_role）CRUD；发布发 `intel_published`、更新发 `intel_updated` Status 事件 |

## 5. 当前状态与缺口

- ✅ 撰写、配图、标签、公开/机密分级、阅读追踪、评论、动态流均已上线。
- ⬜ 情报与世界/信号的交叉引用较弱（无"本篇情报关联世界 X"的结构化链接）。
- 🟡 也有 AI 生成新闻草稿的后台工具（`news-gen.ts` / `/admin/create-news`），辅助运营产出。

## 6. 未来钩子

- 情报作为世界生命周期的"剧情节点"：世界确立时自动生成一篇情报。
- 机密情报的解锁与积分/批次挂钩，做内容养成。
