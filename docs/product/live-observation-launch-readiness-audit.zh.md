# Device / Worlds 伪直播观察室上线前审计

> 审计日期：2026-08-12  
> 审计范围：`/devices/live`、`/worlds/live` 的 390 × 844 竖屏流程，以及 `codex/device-batch-backend-live` 已完成的 Device Batch 产品与后台能力。  
> 结论性质：产品、体验、数据闭环与运营上线准备度审计；不代表完整的安全或 WCAG 合规认证。

## 一、总体结论

### 2026-08-12 P0 实施进展

- `/devices` 与 `/devices/batches/[slug]` 已切换为 Device Library 观察室形态，并读取真实 Batch、库存、三段 Pack、Info 素材、Updates、Discussion 和用户 Unit/Pack 进度；已有 Claim 与 My Consoles 路径继续保留。
- 持有者在当前 Batch 看到 `CHECK MY PROGRESS`，公共 Info 仍只显示整批进度，个人进度在独立弹层中查看。
- 新增 `schema_v67.sql`：Dreamcatcher、有限队列、单设备单任务、8–10 分钟固定轮次、任务与原始设备绑定、Signal Thread 关联及投票结束后回原设备的状态推进。
- Worlds Live 已读取真实 Dreamcatcher 队列与 Signal Dispatch，并用既有 `submitSignalResponse` 记录社区选择；旧 `/worlds/submit` 入口已回到 Dreamcatcher 选择。
- 界面不再显示前方任务数量或精确倒计时，只显示设备状态与轮次时长预估。
- 数据库迁移尚未应用到任何共享或生产环境；上线前仍需完成迁移部署、真实数据配置与端到端验证。

两个观察室的视觉方向已经成立，但它们目前仍然是**与真实产品平行存在的交互原型**，距离上线最大的缺口不是继续打磨画面，而是把它们接到已经存在的真实系统上。

- Device 的底层产品能力已经相当完整：Batch 持久化、草稿/发布/版本、库存、Stripe 付款、实体 Unit 绑定、Pack 履约、订单后台、关注与邮件、持有者讨论、批次投票、My Consoles、故事审核与内容排期都已有基础。
- Device Live Room 当前没有使用这些能力。Batch、价格、库存、Shipment、Updates、Discussion、媒体和 Claim 都是页面内静态数据；Claim 按钮也没有进入真实购买流程。
- Worlds 已经存在一条真实链路：提交 World → 6–8 小时 Signal Scanning → Signal Tuning / Dispatch → 用户选择 → 多日搜索 → Archive。Live Room 当前又定义了一条“Dreamcatcher 8–10 分钟处理、50 人排队、选择后重新入队”的新链路，但没有后台状态机。
- 因此，上线前最重要的产品决策是：**Dreamcatcher 是现有 Worlds / Signal Dispatch 的新入口和叙事外壳，还是一套新的独立玩法。** 推荐前者。否则团队会长期维护两套含义相近但时间、状态和数据完全不同的世界生成系统。

## 二、之前 Device Batch 分支已经完成的能力

### 2.1 Batch 内容与发布后台

- 四个正式生命周期：`survey / claim_open / distribution / active`；
- 可配置 Batch 身份、状态、价格、库存、负责人、现场事实、Hero 媒体、最新更新、发放阶段和历史阶段；
- 草稿与公开内容分离；
- 乐观锁 revision，防止多人后台互相覆盖；
- 发布版本记录；
- 创建新 Batch 与 Story Lab；
- 完整故事先行、两道人工 Review Gate、内容排期、上游故事变化后自动 Needs Re-review。

### 2.2 申领、库存与付款

- 服务端校验 Batch 是否开放、价格是否有效、库存是否充足；
- Stripe Checkout；
- 登录与 Applicant/Voyager 权限校验；
- 35 分钟库存预留；
- 重复点击复用已有 Checkout Session；
- 防止同一用户重复申领同一 Batch；
- Webhook 幂等处理、支付复核和订单状态审计；
- 在创建订单时绑定一台具体物理 Unit，而不是只扣减一个抽象库存数字；
- Stripe 成功页只在服务端确认订单后显示已获得资格。

### 2.3 实体 Unit、Pack 与履约

