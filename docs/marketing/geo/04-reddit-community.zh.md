# GEO 04 · Reddit 与社区参与方案

更新于 2026-11-20。状态：**草案，待创始人审核**。这份文档只是计划：没有注册账号、没有发帖，也没有联系任何版主或社区。

## 0 先读

- **目的**：ChatGPT、Perplexity、Gemini、Google AI Mode 回答"送科幻迷的礼物""novelty gadget""有实体道具的 ARG"这类问题时，经常引用 Reddit 讨论。我们要在这些讨论里**以真实身份、有用地出现**，让 AI 引擎引用的原帖里自然地包含 Multiverse Collective 的准确描述。
- **真实性是唯一策略**：Google 2026 年的指引把不真实的提及当作负面信号；Reddit 社区也会把软广告贴删掉、把账号举报。这里的每一条建议都假设：一个真人、一个账号、每次都公开身份。
- **调研缺口（必须先补）**：Reddit 拒绝了这次会话可用的全部抓取方式（reddit.com 直连 403；Anthropic 的抓取与搜索代理被 Reddit 屏蔽；Chrome 扩展也不允许打开 reddit.com）。用第三方镜像绕过的尝试被权限系统拦下，我没有继续绕。所以**表 3.1 中每个 subreddit 的人数和规则都标为"待核实"**。第 3.3 节给了一个 15 分钟的人工核实模板：创始人在自己浏览器里打开各社区的 Rules 和侧边栏，把结果填回表格后，第 6 节的节奏才能开始。
- 产品事实以代码为准：定义见 `src/lib/site-seo.ts` 的 `SITE_DESCRIPTION`，价格见 `src/lib/initiation-pricing.ts`，常见问题见 `src/app/voyager-initiation/faq.ts`，设备操作见 `docs/device-reference/console-operations.zh.md`。价格或发货计划变化时，先改第 2 节，再动草稿。

## 1 原则

1. **一个真人，一个账号，每次都说明身份。** 发言人是创始人本人（第 4 节）。
2. **先帮忙，后提产品。** 回答应当在删掉产品名后仍然有用。只有提问者的需求真的匹配时才提我们，并同时给出其他选项。
3. **只说能核实的事实。** 不夸大设备能力，不说"已经发货/用户好评"，不用剩余名额制造紧迫感。
4. **规则以社区为准。** 每个社区的规则高于这份文档；拿不准就先私信版主问。
5. **NPC 只在自己的平台上。** 站内的故事角色不离开 multiverseco.org，不在 Reddit、Discord 或任何论坛上发言、投票或私信。
6. **不改动正在运行的东西。** 这份计划不要求修改站内 NPC、Intel 或任何定时任务。

## 2 事实底稿（回答时只用这些）

| 话题 | 可以说的事实 | 来源 |
|---|---|---|
| 一句话定义 | Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. | `src/lib/site-seo.ts` |
| 设备操作 | 左旋钮调 Frequency 找世界；右旋钮在该世界的几个固定观测视角（Bands）间切换，其中 Remarks Band 是世界介绍；长按 Quantum Energy Button 至少 3 秒蓄能后，向当前世界和当前 Band 发射能量。部分世界允许随能量一起发送语音。 | `docs/device-reference/console-operations.zh.md` |
| 平行世界的性质 | 是我们创作和运营的**虚构世界**，世界会随着玩家的行动发展。对外不要暗示真的存在平行世界或"真实信号"。 | 叙事设定；`docs/game-design/00-overview/zh.md` |
| 购买选项 | Voyager Membership **$12**（数字会员，无实体包，不含 Console）；Initial Voyager Pack **$38**（会员 + Pack 1–2：欢迎信、徽章、Antenna，不含 Console）；Complete Voyager Pack **$488**（会员 + 全部 4 个包，含 Console）。 | `initiation-pricing.ts`、`site-seo.ts` |
| 升级 | $12 会员可补 $26 升 Initial，或补 $476 直升 Complete；已有 Initial 的人加 Console + Pack 4 为 $460。 | `faq.ts` |
| 付费方式 | 一次性付款，不是订阅。 | `faq.ts` |
| 会员内容 | Mission Briefings、Parallax Array 观测提交、Classified Intel、Member Votes。接受和执行任务需要绑定到账户的 Console。 | `faq.ts` |
| 配送 | 实体包只发美国本土 48 州和华盛顿特区，包邮含税。$12 会员不需要地址。 | `faq.ts` |
| 发货计划 | S26 批次：Pack 1 2026-10，Pack 2 2026-11，Pack 3（Console）2026-12，Pack 4 2027-01。这是**计划发货月份**，不是保证到货日期。 | `faq.ts` |
| 批次 | S26 是第一个批次，上限 100 个席位；$12 会员也占一个席位。 | `initiation-view.tsx`、`faq.ts` |
| 退款 | 未发货的包可按包退款，算法见 `/terms/initiation#refunds`。 | `faq.ts` |
| 站内角色 | 站内有一部分 Voyager 是官方故事角色；入会页 INITIATED 计数旁的说明写明计数"Includes purchased, gifted, and story-character places." | `initiation-view.tsx`、`docs/product/npc-creation-rules.zh.md` |

