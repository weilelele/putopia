# Device / Worlds Pro 上线检查

检查日期：2026-09-02。此文件记录部署前状态，**不表示已完成上线**。

## 已确认范围

- 用户已授权正式部署。
- `putopia` 所属 `weileleles-projects` 团队已为 Pro（Vercel 连接器实时返回）。
- 保留 `/api/cron/dreamcatcher-queue` 每分钟任务和原有每日任务。
- Device 内容继续人工发布；不恢复 Story Lab 自动排期发布。
- 顶部 OBS 直播播放暂缓，使用无媒体请求的占位区；保留投票候选视频、Info 历史素材。

## 已完成的只读核对

- Git `origin/main`：`992955cbe958efbd06f1f8a2e99ee4c3d71c1703`。
- Vercel 当前 Production READY：`dpl_DCoXmcQP1wnD4ruL89zW4nCBJjyT`，仍为旧版 `7970f2b`，不是新的待发布版本。
- 生产环境变量名已配置：Supabase URL/Anon Key/Service Role、Stripe Secret/Publishable/Webhook、CRON_SECRET、Cosmo、邮件与 AI 所需配置。仅变量存在性检查不等于密钥有效性或 Stripe 回调验收通过。
- `DEVICE_SHIPPING_COUNTRIES` 未配置，Device Checkout 沿用代码默认 `US`；本次没有擅自扩大配送范围。
- MC Home 数据库 `oxwfnmcwovxnrvagxzdz` 已有 Device 批次、库存、订单、Pack、Webhook 幂等、邮件日志以及 Dreamcatcher 队列表和相关函数。
- 检查时有 4 个已发布批次，4 台公开 Dreamcatcher（3 台 idle、1 台 paused），队列表为空。
- 4 个批次目前均为 `survey`，可售库存均为 0；新版上线不等于开放收费预订。本次不修改运营状态、库存或价格，开放预订需管理员核准配置后手动发布。
- Story Lab 缺失的 `schema_v63.sql` 已于 2026-09-02 应用至生产，迁移记录 `20260902214826_device_story_lab_review_and_publication`。3 张表均启用 RLS；内部草稿表及内容替换函数仅服务端可访问，已通过只读权限查询验证。未插入或发布真实内容。
- 不应重新执行 `schema_v68.sql`：生产已有相应 Device 前置结构和后续更新，重复执行可能覆盖后续细化。

## 发布前仍需完成

1. 用户已确认将旧版 Device 清理纳入同一次发布，清理任务已完成并停止修改共享工作区。范围和交接见 [旧版退役记录](device-legacy-retirement.md)。
2. Story Lab v63 迁移及权限验证已完成；不重跑其它已应用迁移。
3. 合并版本的设计检查、TypeScript、Lint、Vitest 和生产构建已通过（28 个测试文件、150 项测试，Lint 0 错误/25 条已有警告）；提交前再次确认暂存版本和最终检查一致。
4. 分支提交、PR、Preview 验证，之后 squash merge 到 main，等待新的 Production READY 并核实正式域名、后台入口和队列调度。
5. 不以真实扣款、人工调用队列推进或发布邮件作为冒烟测试；任何未完成的支付或管理员操作验收应明确记录。

## 安全检查记录

- Worlds 队列接口改为在 CRON_SECRET 缺失或为空时拒绝请求，防止共享生产数据的 Preview 被匿名触发；生产有效 Bearer 密钥的行为不变。新增纯逻辑测试覆盖缺失、空白、错误和正确密钥。
- Supabase 安全扫描中的 Story Lab `RLS Enabled No Policy` 是预期的服务端专用表策略，已确认 anon/authenticated 无表访问权限。
- 扫描还发现本次迁移之外的原有告警：`quiz_questions`、`outreach_log`、`outreach_replies` 未启用 RLS，一些已有 SECURITY DEFINER 函数可公开执行，以及密码泄漏检查未启用。未在此次发布中擅自修改这些独立权限；应另行审计其调用方和数据访问范围。[RLS 告警说明](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)、[公开函数告警说明](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)。

目前生产数据库前置迁移已完成，代码提交、PR、正式部署仍待执行。