- `device_batch_units` 物理设备池；
- Unit 的 reserved / assigned / preparing / shipped / delivered 等状态与事件记录；
- 每张订单自动初始化对应的多阶段 Pack；
- Pack 与 Unit、订单关联；
- 管理后台更新履约状态、承运商和物流；
- My Consoles 展示用户真实 Unit 和各阶段发放记录；
- 订单状态与阶段变化邮件。

### 2.4 关注、社区与回访

- 用户可关注任意 Batch；
- 重大更新发送给关注者；
- 发放阶段更新发送给持有者；
- 持有者/Architect 权限控制的 Batch Discussion；
- 评论可包含图片，并已有回复数据基础；
- 持有者专属 Batch Decision，可投票、修改选择、关闭投票；
- 公开持有者目录使用匿名 Unit 身份，不泄露订单和地址。

这意味着 Device Live Room 不应该重新实现一套独立数据。它应成为上述系统的“现场视图”。

## 三、离上线必须补齐的 P0

### P0-1：把 Live Room 变成真实 Batch / World 的路由，而不是单独演示页

- Device 应由真实 slug 驱动，例如批次详情页直接采用观察室结构，或使用 `/devices/batches/[slug]/live`；
- Worlds 应由真实 Dreamcatcher/World/Signal Thread 标识驱动；
- Archive、Batch 详情、World 详情、My Consoles 和通知都必须能进入对应观察室；
- 切换 tab 需要改变 URL 或可恢复状态，刷新和分享链接不能丢失当前对象。

当前主站没有任何入口链接到 `/devices/live` 或 `/worlds/live`。

### P0-2：统一 Worlds 的唯一状态模型

当前有两套互相冲突的时间模型：

- 现有产品：首次扫描 6–8 小时，日间搜索 8–20 小时；
- 新观察室：一轮 8–10 分钟，最多 50 个等待任务。

建议把 Dreamcatcher 定义为现有 Worlds Pipeline 的观察节点：

1. 用户在某台 Dreamcatcher 提交一个 World sighting；
2. Dreamcatcher 房间承载真实的 `scan_until`；
3. 搜索完成后进入现有 Signal Dispatch；
4. 用户选择调用现有 `submitSignalResponse`；
5. 选择后的下一轮使用现有 Signal Thread 日程；
6. 最终结果进入现有 World Records / Archive。

如果一定要保留 50 人排队，需要新增持久化的 Dreamcatcher、Queue Job、Round、Assignment、Capacity Reservation 和 Event 表，并解决并发抢第 50 个位置的问题。不能只在客户端加一个数字。

### P0-3：接入真实交互

Device：

- Claim 调用现有 `/api/device-checkout`；
- 价格、总量、剩余量和 Pack 从 `DeviceBatch` 与真实库存读取；
- Discussion 复用现有 holder-only actions；
- Updates、投票、关注、Unit 和个人 Pack 状态复用现有后台；
- Info 媒体来自 Batch 内容，而不是三张相同占位图。

Worlds：

- Submit 复用或适配现有 `submitWorld`；
- Dispatch 读取真实 `getInvestigationFeed` / `getWorldInvestigation`；
- Confirm 调用真实 `submitSignalResponse`，处理登录、无权限、已投、已截止和网络失败；
- Queue、个人位置、状态、Archive 和通知从服务端读取；
- Chat 必须真正发送，或在第一版明确只读，不能保留无效发送按钮。

### P0-4：建立可信的“伪直播”内容协议

当前固定图片、固定观看人数、固定消息和 `LIVE` 标签会在上线后迅速损害信任。至少需要：

- `live / recent frame / prerecorded / offline / intelligence only` 五种明确状态；
- 镜头最后更新时间、来源和预计恢复时间；
- 观看人数使用真实 Presence，或改成诚实的“今日观看/最近关注”；
- NPC、Update、镜头变化和后台 Batch/World 状态指向同一个事件 ID；
- 历史素材只在 Info，不伪装成直播；
- 内容后台能发布房间事件，并决定是否同步到通知、Updates、Chat 和 Archive。

### P0-5：上线基础设施与端到端验证

- 确认 `schema_v57` 至 `schema_v66` 已按顺序应用到目标环境；
- Stripe 测试/生产密钥、Webhook Secret、回调域名与 Shipping Countries 分环境配置；
- 独立 Preview 数据环境，避免预览直接写生产订单和社区内容；
- 库存并发、Checkout 过期、Webhook 重放、退款、支付复核和超卖 E2E；
- Discussion 图片上传的类型、大小、权限、审核与删除；
- Dream/World 提交的反滥用、频率限制、内容审核与失败恢复；
- 监控任务调度、邮件失败、媒体失败和队列卡死。