**不能说的**

- 不把 INITIATED 计数或"已售席位"当作销量或热度：它包含赠送席位和故事角色。
- 截至 2026-11-20，Console 还没有按计划发出（计划 12 月）。在真有玩家收到之前，不说"玩家反馈""开箱"，不引用任何"评价"。
- 不说 Console 的技术细节，除非创始人先在下面确认。

**发帖前需要创始人确认的事实**（Reddit 上一定会被问到）

1. Console 怎样获取画面：需要 Wi-Fi 或手机配对吗？断网能用吗？
2. 屏幕内容是预先制作的、按剧情实时更新的，还是两者都有？玩家发射能量后，反馈多久出现？
3. 尺寸、重量、供电方式（插电还是电池）。
4. Pack 4 装的是什么，可否公开。
5. 已拆封 Console 的退货政策。
6. 创始人发帖时用真名还是固定网名，以及个人简介怎么写（见第 4 节）。

## 3 社区调研

### 3.1 Reddit

人数和规则都**待核实**（原因见第 0 节）。"适配度"根据各社区公开的主题判断，核实规则后可能下调。

| 社区 | 主题 | 人数 | 自我推广规则 / Flair / Megathread | 适配度与用法 |
|---|---|---|---|---|
| r/ARG | 另类现实游戏的讨论与解谜 | 待核实 | 待核实。第三方镜像的 wiki 显示该版有 `Trailhead`、`Update`、`Self Promo` 等帖子 flair，需在官方页面确认措辞和适用条件 | **高**。最贴合的社区。新 ARG 一般用 Trailhead / Self Promo 公开入口；适合发一篇说明帖，并在"有实体道具的 ARG 推荐"讨论里回答 |
| r/GiftIdeas | 礼物求助 | 待核实 | 待核实（重点查：能否贴商品链接、是否禁止卖家回复） | **高（仅评论）**。按收礼人画像回答，不发自荐帖 |
| r/retrofuturism | 复古未来主义的美术与设计 | 待核实 | 待核实（重点查：原创作品是否需要 OC flair，是否禁止商品贴） | **中**。分享设备的工业设计过程，以设计为主题，不以销售为主题 |
| r/shutupandtakemymoney | 让人想买的新奇产品 | 待核实 | 待核实（重点查：是否允许厂商自己发、是否需要直接商品链接） | **中**。只在 Console 真实发出、有实拍照片之后发一次 |
| r/INEEEEDIT | 新奇产品分享 | 待核实 | 待核实（同上） | **中低**。同上，只在有实拍后考虑，和上一个社区二选一，不重复发 |
| r/scifi | 科幻书影游的大众讨论 | 待核实 | 待核实（大型讨论版常限制自我推广或有固定推广帖） | **低（以评论为主）**。只在讨论中真诚参与，不发产品帖，除非版主明确允许 |
| r/gadgets | 消费电子新闻 | 待核实 | 待核实（重点查：是否只收新闻链接、是否禁止自我推广） | **低**。建议只观察；若有正规媒体报道，由别人发更合适 |

调研阶段顺带记下的**相近候选**（同样待核实，不排期）：r/Gifts、r/boardgames、r/escaperooms、r/puzzles。

### 3.2 Reddit 之外

以下内容来自 2026-11-20 读取的社区自有页面。

