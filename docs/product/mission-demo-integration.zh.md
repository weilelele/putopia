# 世界互动联动Demo开发约定

日期：2026-10-16。规则来源：[Mission世界通信与被动事件规则](mission-gameplay-spec.zh.md)。两个独立开发任务在同一工作目录交付可联动原型。只使用浏览器本地数据，不调用数据库、Cosmo、支付或正式发布接口。

## 路由与归属

- 任务A：`/dev/mission-simulator`，实现观测仪、共享纯规则引擎与浏览器状态层。拥有 `src/lib/mission-demo/`、`src/app/dev/mission-simulator/`、`docs/product/mission-simulator-demo.zh.md`。
- 任务B：`/dev/mission-observe`，以现有Worlds Observe列表和详情为结构依据，实现被动报道体验。拥有 `src/app/dev/mission-observe/`、`docs/product/mission-observe-demo.zh.md`。不要编辑A目录或正式Worlds生产组件。
- 两边不修改共享layout、package.json、middleware/proxy、数据库。避免依赖正式页面的认证和数据获取。阅读Next本地文档及设计系统，移动端优先，英文界面。
- 模拟器与Observe互相链接，可在同一源不同标签页同时打开。Demo必须可供未登录者本地体验，不提交真实个人资料。

## 共享接口

任务A尽早创建 `src/lib/mission-demo/index.ts` 和 `src/lib/mission-demo/store.ts`，供B只读导入；API如下。内部模型可扩展，但这些字段保持稳定。

`index.ts` 导出类型与 `worldDefinitions` 数组。每个世界定义至少包含：`id, name, description, image, bands, rules`。Band至少有`id, name, image, unlockDownlink, initialClarity, maxClarity, clarityMultiplier`；规则内部字段由A明确类型。

`store.ts`为客户端模块，导出 `useMissionDemo()`，返回 `{ state, dispatch, ready }`。`state`至少包含：

- `revision: number`、`activeWorldId: string`、`activeDeviceId: string`。
- `worlds: Record<string, WorldState>`。WorldState至少含 `id, uplink, downlink, currentEventId, currentEventTitle, enabledEventIds: string[], reports: MissionReport[]`。uplink/downlink是当前集体实际值。
- `devices: Record<string, DeviceState>`。DeviceState至少含 `id, name, userName, energy, worlds: Record<string, { uplink: number; downlink: number }>`。
- Report至少含 `id, worldId, ruleId: number, deviceId, userName, title, body, createdAt: string, note: string`，允许可选Band与前后值字段；事件稳定ID在两页一致。

`dispatch`支持以下动作：

- `{ type: 'select-world', worldId: string }`
- `{ type: 'select-device', deviceId: string }`
- `{ type: 'send-energy', worldId: string, bandId: string, text?: string }`
- `{ type: 'add-note', worldId: string, reportId: string, note: string }`，仅当前活动设备为报道所属设备时生效；这是Demo身份模拟，不声称生产权限。
- `{ type: 'reset' }`

A可增加测试工具动作与选择器，但及时在本文件注明。B不得直接localStorage写自造世界或报道，也不得另建第二套事件模型。字段准备前B可先做展示组件，最终必须接入上述真实store，不保留随机假报道。

## 同步与一致性

使用版本化localStorage快照，键名 `putopia:mission-demo:v1`；同页订阅及跨标签页storage/BroadcastChannel更新。禁止在SSR读取window/localStorage。单次操作在同一状态更新内完成规则结算、一次性状态和报道；真实值与表现峰值分离。设计明确的单写入者或协调方式，处理两个标签页操作避免丢失更新／重复首次报道。模拟身份可切换设备以验证集体与个人差异。

## 必测场景

1. 新设备从初始值而非当前集体值开始；上下行追赶独立。
2. 规则冲突只命中最小编号；使用互斥或更高优先级的具体规则避免基础规则遮蔽所有特殊规则。
3. 固定规则反复改变数值，但仅首次报道；个例只生效一次。
4. 集体下降实际压低所有设备个人值，恢复不返还；Band下降后不可接入且接入区无痕迹。
5. 表现膨胀不参与解锁；音频内容清晰度影响解析并有失真回放或明确的模拟替代。
6. 一次模拟器发射产生的报道，在Observe第二标签页实时出现，ID、用户、Unit、时间及世界一致；刷新后保留。
7. Observe没有Report Observation／Report Anomaly入口，不能手动造报道；本人可备注，其他模拟身份不能改备注。
8. 390×844与桌面可用。至少执行design:check、TypeScript、lint、纯Vitest测试；父任务统一最终build，子任务不要并发build或启动多个同checkout Next实例。

尚未确认的恢复间隔、时序及具体世界数值应作为可见的模拟配置与假设记录，不能伪装为定稿。不要为Demo生成大量新图片，优先使用现有世界素材；真实角色动作缺素材时明确表示事件模拟。