## 四、当前设计中不够好的地方

### 4.1 Device：购买区过高，压住了真正默认的 Info

在 390 × 844 中，直播后面的 Claim 区把三次寄送完整铺开，且默认展开 Pack Two。用户在首屏看不到默认 Info；实际体验变成“直播 + 一整张购买说明”，观察室退化成商品页。

建议：

- Claim 区只保留价格、32 total、18 remain、当前阶段和唯一 CTA；
- 三次寄送做成一行紧凑摘要；
- 详细内容仍在 Info；
- 默认不展开 Pack，或只在用户主动点击后展开；
- 已购买用户把整个 Claim 区替换为“我的下一件事/下一包裹”。

### 4.2 Device：公共 Batch 进度与个人履约仍然混在一起

当前四格进度和三次寄送看起来像同一条进度，但之前的 Device 目标明确要求：

- Batch 公共行动进度回答“这批设备整体到哪”；
- 我的 Pack/物流回答“我的东西到哪”。

未购买者、持有者和已收货用户应该看到不同的中间区域。现在的原型只有未购买者视角。

### 4.3 Device：`DISCUSSION` 比 `LIVE CHAT` 更诚实，但现场感不足

如果消息不是实时 Presence 和实时发送，`DISCUSSION` 是更可信的名字；如果要强化共同观看，推荐 `ROOM CHAT`。不建议继续使用纯 `LIVE CHAT`，除非真的具备在线状态、消息推送和实时事件。

同时需要：

- 官方事件与普通留言有明显不同的卡片；
- Update 可以打开关联媒体或定位现场时间；
- 持有者身份、Field Lead 和系统身份可辨认；
- 未登录或非持有者清楚看到为什么不能发送。

### 4.4 Device：All Batches 筛选在手机上被截断

筛选行实际宽 523 px、可视宽 386 px；`DISTRIBUTING` 被截断，`ACTIVE` 不在首屏，也没有明显的横向滚动提示。

建议改成两行可换行 chips，或“状态”下拉 + Following 开关。状态数量固定，不需要强迫用户横向猜测。

### 4.5 Device：所有 Batch 目前共享同一画面和同一交易结构

切换 Cairo / Kyoto / Gobi 只改文字，不改现场图、镜头阶段、价格、库存、Pack、Info 和 Updates。它破坏了“每个 Batch 是独立行动”的核心目标。

必须让 `survey` 呈现无镜头或远距证据，`claim_open` 呈现明确购买事实，`distribution` 呈现包装/测试现场，`active` 呈现持有者现场与运行记录。

### 4.6 Worlds：Queue 数字与队列内容不可信

页面显示 42/50，但只展示 4 条；没有说明这是“只展示附近位置/精选记录”，也没有“我在第几位”。提交后只显示 `JOINED QUEUE`，刷新即消失。

建议默认只展示：当前处理中、我的任务、我前面 1–2 个、我后面 1 个，并明确 `42 TOTAL`。完整队列放在抽屉，不需要把 42 条全部铺开。

### 4.7 Worlds：Signal Dispatch 还不是“我的待选择任务”

目前三条线上任务对所有用户固定展示，Response 数是静态值，确认只写本地状态。真实产品需要区分：

- `AWAITING YOU`：我能投且尚未选择；
- `CHOICE RECORDED`：我已选择；
- `CLOSED / RESULT`：已结束，可看分布和最终信号；
- `NOT ELIGIBLE`：可以观看但不能选择。

默认排序应优先显示 `AWAITING YOU`，而不是按示例数组顺序。

### 4.8 Worlds：选择之后没有真正回到第二轮

设计目标的核心循环是“搜索 → 选择 → 重新入队 → 第二轮”。当前点击 Confirm 后只把列表改成 `CHOICE RECORDED`，没有显示：

- 选择了哪段；
- 下一轮何时开始；
- 是否已重新进入队列；
- 新队列位置；
- 选择如何进入 Archive。

这使最重要的长期循环在确认按钮之后中断。

### 4.9 Worlds：不同 Dreamcatcher 还不是真正独立的房间

切换 Dreamcatcher 会清空本地提交，且没有保留草稿；画面也始终是京都图片。它与文档中“每台机器拥有独立地点、队列、聊天、结果和昼夜”的目标不一致。