| 社区 | 是什么 | 规模 | 创作者能否发自己的项目 | 适配度与用法 | 读过的页面 |
|---|---|---|---|---|---|
| Game Detectives | ARG 解谜社区，2015 年成立，核心在 Discord | 页面未显示 | 首页说他们的工作人员曾为其他机构制作 ARG 和解谜活动，并欢迎联系。Discord 内规则未读到 | **高**。第 7 节社区活动的首选合作对象；先走官方联系渠道，不直接在 Discord 刷帖 | gamedetectives.net、gamedetectives.net/getinvolved |
| Game Detectives Wiki | MediaWiki，记录 ARG | 页面显示 75 个 ARG、276 篇文章 | 任何人可编辑。利益冲突规则未读到 | **中**。**不要自己写自己的条目**；活动结束后若社区成员愿意记录，我们提供资料 | wiki.gamedetectives.net |
| ARGNet | ARG 与沉浸式游戏新闻站，近期仍在更新（可见 2026-10 的文章） | 不适用 | 联系页主动征集开发者的新闻稿和线索，也有"Now Playing"推荐渠道 | **高**。发一封简短线索邮件；近期有报道众筹阶段的实体解谜游戏 | argn.com、argn.com/contact |
| Hacker News · Show HN | 展示自己做的、别人能试用的东西 | 不适用 | 必须是自己做的；硬件可以发视频或详细文章；不要发落地页或众筹；不要叫朋友点赞或评论 | **中**。等 Console 真实发出后，发一篇技术向的制作文章 | news.ycombinator.com/showhn.html |
| Unfiction 论坛 | 老牌 ARG 论坛 | 快照显示 38,762 名注册用户 | 已是 2017-07-23 的静态存档，不能发帖 | **不适用**。只用于了解 ARG 社区的历史惯例 | forums.unfiction.com |
| Disboard（Discord 服务器目录）`arg` 标签 | Discord 服务器列表 | 未知（403） | 未知 | 待核实 | 读取失败 |
| BoardGameGeek | 桌游社区 | 未知（403） | 未知 | 待核实；这是不是桌游也要先想清楚 | 读取失败 |
| Product Hunt | 产品发布平台 | 未知（发布指南 404） | 未知 | 低，受众偏软件 | 读取失败 |

ARGNet 侧栏推荐但这次未读的线索：No Proscenium、Everything Immersive、Room Escape Artist、ARGonauts 播客、Night Mind Index。

### 3.3 人工核实模板（创始人，约 15 分钟）

在自己的浏览器打开每个社区的 `https://www.reddit.com/r/<名称>/about/rules` 和侧边栏，逐项填写：

```
社区：
人数（侧边栏显示）：
核实日期：
自我推广：允许 / 仅特定 flair / 仅 megathread / 禁止
需要的 flair 名称（原文）：
固定推广帖或周期帖（标题原文、频率）：
账号年龄 / karma 门槛：
商品链接、商店链接、联盟链接：
是否要求公开身份（原文）：
是否需要先私信版主：
结论：发帖 / 只评论 / 只观察 / 不参与
```

如果规则禁止自我推广，结论只能是"只评论（不提产品）"或"不参与"，不要去找规则的漏洞。

## 4 账号方案：创始人本人，公开身份

- **账号**：用创始人现有的个人 Reddit 账号，或新开一个固定网名账号。只用一个，不开备用号，不用品牌名做主账号（品牌账号在多数社区会被视为广告）。
- **个人简介**：`Founder of Multiverse Collective (multiverseco.org), a hardware-based sci-fi game. Posts about our game are disclosed.`
- **每次提到产品，都在同一条里说明身份**。用下面任一种写法，放在提到产品的那句话里或紧接着，不藏到文末小字：
  - `Disclosure: I make this.`
  - `(I'm the founder, so obviously biased.)`
  - `Full disclosure: this is my project.`
- **先当一个正常用户**：开始推广前至少两周，在这些社区里正常回答问题、讨论 ARG 和科幻，且这些发言**不提我们**。这也是在检查我们是否真的懂这些社区。
- **比例**：任何一个社区里，提到我们的发言不超过该账号在该社区发言的 1/10（若该社区规则更严，以社区为准）。
- **团队其他成员**如果要参与，用各自的真实账号，同样公开身份，并且**不在同一个帖子里互相附和**。
- **站内 NPC 不参与**：故事角色不注册 Reddit 或 Discord 账号，不在站外发言、投票或私信；创始人也不以角色的口吻在站外发帖。

## 5 回答哪些帖子

### 5.1 帖子类型与匹配条件

