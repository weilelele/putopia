# Device 人工发布过渡方案

## 范围

后续直播播放的分离决定见 [OBS 直播播放暂缓说明](obs-live-playback-deferred.md)。人工发布与 OBS 播放是两个独立范围，本方案不恢复前端片段轮播。

Device 的现场内容、批次进度、Pack 说明和素材由管理员手动维护和发布。
不改变付款、Stripe webhook、订单处理和现有邮件规则；本次没有执行数据库迁移或发布任何真实内容。

## 管理员操作

1. 进入 `/admin/device-batches`，选择目标 Batch。
2. 在 Overview、Packs、Latest Update 编辑介绍、进度、素材、最新现场报告。日期仅用于展示，不是定时发布设置。
3. `SAVE DRAFT` 保存后台草稿，不更新公开内容。
4. 核对所有更改后点击 `PUBLISH LIVE`，确认后更新公开的 Device 页面。此操作发布整个 Batch 当前配置，包括同时修改的价格、库存和 Pack 信息，并非只发布当前 tab。
5. 在用户页面检查结果。重大更新如需通知关注者，再单独确认并点击 `EMAIL FOLLOWERS`；不要用邮件按钮代替发布按钮。Pack 通知沿用现有独立入口。

Preview 和本地后台可能连接生产数据；发布确认框会明确提醒这一点。

## Story Lab 的角色

- 保留故事结构审核、逐条内容审核和 AI 内容草稿。
- 推荐发布时间只是运营计划，不触发自动操作。
- `OPEN BATCH EDITOR` 打开对应 Batch 的编辑入口；将审核好的内容整理到对应公开内容区域，再点击 `PUBLISH LIVE`。
- `RECORD AS PUBLISHED` 仅记录内容已经在目标渠道发布，并锁定该份文案。`story_publications` 目前没有被 Device 前端读取，因此不能把这个记录操作视为同步到用户页面。
- 发布记录必须对应当前已批准的故事版本；未保存的修改不能直接记录，后台也会检查内容版本是否变化。
- 原有 `scheduled` 记录和时间保留，界面显示 `AWAITING MANUAL RELEASE`；无需清空或批量改写已有数据。

## 自动化边界

- 从 `vercel.json` 移除 `/api/cron/story-publications`。
- 新增自动发布关闭策略：旧页面的排期操作会被服务器拒绝；即使旧调度继续调用接口，也不会扫描或发布内容。
- 保留每日 analytics、signal-recall、cosmo-sync 任务。
- **Worlds 的每分钟 `/api/cron/dreamcatcher-queue` 暂未移除。** 它负责设备排队和轮次推进，与 Device 内容发布不是同一件事。不能在继续接受梦境提交的同时直接取消调度，否则会产生停滞队列。
- 原 Hobby 套餐不支持本方案保留的每分钟任务。2026-09-02 用户升级后已确认项目所属团队为 Pro，因此保留 Worlds 队列调度，无需暂停新提交；这不表示 Device 自动内容发布恢复。见 [Pro 上线检查记录](device-pro-release-preflight.md)。

## 恢复自动发布

未来恢复时需一起调整发布策略、后台排期入口和可靠调度，并先人工复核遗留排期，避免旧内容集中发出。本次不做自动补发。

## 本次验证

- 人工发布阶段的 150 项纯逻辑测试通过，包含禁用排期、保留旧排期的人工发布资格、旧故事版本禁止发布。后续将旧播放器及其 10 项测试移至参考分支后，保留的 140 项测试全部通过。
- TypeScript、设计检查通过；Lint 无错误，保留 25 条既有警告；生产构建通过。
- 尝试 390×844 后台检查时，本地运行环境缺少 Supabase URL/Key，后台不能完成渲染，因此竖屏视觉和真实发布链路尚未验证。没有为此绕过登录、修改生产凭据或执行真实内容发布。
- 改动位于 `codex/device-manual-publication`，尚未合并或部署。