### 4.10 两个模块都缺少“自你离开后”

这其实是“明天还想再来”的核心，而当前页面没有实现：

- 上次访问时间；
- 未读官方更新；
- 队列前进了多少；
- 新 Signal 等待选择；
- 新 Pack/物流节点；
- 错过的镜头关键帧。

建议它成为每个房间进入后的第一条短摘要，而不是继续增加常驻模块。

## 五、建议的最终产品结构

### Device

一个真实 `DeviceBatch` 只保留一份数据和一条主路由。观察室是当前状态的首页，Info/Updates/Room Chat 是同一 Batch 的不同投影；Archive、购买、My Consoles、投票和履约全部复用已有后端。

角色化首屏：

- 访客：现场 + 可信状态 + Follow；
- 可申领用户：现场 + 简洁 Claim；
- 持有者：现场 + 我的下一件事/下一包裹；
- 已交付持有者：现场 + Unit 运行状态/发布记录。

### Worlds

Dreamcatcher 不另造一套世界数据库，而是成为现有 World Pipeline 的地点化入口：

- Queue 对应 proposed/scanning/searching 的可观察任务；
- Dispatch 对应真实 Signal Tasks；
- 用户选择写入真实 Signal Responses；
- Archive 对应 World Records 与 Archive Reel；
- “轮次”对应 Signal Thread day；
- Dreamcatcher 只负责容量、分配、现场表现和事件叙事。

## 六、推荐上线顺序

### Gate 1：先完成真实只读观察室

- 接真实 Batch/World/Signal 数据；
- 真实对象切换、真实状态、真实媒体和时间；
- Archive/详情页能进入观察室；
- 移除所有会被误认为真实的假人数、假 Live 和假更新。

### Gate 2：开放低风险写操作

- Follow；
- Worlds 真实 Dispatch 选择；
- 持有者 Discussion；
- 已有 Claim/Stripe 链路；
- 完整错误、权限和截止状态。

### Gate 3：开放新 Dreamcatcher Queue

- 先决定它是否完全映射现有 World Pipeline；
- 再建设队列容量、任务状态机、调度、通知和管理员处理台；
- 完成并发、失败、重试和内容审核后再开放提交。

### Gate 4：增加召回与内容自动化

- 自上次离开后；
- 未读与通知；
- 事件驱动的镜头/Update/Chat/Archive 同步；
- Story Workflow 已批准内容自动进入发布计划；
- 关键事件回放与多机位属于后续增强。

## 七、审计步骤与健康度

1. **Worlds 队列入口** — 视觉健康，产品闭环未接入。  
   证据：`audit-01-worlds-queue.png`。
2. **Worlds Signal Dispatch 列表** — 信息结构健康，身份/截止/排序和真实数据接入缺失。  
   证据：`audit-02-worlds-dispatch.png`。
3. **Worlds 四视频选择** — 选择 affordance 清楚，提交、失败恢复和下一轮缺失。  
   证据：`audit-03-worlds-choice.png`。
4. **Device 默认 Info 入口** — 直播与 Claim 清楚，但 Claim 过高导致 Info 首屏不可见。  
   证据：`audit-04-device-info.png`。
5. **Device Updates** — 可读，但尚未关联媒体、状态事件和未读。  
   证据：`audit-05-device-updates.png`。
6. **Device Discussion** — 角色层级初步成立，真实权限与实时发送尚未接入。  
   证据：`audit-06-device-discussion.png`、`audit-07-device-composer.png`。
7. **Device All Batches** — Batch 状态逻辑正确，筛选行在竖屏被截断。  
   证据：`audit-08-device-batches.png`。

## 八、可访问性与验证边界

- 截图与 DOM 证明主要控件已有语义标签，页面没有 390 px 水平溢出，控制台无错误；
- 尚需真实键盘完成 tab、弹窗焦点锁定、Escape 关闭与关闭后的焦点恢复；
- 视频需要字幕/文字摘要、暂停能力、失败 fallback 和 `prefers-reduced-motion`；
- 实时状态变化需要 `aria-live`，不能只用颜色；
- All Batches 的横向筛选可发现性不足；
- 小号弱化文字的对比度需要实测；
- 本审计没有进行真实 Stripe 扣款、生产数据写入、通知发送或多人并发测试。
