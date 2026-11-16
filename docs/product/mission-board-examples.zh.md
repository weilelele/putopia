# Mission Board 委托类型与样例

## 发布人与任务类型

先为每一类固定一位主要署名。看板只显示头像、姓名、档案号和一句线索。档案号按类型分别递增。完整简报交代操作与需要记录的结果，公开预览留下一条具体的判断线索。

| 前缀 | 发布人 | 这类任务的特征 | 希望收到的结果 |
| --- | --- | --- | --- |
| REC · 恢复信号 | Maren Solberg | 已有记录的世界失联。给出大致 Frequency 和一两个能认出旧世界的特征。Maren 先定义什么能算同一个世界。 | 实际 Frequency、匹配与不匹配的特征，以及是否能重复观测。 |
| CNT · 接触 | Ryo Tanaka | 可能存在有意沟通的生物。先观察它们如何行动，再尝试一次能停止的小范围接触。 | 接触前后的变化，包括没有观察到回应。 |
| OBS · 异常观测 | Valentina Cruz | 已发现一个潜在信号，世界的内容仍待确认。给出大致 Frequency 和一条初步线索，邀请玩家辨认那是什么样的地方、里面有什么、正在发生什么。 | 一段初步的世界描述，附可辨细节、Frequency、Band 和仍不确定的地方。 |

## 测试分支中的三期任务

每条 Feed 对应同一编号，由看板署名人发布。正文只补充一条判断、顾虑或行动线索。正式发布时使用任务链接指向当周 Dashboard，例如 `/console?mission=REC-118#mission-board`。当前分支只提供看板和可评审的配对文案。

| 档案号 | 看板钩子 | 同一发布人的 Feed 草稿 |
| --- | --- | --- |
| REC-118 | 110.0 went dark. Two lights faced inland. | If you find a harbor near 110.0, check which way the lights point. The harbor alone won’t tell us whether we’ve found the same world. |
| CNT-074 | A ridge stood up. The lights stayed on. | If someone lives up there, I’d like to see how they signal to each other before we try to say hello. We can take our time with that. |
| OBS-203 | A street-shaped blur surfaced near 88.2. | If you get a clearer view at 88.2, tell us what’s around the bend. A few buildings or a stretch of open land would help us make sense of the place. |
| REC-120 | The station at 97.3 dropped out. | One clear clock face won’t settle this. We need to see all three, then check whether the middle hand moves between observations. |
| CNT-076 | Someone leaves a light burning across the bridge. | I’d watch the near bank for a while. If there’s already a conversation going on, let’s give it room to finish. |
| OBS-205 | Unconfirmed signal near 93.6. Rows of desks, maybe. | If the window clears, have a look at the rest of the building. A desk could be anywhere. The rooms around it might tell us what this place is for. |
| OBS-206 | A faint signal near 89.8 shows a line at a hatch. | If you can see where the line comes from or what passes through the hatch, we’ll have a better idea what people might be doing there. |
| REC-122 | The stairwell at 121.4 no longer resolves. | The gap at the end of the rail is the identifying feature. If you find stairs with the rail running all the way up, record that separately. |
| CNT-078 | An island raises a flag each time a boat leaves. | Before we send anything, I’d wait for a crossing when the flag stays down. That may tell us something about who it’s meant for. |
| OBS-207 | A weak signal near 109.3 shows shapes adrift. | If the water comes into focus, look at the edges. A curb would tell us something different from a riverbank. |

## 测试口径

测试分支按北京时间周一零点选取一批 3–4 条任务。测试内容使用以上三组场景，后续轮次更换 Frequency 并补充下一步观测目标。三个公开署名使用现有 NPC 头像。公开预览不下发完整操作说明。完整简报与接取复用设备资格检查，接取记录由 `schema_v121.sql` 保存。

草稿来源是本次任务设定与设备操作说明。它们属于原创委托，没有触发它们的 Intel 或 Feed 帖子。配对 Feed 都使用纯文字，角色的补充判断已经可以用一两句说清。参考材料校验记录如下。

| 路径 | SHA256 |
| --- | --- |
| `docs/game-design/00-overview/zh.md` | `cd54551c7f123fac2fdc395d3d54454488e7080bb450e8f8e895092b81afc717` |
| `docs/game-design/08-multiverse-console/zh.md` | `7b7f9808b5d396157cf2501e2d434627df8db41938f3130d14c369db417055e9` |
| `docs/device-reference/console-operations.zh.md` | `c8bb3fbd8211f3fb34375869173c53bc0dc7044189bdb11225df34481cc4a458` |
| `docs/product/npc-creation-rules.zh.md` | `951517afe7441a345fc1bc9960c44daad1073297ac7528fc189d0a1dd8ce175a` |
| `docs/product/npc-personalities-intel-review.zh.md` | `59027609a35f0ce017c15c6e255e4247aa83898f8839cf481e1202a0e0866703` |
| `docs/product/npc-intel-runbook.zh.md` | `dde9690f49949baaac3b6613800c0c4711f4c9c6495ddcd0b690398e80bf1eb5` |