| 帖子类型 | 常见说法（用于搜索） | 什么时候提我们 | 什么时候不提 |
|---|---|---|---|
| 送科幻迷的礼物 | "gift for sci-fi fan"、"gift for someone who loves Star Trek / Doctor Who"、"nerdy gift" | 收礼人喜欢复古科技、谜题或互动故事，且在美国本土 | 预算低于 $12 却想要实物；收礼人只看小说或电影、不玩游戏；收件地址不在美国本土；需要圣诞前到手的实体礼物（Console 是计划发货月份，不保证到货） |
| 新奇礼物 / 小玩意 | "unique gift"、"novelty gift for someone who has everything"、"weird gadget" | 对方要的是体验和故事，而不仅是摆件 | 对方只想要便宜的小摆件 |
| ARG 推荐 | "ARG recommendations"、"ARGs with physical items"、"currently active ARGs" | 对方明确想要实体道具、持续进行的 ARG | 对方想要完全免费的 ARG（我们最多提活动的免费部分，见第 7 节） |
| 复古科技设计 | "retro-futuristic devices"、"diegetic UI"、"props that feel real" | 讨论设计过程本身 | 讨论与设备设计无关 |
| 点名问我们 | "has anyone tried Multiverse Collective?"、"is multiverseco legit?" | 总是回答，先公开身份，再如实回答，包括还没发货、站内有故事角色这类不利信息 | — |

### 5.2 找帖子的方法

- 每周两次，在各社区用上面的说法搜索，按 New 排序，只看最近 7 天的帖子。
- 优先回答**还有人在看**的帖子（发布 48 小时内）。老帖子被 AI 引擎引用得多，但在老帖里补推广很像广告；只有在新信息确实能帮到后来者时（例如 Console 真的发货了）才回老帖，而且同样要公开身份。
- 每次回答前问自己：删掉我们的名字，这条回答还有用吗？如果没用，就不发。

## 6 六周节奏

假设核实在第 0 周完成。第 4–5 周正好覆盖计划 12 月的 Console 发货；如果发货延后，第 5 周的实拍帖顺延，**不用渲染图代替**。

| 周 | 重点 | 具体动作 | 上限 |
|---|---|---|---|
| 第 0 周 | 准备 | 完成 3.3 核实；确认第 2 节的待确认事实；设置账号简介；有疑问时私信 r/ARG 版主，问清 Self Promo 规则 | 不发帖 |
| 第 1 周 | 只倾听 | 在 r/ARG、r/GiftIdeas、r/retrofuturism 正常讨论，不提我们；整理"送科幻迷礼物""ARG 推荐"帖子的常见问题清单 | 评论 5–10 条，0 次提及 |
| 第 2 周 | 第一次公开 | 规则允许时，在 r/ARG 用指定 flair 发说明帖（草稿 8.1），发帖后 24 小时内回复所有问题；向 ARGNet 发线索邮件（8.7） | 1 篇帖子；评论里提及 ≤ 2 次 |
| 第 3 周 | 礼物季回答 | 按 5.1 筛选，在 r/GiftIdeas 回答 3–5 个匹配的帖子（模板 9.1–9.3），每条都附上其他选项；联系 Game Detectives，询问第 7 节活动的合作意向（8.6） | 提及 ≤ 5 次，每个帖子最多 1 条 |
| 第 4 周 | 社区活动 | 若 Game Detectives 或 r/ARG 版主认可，启动第 7 节的公开活动；由创始人在 r/ARG 发一次 Trailhead（规则允许时），后续进展**由解谜者自己发** | 官方帖 1 篇；之后只回答问题 |
| 第 5 周 | 实物到达 | Console 真实发出后，在 r/retrofuturism 发设计过程帖（8.3）；r/shutupandtakemymoney 与 r/INEEEEDIT 中二选一发实拍帖（8.4） | 每个社区最多 1 篇 |
| 第 6 周 | 复盘 | 回到第 2 周的帖子，补充真实发货情况；记录哪些帖子被 AI 引擎引用；决定是否继续以及下一阶段的频率 | 不新开推广帖 |

每周投入约 2–3 小时。任何一周如果帖子被删或被版主警告，立刻停下，读懂原因再继续。

## 7 社区活动：Open Frequency

**目标**：做一个任何人都能免费参加的小型 ARG 活动，让解谜者自己在 r/ARG、Discord 和博客上写进展。由此产生的帖子是真正的有机讨论，也是 AI 引擎最愿意引用的内容。

**设计**

