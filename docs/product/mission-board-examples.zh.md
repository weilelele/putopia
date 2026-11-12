# Mission Board 委托类型与样例

## 发布人与任务类型

先为每一类固定一位主要署名。看板只显示头像、姓名、档案号和一句线索。档案号按类型分别递增。完整简报交代操作与需要记录的结果，公开预览留下一条具体的判断线索。

| 前缀 | 发布人 | 这类任务的特征 | 希望收到的结果 |
| --- | --- | --- | --- |
| REC · 恢复信号 | Maren Solberg | 已有记录的世界失联。给出大致 Frequency 和一两个能认出旧世界的特征。Maren 先定义什么能算同一个世界。 | 实际 Frequency、匹配与不匹配的特征，以及是否能重复观测。 |
| CNT · 接触 | Ryo Tanaka | 可能存在有意沟通的生物。先观察它们如何行动，再尝试一次能停止的小范围接触。 | 接触前后的变化，包括没有观察到回应。 |
| OBS · 异常观测 | Valentina Cruz | 有一条模糊、短暂或与我们世界可能有关的线索。让玩家知道最先报回哪个小细节。 | 首条可辨信息、Frequency、Band 和确定程度。 |
| CMP · 交叉核对 | Weile Yang（拟邀） | 已有两份可能相互矛盾的记录。给出共同参照物，让两份记录能放在一起比较。 | 每个 Band 的独立记录和一致的参照。 |
| CAL · 校验 | Gloria X（拟邀） | 一个异常可能来自观测条件。设计简单的重复比较，一次只换一个条件。 | 复现条件、出现与未出现的次数。 |

Weile Yang 和 Gloria X 的 Architect 身份已只读核对。CMP 和 CAL 是供本人决定是否署名的委托提案，以下 Feed 是中性草稿。两类当前只供审阅。

## 测试分支中的三期任务

每条 Feed 对应同一编号，由看板署名人发布。正文只补充一条判断、顾虑或行动线索。正式发布时使用任务链接指向当周 Dashboard，例如 `/console?mission=REC-118#mission-board`。当前分支只提供看板和可评审的配对文案。

| 档案号 | 看板钩子 | 同一发布人的 Feed 草稿 |
| --- | --- | --- |
| REC-118 | 110.0 went dark. Two lights faced inland. | If you find a harbor near 110.0, check which way the lights point. The harbor alone won’t tell us whether we’ve found the same world. |
| CNT-074 | A ridge stood up. The lights stayed on. | If someone lives up there, I’d like to see how they signal to each other before we try to say hello. We can take our time with that. |
| OBS-203 | A familiar street shows up near 88.2. | If you can make out even half a street name at 88.2, send it in. We can start checking our own maps before the rest comes into focus. |
| REC-120 | The station at 97.3 dropped out. | One clear clock face won’t settle this. We need to see all three, then check whether the middle hand moves between observations. |
| CNT-076 | Someone leaves a light burning across the bridge. | I’d watch the near bank for a while. If there’s already a conversation going on, let’s give it room to finish. |
| OBS-205 | A classroom looks busy from the empty street. | Pick one thing bolted down, like a radiator or a window latch. If you can see it in both views, that’s a place to start. |
| OBS-206 | One postmark looks like a mark from our archive. | A letter, a shape, even where the stamp sits on the envelope would help. Send the part you can actually make out. |
| REC-122 | The stairwell at 121.4 no longer resolves. | The gap at the end of the rail is the identifying feature. If you find stairs with the rail running all the way up, record that separately. |
| CNT-078 | An island raises a flag each time a boat leaves. | Before we send anything, I’d wait for a crossing when the flag stays down. That may tell us something about who it’s meant for. |
| OBS-207 | Numbered objects drift past in groups of three. | If you catch the same number twice, jot down what it was printed on both times. That will help us tell whether it’s one object coming back. |

## 真人 Architect 候选草稿

- **CMP-146 · Weile Yang（拟邀）**。看板 “Two views disagree on which way the water runs.” 简报预览 “At 96.1, two Bands look onto the same seawall. Use the marked gate as a common reference and note which way debris passes in each view.” Feed 草稿 “If you compare the seawall from two Bands, use the marked gate in both notes. That gives us something we can line up.”
- **CAL-092 · Gloria X（拟邀）**。看板 “The bell moves before anything touches it.” 简报预览 “At 100.7, the bell appears to move first. Use the shadow under it as a reference. Repeat the same observation before trying a different Band.” Feed 草稿 “If you watch the bell, try the same view twice before switching Bands. Note whether the order changes on the second pass.”

## 测试口径

测试分支按北京时间周一零点选取一批 3–4 条任务。测试内容使用以上三组场景，后续轮次更换 Frequency 并补充下一步观测目标。三个公开署名使用现有 NPC 头像。公开预览不下发完整操作说明。完整简报与接取复用设备资格检查，接取记录由 `schema_v116.sql` 保存。

草稿来源是本次任务设定与设备操作说明。它们属于原创委托，没有触发它们的 Intel 或 Feed 帖子。配对 Feed 都使用纯文字，角色的补充判断已经可以用一两句说清。参考材料校验记录如下。

| 路径 | SHA256 |
| --- | --- |
| `docs/game-design/00-overview/zh.md` | `cd54551c7f123fac2fdc395d3d54454488e7080bb450e8f8e895092b81afc717` |
| `docs/game-design/08-multiverse-console/zh.md` | `7b7f9808b5d396157cf2501e2d434627df8db41938f3130d14c369db417055e9` |
| `docs/device-reference/console-operations.zh.md` | `c8bb3fbd8211f3fb34375869173c53bc0dc7044189bdb11225df34481cc4a458` |
| `docs/product/npc-creation-rules.zh.md` | `951517afe7441a345fc1bc9960c44daad1073297ac7528fc189d0a1dd8ce175a` |
| `docs/product/npc-personalities-intel-review.zh.md` | `59027609a35f0ce017c15c6e255e4247aa83898f8839cf481e1202a0e0866703` |
| `docs/product/npc-intel-runbook.zh.md` | `ecc96387fb5e08cb64a541b13721b462ae0198603177bcf7b1f6c684eadc61e5` |
