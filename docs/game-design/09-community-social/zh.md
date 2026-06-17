# 09 · 社区与社交（Community & Social）

## 1. 定位

社区社交层是把上述所有内容模块"粘合"成活社区的横切系统：**评论讨论**让内容可对话，
**Status 动态流**让组织显得"活着、有人在做事"，**成员名册**给航行者身份以可见性。
它不是独立页面，而是贯穿 intel / devices / worlds 等处的能力。

## 2. 评论系统（多态线程）

一张 `comments` 表支撑三类主体的讨论：`subject_type ∈ {device, intel, world}`。

- **谁能评论**：登录用户；评论可附最多 3 张图（`image_paths`，走上传）。
- **回复线程**：`parent_id` 支持嵌套回复；被回复者收**邮件通知**（Resend，`src/lib/email.ts`，
  收件取 `voyager_profiles.email`；回复自己不发信）。
- **Architect 身份代发（impersonation）**：Architect 发评论时可选"POST AS"另一个 voyager/architect 身份
  （如运营人 Ryo）——`author_*` 存目标身份，`posted_by_id` 隐藏记录真实操作者（不进 client payload）。
  用于运营撑起社区氛围。
- 关键文件：`comments.ts`、`comment-thread.tsx`（内含可复用 Composer）。

## 3. Status 动态流（活动事件）

`activity_events` 记录全站重要动作，渲染成首页的 **Status Feed**（航行者/申请人首页可见）。

| 事件类型 | 触发 |
|---|---|
| `world_added` | 上报世界 / 新建世界 |
| `voyager_activated` | 升级为航行者（首次，文案含 "World Builder"） |
| `member_joined` | application 审核通过 |
| `vote_opened` / `vote_cast` | 开/投票（**当前临时隐藏**） |
| `intel_published` / `intel_updated` | 情报发布/更新 |
| `device_updated` | 设备分配/释放/更新 |

> 支持 `group_key` 折叠同类事件（如把多次 voyager 激活归一）。`getActivityFeed(days)` 拉近 N 天。

## 4. 摘要流（Dashboard Feed）

`dashboard_feed` 是一个**自动生成的"组织播报"摘要**（`generateAndSaveFeed`）：从 intel / 已知设备 /
新成员里按模板生成最多 8 条短播报，按类型配额（intel/device/voyager）穿插，做成"电传打字机"式的滚动条。
偏运营/氛围用途，与 Status Feed 并存。

## 5. 成员名册 `/voyagers`

公开展示航行者/建筑师名册（头像、昵称、会员号、批次、社交链接）。是付费礼包"Batch Seat"权益的兑现——
"你的名字出现在名册里"。

## 6. 数据与权限要点

| 表 | 说明 |
|---|---|
| `comments` | subject_type/id、author_*、posted_by_id（审计）、parent_id、image_paths、is_visible |
| `activity_events` | event_type、actor_*、target_*、group_key |
| `dashboard_feed` | 自动生成的 lines（含实体头像引用） |

## 7. 当前状态与缺口

- ✅ 多态评论、图片、回复线程+邮件通知、身份代发、Status 流、摘要流、成员名册均已上线。
- 🟡 投票类 Status 事件当前隐藏。
- ⬜ 缺少点赞/表情/通知中心等更轻量的互动；评论无跨页面的"我的所有讨论"聚合。

## 8. 未来钩子

- 站内通知中心（统一回复、召回、世界晋升、礼包物流等提醒）。
- 评论/日志的点赞与精选，形成轻量声望系统（接积分钩子）。