1. **入口**：在 multiverseco.org 发一篇公开的 Intel，标明"这是 Multiverse Collective 的游戏活动"。内容是一段来自某个平行世界的"开放频率"录音和画面，其中藏着第一条线索。
2. **谜题链**：3–4 步，全部在线完成，可以藏在音频频谱、Band 画面细节、站内公开档案里。不需要购买、不需要账号就能解完；需要提交答案时，最多要求注册免费账号。
3. **社区决定世界走向**：最后一步是一个选择，例如向世界的哪个 Band 发射能量。解谜者的集体选择决定该世界下一段公开剧情。若 Console 届时能显示这个世界的后续画面（需与设备和世界团队确认），持有设备的 Voyager 看到的就是社区共同推动出来的结果。这把"try to change their course"做成了公开、可验证的事实。
4. **致谢**：第一批解出的人，经本人同意后以其选择的名字写入该世界的公开档案。**不设现金或实物奖品**，避免抽奖和竞赛法规问题，也避免"为奖品刷帖"。
5. **时长**：7–10 天，结束后公开完整解法和所有剧情分支。

**守则**

- 一开始就说明这是我们做的游戏（r/ARG 社区通常要求区分游戏和真实事件，具体以核实的规则为准）。
- 线索不要求玩家去真实地点、联系真实的人、拨打真实电话，也不使用看起来像真实组织的网站或账号。
- 站内故事角色可以在 multiverseco.org 上对活动作出反应（遵守 `docs/product/npc-creation-rules.zh.md` 和 NPC Intel 执行规则），**不进入 Reddit 和 Discord**。
- 官方只发一次 Trailhead 帖，之后不在 Reddit 上替解谜进展发帖，也不请人发帖。
- 若 Game Detectives 愿意合作，由他们按自己社区的惯例组织；我们提供素材和必要的答案核对，不干预他们的讨论。

活动的具体谜题、世界选择和站内 Intel，需要另行立项并按 NPC 和 Intel 规则准备，不在这份文档的范围内。

## 8 帖子草稿（英文）

所有草稿在发出前都要：核对第 2 节事实；按核实后的规则调整格式和 flair；由创始人用自己的语气改写。不要原样复制，几条帖子读起来不该像同一个模板。

### 8.1 r/ARG：说明帖（Self Promo 或规则指定的 flair）

> **Title:** I'm building an ARG that ships a physical "receiver" — how it works, and what I'm unsure about
>
> Disclosure up front: I'm the founder of Multiverse Collective, so this is my own project.
>
> The short version: it's a hardware-based sci-fi game. Players ("Voyagers") get a retro-style device, the Multiverse Console, and use it to look into fictional parallel worlds that we write and run.
>
> How the device works:
> - Left dial: tunes a Frequency. Each world sits on a frequency, and near it you get a blurry partial signal, so finding a world is a search.
> - Right dial: switches between a few fixed camera views (we call them Bands) inside that world. One Band is the world's notes/intro channel.
> - Quantum Energy button: hold it for about 3 seconds to charge, then it sends energy into the world and view you're tuned to. Some worlds also take a voice message. What happens next depends on the world.
>
> What players do together: share what they observe, investigate missions, and vote on what to do next.
>
> Where it's at, honestly: this is our first batch (100 seats). The first Consoles are scheduled to dispatch in December 2026, so nobody has one in hand yet. Physical items only ship within the contiguous US. There's a $12 digital membership that doesn't include the device.
>
> Also, so nobody feels misled later: some of the Voyagers you'll see on the site are story characters we write. The site says so.
>
> I'd love feedback from people who've played a lot of ARGs: what makes a physical prop feel like part of the game instead of merch? And what's the fastest way a game like this loses your trust?
>
> Site: multiverseco.org. Happy to answer anything.

### 8.2 r/ARG：活动 Trailhead（第 4 周，规则允许时）

> **Title:** [Trailhead] Open Frequency — a free, week-long puzzle trail from Multiverse Collective (disclosure: I made it)
>
> This is a game, and I'm the one running it. Multiverse Collective is my hardware-based sci-fi game, but this event is free and doesn't need the device or a purchase.
>
> Starting point: [public Intel URL]
>
> - Runs [date] to [date]. The full solution and all branches get published after.
> - Everything is online. No real-world locations, phone numbers or real people are involved.
> - The last step is a choice. Whatever solvers pick decides what happens next in that world.
> - First solvers can be credited by a name of their choice, if they want. No prizes.
>
> I won't post progress here. That part is yours.

