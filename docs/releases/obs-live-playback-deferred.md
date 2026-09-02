# OBS 直播播放：独立范围，暂不提交上线

## 已确认的产品方向

- Worlds 和 Device 顶部应播放 Cosmo OBS 输出的连续直播流。
- 内容编排、设备状态对应场景、片段切换由 Cosmo OBS 侧实现；网站不再用逐条视频 URL 轮播模拟直播。
- OBS 如何推流、经什么服务分发、浏览器用什么协议播放，尚未确认。本次不引入播放器 SDK、不配置流地址、不修改 OBS，也不部署。
- 之前依据“短视频轮播＋浏览器缓存”的成本估算不能直接作为此方案预算，需要按 OBS 编码算力、推流路数、分发服务、总观看时长、码率、录像保存量和相关服务现有账单重新核算。

## 本次待提交范围

保留页面布局、Batch/设备切换、队列、投票、讨论、Info、Pack 进度、付款与人工发布流程。

四个入口 `/devices`、`/devices/live`、`/devices/batches/[slug]`、`/worlds/live`：

- 解除顶部播放器挂载，不再查询 Cosmo 直播片段列表。
- 暂用无媒体请求的共享占位区，明确显示 `LIVE FEED NOT CONNECTED`。
- 保留设备业务状态，以及 Worlds 的位置和本地时间；不把业务状态显示成“正在直播”。
- 不把历史图片冒充实时摄像头画面。

Signal Dispatch 的候选视频、Info 历史图片/视频、Worldflow/Cosmo 通用素材访问不属于顶部直播流，继续保留。

## 分离与恢复

旧播放器已经在 `992955c`（PR #128）进入 main，不可能通过忽略未提交文件将它排除。因此当前工作分支以普通移除改动分离这部分，不重写 main 历史。

原实现已完整保存在本地参考分支 `codex/obs-live-playback-deferred`，指向 `992955cbe958efbd06f1f8a2e99ee4c3d71c1703`。保留范围包括两个播放器、Dreamcatcher 播放状态机及测试、Cosmo 片段列表读取和诊断脚本。

这个分支是历史备份，不是可直接合并的 OBS 实现。未来只提取需要的参考代码，不要整分支回合以免重新启用旧轮播逻辑或覆盖其他业务改动。

## OBS 接入前需要确认

1. OBS 运行位置、实例数，以及每个 Batch/设备是否独立一路流。
2. 推流接收服务和浏览器播放协议（例如 HLS/低延迟 HLS/WebRTC）；不把 OBS 推流密钥交给浏览器。
3. 队列状态如何传到 OBS、谁负责确认场景已切换、允许多少播放延迟。
4. 断流/重连/离线时的界面，移动端自动播放及静音规则。
5. CDN 或流媒体分发、访问鉴权、录像保留、并发和费用上限。

## Vercel 当前只读核对

2026-09-02 升级后的复核：连接器 `list_teams` 已返回 `weileleles-projects` / `team_C7HnXHHtpo7z3unRfB534cO4` 的 **`plan: pro`**。Worlds 每分钟队列任务保留；Device 继续人工发布，OBS 播放仍暂缓。完整上线前检查见 [Pro 上线检查记录](device-pro-release-preflight.md)。

同日升级前的历史检查：连接器曾返回该团队的 `plan: hobby`。
项目查询确认 `putopia` 属于该团队，ID 为 `prj_CwNPyPb7bvKtwroiUpLzEOhbJqcG`。
本次没有执行套餐升级、扣费或项目迁移。

当时项目返回的 Production READY 部署来自 main 的 `7970f2b`，不是包含播放器的 `992955c`。本次没有改动线上部署。

## 验证

- TypeScript、设计检查、生产构建通过；Lint 无错误，25 条既有警告。
- 26 个测试文件、140 项测试通过；旧播放状态机的 10 项测试随实现保存在参考分支。
- 390×844 浏览器检查被本地 Supabase URL/Key 缺失阻断，尚未完成视觉验收。不为测试绕过登录，也没有用测试操作写入生产数据。
- 本次没有 git commit、push、合并 main 或部署。待提交版本仅在 `codex/device-manual-publication` 工作区中。