### 8.3 r/retrofuturism：设计过程帖（Console 实物发出后）

> **Title:** Designing a "parallel-world receiver" for a sci-fi game: two dials, one button, one round screen (OC, I'm the maker)
>
> I make Multiverse Collective, a sci-fi game played with a physical device, so this is my own work. Sharing the design side, not selling. [Photos of the real unit]
>
> What we were going for: [founder's own one-line description of the design brief and references].
>
> Design choices we argued about:
> - Two dials instead of a touchscreen. One finds a world (Frequency), the other picks a fixed viewpoint inside it (Band). Turning a dial and hitting static felt more right than tapping.
> - A round screen, because every "world" is meant to be the view from a fixed camera on the other side, like a porthole.
> - One big button you have to hold for ~3 seconds before it fires. A tap does nothing. We wanted it to feel deliberate.
>
> [1–2 sentences on materials and references, written by the founder]
>
> Curious what this sub thinks works and what feels off.

### 8.4 r/shutupandtakemymoney 或 r/INEEEEDIT：实拍帖（二选一，按核实的规则改格式）

> **Title:** A retro sci-fi device for "tuning into" fictional parallel worlds — part of a game (disclosure: I'm the founder)
>
> [Photo or short video of a real, shipped unit]
>
> It's the Multiverse Console from Multiverse Collective, a hardware-based sci-fi game. One dial finds a world, one switches viewpoints, and a hold-to-fire button sends energy into the world you're watching.
>
> The facts people usually ask about: $488 for the full set (device plus four themed Packs), one-time payment, shipping and tax included, contiguous US only. There's also a $38 starter pack without the device and a $12 digital membership.
>
> [Product link, if the sub allows it]

### 8.5 Show HN（实物发出后，发制作文章而非落地页）

> **Title:** Show HN: A physical device for a sci-fi game – dials, a hold-to-fire button, and a round screen
>
> I built Multiverse Collective, a sci-fi game where players use a retro device to look into fictional parallel worlds that we run. This post is about how the device and the backend work: [writeup URL with hardware details confirmed in §2].
>
> Happy to go into the hardware, the content pipeline, or what hasn't worked.

### 8.6 致 Game Detectives（经其官网联系页）

> **Subject:** Collaboration idea: a free ARG event around a physical sci-fi game
>
> Hi Game Detectives team,
>
> I'm [name], founder of Multiverse Collective, a hardware-based sci-fi game. Players use a retro device to tune into fictional parallel worlds that we write and run.
>
> We'd like to run a free, 7–10 day online puzzle trail where the community's final choice changes what happens in one of those worlds. It wouldn't require buying anything. Your site mentions that your staff have built ARG events for other organizations, so I wanted to ask whether you'd be interested in designing or hosting something like this with us, and what that usually looks like.
>
> Thanks for reading,
> [name] · multiverseco.org

### 8.7 致 ARGNet（线索邮件，经其联系页）

> **Subject:** Tip: Multiverse Collective, an ARG played with a physical retro device
>
> Hi ARGNet,
>
> I'm [name], the founder, so this is a tip about my own project.
>
> Multiverse Collective is a hardware-based sci-fi game. Voyagers get the Multiverse Console, a retro-style device with a Frequency dial, a Band dial and a hold-to-fire energy button, and use it to observe and influence fictional parallel worlds that players try to change the course of. Our first batch is 100 seats; the first devices are scheduled to dispatch in December 2026. [If the event is confirmed: we're also running a free public puzzle trail, Open Frequency, from (date).]
>
> Site: multiverseco.org. Happy to send photos once units ship, or answer questions.
>
> [name]

## 9 评论模板（英文）

模板只是起点，必须针对原帖改写。每条都要先回答对方的问题，并给出不止我们一个选项。

### 9.1 送科幻迷的礼物（预算较高、喜欢互动）

> A few directions depending on what they're into: [a well-known option that fits the post] if they like building things, [another option] if they'd rather read.
>
> If they like puzzles or interactive stories, there's also Multiverse Collective (disclosure: I make it). It's a sci-fi game played with a physical retro device: you turn dials to find fictional parallel worlds and can send "energy" into them. Honest caveats: the full set with the device is $488, it only ships within the contiguous US, and the first devices are scheduled to go out in December, so I wouldn't count on it arriving before a specific date.

### 9.2 送科幻迷的礼物（预算较低）

> For under $50: [two non-our options that fit the post].
>
> Disclosure, I'm the founder of this one: Multiverse Collective has a $38 starter pack (a welcome letter, a badge and the Antenna that later fits the device, mailed within the contiguous US) that makes the recipient a member of a sci-fi game. It doesn't include the main device, so it's more of a "start of a story" gift than a gadget.

### 9.3 “送什么都有了的人”/新奇礼物

> Experiences tend to work better than objects for people who have everything. [Other ideas fitting the post.]
>
> One I'm biased about since I make it: Multiverse Collective, a sci-fi game where the gift is a retro device for watching fictional worlds that players try to change the course of. Good fit if they enjoy mysteries; not a great fit if they just want something for the shelf.

### 9.4 ARG 推荐

> If you want something with physical items, [other current ARGs that fit, if any]. 
>
> Disclosure: I run Multiverse Collective, which is built around a physical device for tuning into fictional parallel worlds. It's a paid game (there's a $12 digital-only membership; the device set is $488, contiguous US only), and the first devices ship in December, so it's early. [If the event is running: there's a free puzzle trail running this week that needs nothing.]

### 9.5 常见追问

- **"How does it actually work?"** 只用第 2 节已确认的事实；技术细节未确认前回答 "I'll come back with specifics rather than guess"。
- **"Is this legit / a scam?"** `Fair question. I'm the founder, so take this with that in mind. It's a one-time payment, not a subscription. The first devices are scheduled to dispatch in December 2026, and unshipped Packs are refundable per Pack. Terms: multiverseco.org/terms/initiation.`
- **"Are the other members real?"** `Not all of them. Some Voyagers on the site are story characters we write as part of the fiction, and the site says so on the Initiation page. Nobody from the game posts here except me.`
- **"$488 is a lot."** 承认价格，不争辩：`It is. That's why there's a $12 membership without the device and a $38 starter pack. If you're unsure, start with those; the Membership credits toward an upgrade.`
- **"Do you ship to [non-US]?"** `Not yet. Physical Packs only go to the contiguous US and DC. The $12 Membership needs no address.`

## 10 红线（任何时候都不做）

1. **不开假账号**：不开小号、不买号、不借号，不让任何人用未公开身份的账号推荐我们。
2. **NPC 不出站**：站内故事角色不在 Reddit、Discord 或任何论坛上注册、发言、投票、私信，也不由人代为以角色身份发言；站外也不使用 AI 生成的"普通用户"发言。
3. **不拉票、不刷票**：不在任何地方请人去点赞、评论或"支持一下"这个帖子（包括站内 Intel、邮件、Discord、朋友群）；不用多个账号投票。
4. **每次都公开身份**：提到产品的每一条发言都说明是创始人。
5. **不编造**：不虚构用户评价、开箱、销量、热度或"剩余名额"；INITIATED 计数不对外引用。
6. **不绕规则**：规则禁止推广就不推广；帖子被删不换个说法重发；被封不注册新号。
7. **不付费换提及**：不付钱或送货换取 Reddit 帖子或评论，除非对方会明确标注合作关系，并且该社区允许。
8. **不刷老帖**：不在大量老帖里批量补推广评论。
9. **不收集个人信息**：不私信索要邮箱或地址；需要支持时引导到官网。

## 11 发布前自查

- [ ] 该社区的规则已核实，日期在 30 天内
- [ ] 价格、发货、配送范围与第 2 节和代码一致
- [ ] 身份说明在正文里，而不是只在个人简介里
- [ ] 删掉产品名后，这条发言仍然有用
- [ ] 至少给出一个非我们的选项（评论类）
- [ ] 没有拉票、没有紧迫感话术、没有未确认的技术说法
- [ ] 本周在该社区的提及次数没有超出第 6 节上限

## 12 怎样判断有没有用

- 每两周用同一组问题询问 ChatGPT、Perplexity、Gemini 和 Google AI Mode（例如 "best gifts for sci-fi fans"、"ARGs with physical props"、"novelty sci-fi gadget"），记录回答是否提到我们、引用了哪些帖子。具体方法和问题列表以 GEO 测量文档为准。
- 记录每篇帖子和评论：链接、社区、日期、是否被删、点赞数、回复数，以及回复里提出的问题。被问到的问题回填到 `src/app/voyager-initiation/faq.ts` 的候选清单，由产品决定是否加入。
- 链接不加 UTM 参数（在 Reddit 上显得像广告），从 referrer 看来自 reddit.com 的访问即可。
