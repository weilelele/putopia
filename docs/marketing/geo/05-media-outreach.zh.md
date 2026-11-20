# GEO 05 · 媒体与礼物指南外联计划

> 状态：草稿，2026-11-20。**本文所有邮件和表单都没有发出或提交。** 每次发送前由 Will 确认。
> 配套文件：[`press-fact-sheet.md`](press-fact-sheet.md)（媒体事实表，每条事实都注明了仓库出处，并列出待回答的问题）。
> 对外定义统一使用 `src/lib/site-seo.ts` 的 `SITE_DESCRIPTION`，原文照用，不改写。

## 0. 为什么做这件事，以及几条红线

ChatGPT、Perplexity、Gemini 和 Google AI Mode 回答“送科幻迷什么礼物”“有什么新奇科技玩具”这类问题时，主要引用第三方礼物指南、榜单和编辑报道，很少引用品牌官网。所以这次外联的目标是：**让 Multiverse Collective 以准确的一句话定义、价格和链接，出现在会被 AI 引用的第三方页面上。**

红线：

1. **不夸大，不编造。** 价格、发货月份、发货地区、名额，全部以事实表为准。“planned December dispatch” 不能写成 “arrives by Christmas”。“100 membership seats” 不能写成 “only 100 units”（`device-membership-copy.ts` 明确说名额不等于设备数）。
2. **图片一律标注来源。** 现有 Console 图片都是渲染图或 ImageGen 概念图，不能当实拍照发给媒体（见事实表 B2）。
3. **只走公开渠道。** 只用媒体自己在联系页或投稿页公布的表单和部门邮箱，不抓取、不猜测个人邮箱。页面把个人邮箱列为联系方式时（例如 GeekDad、ARGNet），表里只写页面链接，由 Will 人工按页面指引联系。
4. **付费收录就是广告。** Gadget Flow 付费方案、赞助指南这类，花钱前要单独决定，并按 FTC 要求标注。AI 引擎可能也会引用它们，但不能把它们算成“编辑报道”。
5. **评测机不附带任何条件。** 不要求好评，不要求链接，不以报道作为交换。媒体收到免费样机时，由他们自己按规定披露。

## 1. 定位角度

| 角度 | 一句话 | 适合的媒体 | 证据（事实表） | 注意 |
|---|---|---|---|---|
| **A. 一款硬件科幻游戏** | A sci-fi game you play on a retro hardware console: turn the dials to tune into parallel worlds, then send energy to change what happens there. | 科技/好物（The Verge、Gizmodo、Gear Patrol、Yanko、Gadget Flow）、游戏媒体（Polygon、Kotaku、Game Developer） | 旋钮、Frequency、Band、Quantum Energy Button | 科技编辑一定会问屏幕上显示的是什么、要不要联网（Q7）。没有答案之前，硬科技媒体放到第二波。 |
| **B. 一份同时是谜题的礼物** | A gift that is also a mystery: it arrives in four parts over the winter, and the last one's contents haven't been revealed. | 礼物指南（Cool Material、Uncrate、Mashable、GeekDad、io9） | 4 次发货 Oct/Nov/Dec/Jan；Pack 4 “contents to be announced”；三档价格 $12 / $38 / $488 | **送礼流程是硬伤（Q4）**：现在无法填写收礼人地址，也不能送礼卡。Q4 解决之前，这个角度要改成 “for the sci-fi fan in your life (or yourself)”，不能主打“送礼”。 |
| **C. 首发只有 100 个席位** | S26 is the first release of Multiverse Collective, limited to 100 membership seats. Voyagers share what they observe and investigate the worlds together. | 新闻/社区/ARG（ARGNet、Futurism、Den of Geek、The Mary Sue、Inverse） | `INITIATION_CAPACITY = 100`；Membership 也占一个席位 | 发送前确认剩余名额（Q9），并准备售罄后的落地页。名额快满时这个角度最强。如果已经售罄，就改讲“第一批 Console 正在发出”。 |

给编辑可以直接复制的产品描述（AI 引擎最容易原样引用这种句子）：

> **Multiverse Collective** — a hardware-based sci-fi game. Claim the Multiverse Console, a retro sci-fi device that decodes signals from parallel worlds, then explore them and try to change their course. From $12 (membership) to $488 (Complete Voyager Pack with the Console). Ships to the contiguous US + DC. multiverseco.org

## 2. 目标媒体表（42 家）

所有投递路径都在 2026-11-20 打开过页面核实（个别页面被拦截，已注明）。混淆处理过的邮箱是从页面代码解出来的，发送前请在页面上再确认一次。
优先级：**A** 本次节日窗口就投；**B** 有真机照片或评测机后投，或作为常青内容投；**C** 低契合度、入口不明或需要人工确认。
“指南时机”一栏是业内惯例，并非逐家核实：大型节日礼物指南通常 10–11 月发布，到 12 月中旬的最后发货日前持续更新；常青的 “gifts for sci-fi fans” 页面全年都会更新。

### 2.1 好物与礼物指南

| # | 媒体 | 公开投递路径 | 指南时机 | 角度 | 优先级 | 备注 |
|---|---|---|---|---|---|---|
| 1 | Cool Material | `hello@coolmaterial.com`（/contact/ 和 /editorial-submissions/ 都指向这个地址） | 常设 /guides/gifts/，节日期间更新 | B → A | **A** | 联盟佣金模式，需要能直接购买的链接 |
| 2 | Uncrate | https://uncrate.com/contact/ 表单，主题选 “Submissions / Questions” | 常设礼物指南 | A/B | **A** | 页面声明部分内容是赞助或带佣金 |
| 3 | Gear Patrol | `pitches@gearpatrol.com`（首页页脚 “Pitch a Product”，从混淆代码解出，发前确认） | 年度节日礼物指南 | A/B | **A** | 广告合作走 /2026-media-kit/，和编辑投递分开 |
| 4 | Gadget Flow | https://thegadgetflow.com/submit/free/（免费，要登录，不保证收录）；付费方案 $2,499 / $3,499 / $4,999 | 常年；FAQ 说审核通过后 1–2 个工作日上线 | A | **A**（免费）；付费另议 | 要求是实体产品并有公开销售页；推荐图片 1600×900 横图 |
| 5 | Yanko Design | `publication@yankodesign.com`，标题写作品名；必须提供全名、≥150 词描述、≥5 张高清 JPG | 常年 | A（复古科幻工业设计） | B | 缺一项就不予考虑，现有 1280px 渲染图不够用，等高清图 |
| 6 | Werd | https://www.werd.com/contact-us/ 表单 | 常年 | B | B | 不接受 guest post |
| 7 | This Is Why I'm Broke | 导航 “Submit a product” 指向登录后的 Pitch Dashboard（页面未能加载确认） | 节日流量大 | B | B | 需要人工登录查看流程 |
| 8 | Man of Many | `press@manofmany.com` | 节日礼物指南 | A | C | 澳洲受众，我们只发美国本土，受众对不上 |
| 9 | Geeky Gadgets | https://www.geeky-gadgets.com/contact/（页面列的是编辑个人邮箱，未收录） | 常年 | A | C | 页面要求寄产品前先联系 |
| 10 | Laughing Squid | https://laughingsquid.com/contact/ 表单 | 常年 | 只能从实体设备角度投 | C | 明确不写网站、App 和在线游戏 |
| 11 | Dude I Want That | 没找到公开投递入口（/contact 返回 404） | 节日 | B | C | 找到入口之前跳过 |
| 12 | Boing Boing | 没找到公开投递入口（/contact 返回 404） | — | A | C | 人工再查 |
| 13 | Neatorama | 没找到（/contact 返回 404，/faq 没查） | — | B | C | 人工再查 |
| 14 | Uncommon Goods | 卖家 “Submit Your Product” 页面没核实到 | — | 零售渠道，不是媒体 | C | 涉及批发、库存和定价，另议 |

### 2.2 科技媒体与大型礼物指南

| # | 媒体 | 公开投递路径 | 指南时机 | 角度 | 优先级 | 备注 |
|---|---|---|---|---|---|---|
| 15 | The Verge | https://www.theverge.com/contact 表单，选 “I want to pitch a story”，新闻线索选 “editorial tip” | 节日礼物指南 11 月起陆续发布，持续更新 | A | **A** | 表单要求一句话摘要加详细说明 |
| 16 | Gizmodo / io9 | 一般线索发 `tipbox@gizmodo.com`（/how-to-tip）；/about 说 pitch 直接发给撰稿人 | io9 有科幻礼物指南 | A + B | **A** | 评测政策：厂商不能付费买评测 |
| 17 | Mashable | `news@mashable.com`（页面写明这是唯一直达编辑部的地址，域名按页面推断） | 礼物指南 | A/B | **A** | contact@ 不收新闻稿 |
| 18 | WIRED | **没能核实**（抓取工具和内置浏览器都被拦） | Gear 团队礼物指南 | A | B | 人工打开 wired.com/about/contact |
| 19 | Engadget | 评测投递邮箱写在 https://www.engadget.com/reviews-policy-guidelines/（工具没能抽出地址，人工看） | 节日指南 | A | B | 评测机一般用完寄回；也接受早期产品 |
| 20 | Digital Trends | 新闻稿发 `editorial@digitaltrends.com`，评测样机找 `reviews@digitaltrends.com` | — | A | B | 不接受第三方投稿文章 |
| 21 | Popular Science | `editorial@popsci.com` | Best of What's New 2026 已经截止，2027 年 7 月再投 | A | B | `press@` 只处理采访，不收产品 PR |
| 22 | Inverse | 一般线索发 `admin@inverse.com`；pitch 按版块找编辑 | 科幻加礼物 | A + B | B | 联系页日期是 2020 年，可能过时 |
| 23 | Futurism | `tips@futurism.com`（新闻线索、新闻稿、pitch） | — | A/C | B | — |
| 24 | CNET | About 页只有合作和授权入口，没有编辑投递入口 | 礼物指南 | A | C | 暂缓 |
| 25 | Atlas Obscura | /contact 返回 403，没能核实 | 年度好奇心礼物指南 | B | C | 人工核实；调性很契合 |

### 2.3 游戏与 geek 媒体

| # | 媒体 | 公开投递路径 | 指南时机 | 角度 | 优先级 | 备注 |
|---|---|---|---|---|---|---|
| 26 | Polygon | `editorial@polygon.com`（选题），`pr@polygon.com`（活动和媒体） | 节日礼物指南 | A/B | **A** | Valnet 旗下 |
| 27 | Kotaku | `pitches@kotaku.com` | — | A/C | B | 页面写着 “We crave news” |
| 28 | Game Developer | `news@gamedeveloper.com` | 常年 | A（硬件和线上叙事的设计） | B | 适合做设计幕后故事 |
| 29 | GeekDad / GeekMom | https://geekdad.com/about/prproduct-review-enquiries/（联系发行人，页面上是个人地址，按页面指引） | **GeekDad/GeekMom Holiday Gift Guide 2026 正在进行** | B | **A** | 不要直接 pitch 单个撰稿人 |
| 30 | Den of Geek | `tips@denofgeek.com` | — | B/C | B | — |
| 31 | The Mary Sue | `tips@themarysue.com`（从混淆代码解出，发前确认）；另有 /tips/ 匿名表单 | — | B/C | B | — |
| 32 | Tested | `inquiries@tested.com`（合作）；实物可以寄到页面上的 San Francisco 邮箱地址 | — | A | B | 等实拍或评测机；页面说收件无法确认 |
| 33 | Hackaday | https://hackaday.com/submit-a-tip/ 表单或 `tips@hackaday.com` | 常年 | 只适合硬件制作故事 | C | 明确说 “Don't send us press releases” |
| 34 | Nerdist | https://nerdist.com/how-to-pitch/ | — | — | C | **明确不接产品 pitch**，不要投 |
| 35 | Reactor（前 Tor.com） | https://reactormag.com/submission-guidelines/ | — | — | C | 只收 1000–2500 词的非虚构稿，不推众筹；不适合产品 pitch |
| 36 | Bleeding Cool | 没有公开的线索入口 | — | — | C | 跳过 |
| 37 | Dicebreaker | 没能核实（被工具拦截） | 桌游礼物指南 | B | C | 人工核实 |

### 2.4 ARG、解谜和小众通讯/播客

| # | 媒体 | 公开投递路径 | 指南时机 | 角度 | 优先级 | 备注 |
|---|---|---|---|---|---|---|
| 38 | ARGNet | https://www.argn.com/contact/（明确接游戏新闻稿和线索）；X `@argn` | 常年 | C | **A** | ARG 和解谜游戏领域最权威的报道来源 |
| 39 | Room Escape Artist | `contact@roomescapeartist.com` 或 /contact/ 表单 | 有节日指南，今年来不及 | B/C | B（2027） | 产品必须完成；联系到发评测约 3 个月；只发一次邮件，不发私信 |
| 40 | Unwinnable | /contact 返回 403，没能核实 | 杂志和通讯 | C | C | 人工核实 |
| 41 | Geek's Guide to the Galaxy（播客） | 网站上没有联系入口 | — | 创始人访谈 | C | 等创始人故事定下来（Q2）再找 |
| 42 | Kottke.org | /about/ 只有作者个人邮箱，欢迎发链接 | — | C | C | 只适合有一段好视频之后 |

**待补充**：小众科幻通讯和播客还不够多（目前只有 #40–42）。建议下一步找 5–10 个 Substack 或播客（关键词：retro-futurism、analog horror、ARG、sci-fi gadgets），同样只记录公开的联系入口。这件事不阻塞本 PR。

## 3. 新闻资料包清单

建一个公开的 `/press` 页面或网盘文件夹（Q14），包含：

- [ ] **事实表**：`press-fact-sheet.md` 的 Part A，Q1–Q11 回答后定稿，导出 PDF。
- [ ] **真实产品照片**（最缺）：Console 正面、¾ 侧面、旋钮特写、手持（看大小）、开机屏幕（标明是哪个世界）、开箱。Pack 1 徽章和信件已有实拍原图（SHA 见 `public/assets/voyager-initiation/README.md`），**直接用原图，不用 ImageGen 改过的图**。Antenna 等定稿后实拍。
- [ ] **高清图**：长边 ≥3000px 的 JPG，至少 5 张（Yanko 的硬性要求）；1600×900 横图（Gadget Flow）；方图（社交和 AI 卡片）。
- [ ] **渲染图和概念图**：单独放一个文件夹，文件名和图注都标明 “Product rendering” 或 “Concept illustration”。
- [ ] **30–60 秒 B-roll**：实拍转旋钮、按 Quantum Energy Button（Q6）。
- [ ] **创始人故事**：150 词和 50 词两个版本，一句可引用的话，一张照片或一张不露脸的替代图（Q2）。
- [ ] **Logo**：`public/assets/logo.png`、`vi-wordmark.png`，需要透明底的 PNG 或 SVG。
- [ ] **FAQ 精简版**：屏幕显示什么，要不要联网，几个人玩，几岁适合，发货和退款（Q7）。
- [ ] **链接**：官网、/voyager-initiation，以及每家媒体单独的 UTM 链接（和 geo-measurement 会话的命名对齐）。
- [ ] **联系人**：press 邮箱，以及承诺的回复时间（Q1）。

## 4. Pitch 邮件模板（英文，可直接用）

通用规则：正文 ≤150 词；第一句就说清楚这是什么；价格、发货和地区如实写；附 1 张图和资料包链接，不放大附件；标题里不用全大写，不用 “EXCLUSIVE”。`[方括号]` 是待填内容。

### 4.1 角度 A：一款硬件科幻游戏（科技、好物、游戏编辑）

**Subject options**
- A sci-fi game played on a retro hardware console
- Turn a dial, find a parallel world: Multiverse Collective's Console ships in December

**Body**

> Hi [Name / team],
>
> Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Players, called Voyagers, claim a physical device, the Multiverse Console, to look into parallel worlds.
>
> The left dial tunes the frequency to find a world. The right dial switches between preset viewpoints inside it. Press and hold the Quantum Energy Button to charge it, then send energy into the world. A transmission might bring a faint image into focus or change something on the other side, and Voyagers compare notes to work out what happened.
>
> The first release, S26, is limited to 100 membership seats. The Complete Voyager Pack ($488) includes the Console, planned to dispatch in December 2026. Entry starts at $12. It ships to the contiguous US and DC.
>
> Fact sheet and images: [press kit link]
> Happy to set up a video demo [or: send a unit when available].
>
> [Spokesperson name], Multiverse Collective
> [press email] · multiverseco.org

### 4.2 角度 B：一份同时是谜题的礼物（礼物指南编辑）

> ⚠️ Q4（送礼流程）解决之前，用括号里的替代句。

**Subject options**
- Gift idea for sci-fi fans: a mystery that arrives in four parts
- For your sci-fi gift guide: a retro console that tunes into parallel worlds ($38–$488)

**Body**

> Hi [Name],
>
> For your [gift guide name / sci-fi gift roundup], here's one your readers probably haven't seen: **Multiverse Collective**, a hardware-based sci-fi game. It arrives as a series of mysterious deliveries. [Alt until gifting is supported: It's for the sci-fi fan who wants a mystery to solve this winter.]
>
> - **Under $50:** the Initial Voyager Pack ($38) includes a welcome letter, an exclusive Voyager badge, and an Antenna for the Multiverse Console.
> - **The big gift:** the Complete Voyager Pack ($488) adds the Multiverse Console, a retro sci-fi device whose dials tune into parallel worlds. It also adds a fourth delivery whose contents haven't been announced yet.
> - **Stocking-stuffer price:** Voyager Membership ($12) gives digital access to mission briefings and Classified Intel.
>
> Honest timing note: Packs follow a planned dispatch schedule. The Console is scheduled to dispatch in December 2026 and the fourth Pack in January 2027, so it's a gift that keeps unfolding after the holidays. It ships to the contiguous US + DC, shipping and taxes included.
>
> Product blurb, prices and images: [press kit link]
>
> Thanks for considering it,
> [Name] · [press email]

### 4.3 角度 C：首发 100 个席位（新闻、社区、ARG）

**Subject options**
- First release of a hardware-based sci-fi game opens 100 seats
- [For ARGNet] A physical console, shared parallel-world mysteries: S26 opens with 100 Voyagers

**Body**

> Hi [team],
>
> Multiverse Collective is a hardware-based sci-fi game. Voyagers use a physical device, the Multiverse Console, to tune into parallel worlds, send energy into them, and investigate together what changes. Between sessions they get mission briefings, Classified Intel and member votes.
>
> Its first release, **S26**, is limited to **100 membership seats**, and [N] are still open [verify on the day]. The first Consoles are planned to dispatch in December 2026.
>
> If it's useful for [outlet], I can share the in-world materials Voyagers have received so far (Pack 1 and Pack 2), or set up a walkthrough.
>
> [Name], Multiverse Collective · [press email] · multiverseco.org

### 4.4 表单用短描述

- **25 词**：Multiverse Collective is a hardware-based sci-fi game: claim the Multiverse Console, a retro device that decodes signals from parallel worlds, and try to change their course.
- **50 词**：上面一句，加上：The first release is limited to 100 seats. Options run from a $12 membership to the $488 Complete Voyager Pack with the Console (planned December 2026 dispatch). Ships to the contiguous US and DC.
- **100 词 / Yanko 版（需要 ≥150 词）**：用 4.1 正文，加上旋钮、Band、Remarks Band 的说明和外观材质（米白、银、橙；材质描述待实物确认）。

### 4.5 跟进邮件

**第一次跟进**（第 5–7 天，直接回复原邮件）

> Hi [Name], just bumping this in case it's useful for [guide/story]. Quick facts: $38–$488, ships to the contiguous US + DC, Console dispatch planned for December. Images here: [link]. No worries if it's not a fit.

**第二次，有新消息才发**（例如 Console 开始发货、第一批实拍照、名额剩余 <10）

> Hi [Name], a quick update since my last note: [the first Multiverse Consoles have started shipping / here are the first real photos / S26 has N seats left]. [1 new image]. Happy to send anything else for [outlet].

**回应评测机请求**（见第 6 节）

> Thanks for the interest! Consoles are scheduled to dispatch to Voyagers in December. We're setting aside a small number of [loaner] units for reviewers right after customer units ship. I've added you to that list for [expected window]. In the meantime I can send [Pack 1–2 items / a video walkthrough / press access].

## 5. 跟进节奏

| 时间 | 动作 |
|---|---|
| 第 0 天 | 首封 pitch，一家媒体只发给一个部门邮箱或表单 |
| 第 5–7 天 | 回复原邮件跟进一次（4.5 第一次跟进） |
| 第 14 天以后 | 只在有**新消息**时再跟进一次（4.5 第二次） |
| 之后 | 停止跟进，记为 “no reply”，下个周期（2027 常青 / 父亲节 / 2027 节日）再试 |

规则：每家媒体每个周期最多 3 封邮件。对方说不合适就停，记录原因。Room Escape Artist 明确要求只联系一次，不要跟进。不在社交平台私信编辑。
追踪表字段：媒体、入口、角度、发送日、跟进 1、跟进 2、回复、结果（收录 / 拒绝 / 无回复）、链接、页面上的描述是否准确、AI 引擎是否已引用（和 geo-measurement 会话对齐）。

## 6. 时间线：本次节日窗口 vs 常青内容

今天是 2026-11-20（周五）。感恩节 11/26，Black Friday 11/27，Cyber Monday 11/30。

**实话**：各大媒体今年的主礼物指南大多已经发布，这一波主要争取“更新/补充”类文章、“最后时刻礼物”文章，以及常设的 /gifts/ 页面，命中率会低于常青内容。Console 又只是“计划 12 月发货”，所以节日窗口里能主推的是 $38 Initial Pack 和“谜题礼物”这个故事，而且前提是 Q4（送礼流程）解决。

| 日期 | 动作 | 前提 |
|---|---|---|
| 11/20–11/24 | 回答 Q1–Q11；确定 press 邮箱；建资料包；准备 UTM 链接 | — |
| 11/24–11/26 | 第一波：Cool Material、Uncrate、Gear Patrol、Gadget Flow（免费）、Mashable、Polygon、GeekDad、io9；ARGNet 用角度 C | Q1、Q8、Q9 已回答；Q4 未解决时角度 B 用替代句 |
| 11/27–12/1 | 黑五/网一期间不发新邮件（编辑最忙）；发前面几家的第一次跟进 | — |
| 12/1–12/11 | 第二波：The Verge 表单、Futurism、Den of Geek、The Mary Sue、Inverse、Kotaku；同时做第一次跟进 | — |
| 12 月中旬 | **Console 开始发货 → 第一批实拍照和开箱视频** → 用“新消息”做第二次跟进；评测机名单开始执行 | Q5、Q10 |
| 12/15 以后 | 礼物指南基本停止更新，不再做节日 pitch | — |
| 2027 年 1 月 | Pack 4 揭晓（可以做成新闻点）；Yanko（拿到高清图后）、Game Developer 设计幕后、Tested、Engadget/Digital Trends 评测 | 实拍图 |
| 2027 年 1–2 月 | Room Escape Artist（产品完成后，约 3 个月出评测）；Hackaday（只在有制作故事时）；补齐小众通讯和播客名单 | — |
| 2027 年 4–5 月 | 父亲节礼物指南 | 下一批的名额和发货时间 |
| 2027 年 7 月 | PopSci Best of What's New 投递 | — |
| 2027 年 7–10 月 | 2027 节日指南：纸媒长周期 7–8 月，网络媒体 9–10 月 | 有实拍、有评测、有用户口碑 |

**常青内容比节日窗口更重要**：AI 引擎会长期引用 “best gifts for sci-fi fans” 这类常设页面。真正的目标是有了实拍照之后，进入这些常设页面，以及 2027 年的指南。

## 7. 评测机问题（Console 12 月才发货）

现状：Console 计划 12 月发货，仓库里没有实拍或工程样机的证据（Q5）。S26 只有 100 个会员席位，设备数量另外统计（`device-membership-copy.ts`）。

| 选项 | 时间 | 优点 | 风险 |
|---|---|---|---|
| ① 现在不提供评测机，只讲故事和渲染图 | 节日窗口 | 不影响用户的设备 | 科技媒体通常不会只凭渲染图收录 |
| ② 现在寄 Pack 1–2 实物（信、徽章、Antenna），并提供媒体会员权限 | 立刻 | 实物已经存在，能让编辑体验“谜题礼物” | 媒体权限如果占 S26 席位就不划算（Q10；“Initiated places” 说明里赠送名额也算在 100 个之内，需要确认有没有不占名额的授权方式） |
| ③ 视频演示：有真机就做 15 分钟远程演示 | 有真机以后 | 不用寄设备 | Q5 |
| ④ 12 月那批里留 3–5 台作为**借用评测机**，在用户的设备发出之后再寄 | 12 月底–1 月 | 拿到真实评测，AI 引擎最看重这类内容 | 占用设备库存，必须保证不挤占用户 |

**建议**：节日窗口用 ① + ②，对外统一说 “review units after customer units ship”。12 月底执行 ④，优先给 Gizmodo/io9、The Verge、Tested、GeekDad、Engadget 或 Digital Trends（`reviews@`）；Room Escape Artist 排在 1 月。评测机统一借用（需寄回），附事实表和已知限制的说明，不设禁发期以外的任何条件。不允许为了媒体推迟任何一台用户的设备。

## 8. 发送前检查清单（每封邮件）

- [ ] 价格、发货月份、地区和事实表 Part A 一致
- [ ] 没有写 “arrives by Christmas”“only 100 units”“limited stock” 这类没有依据的说法
- [ ] 附图已标注 “rendering” 或 “concept”，或者是实拍
- [ ] 收件入口来自本文第 2 节，是公开的部门地址或表单
- [ ] UTM 链接正确
- [ ] Will 已确认发送

## 9. 待决问题

见 [`press-fact-sheet.md` B3](press-fact-sheet.md#b3-open-questions-in-chinese-must-be-answered-before-part-a-is-sent)。其中 **Q4 送礼流程、Q5 实拍、Q7 屏幕显示什么、Q8 圣诞前能否送到** 直接决定这次节日窗口能不能主推，请先回答这四个。
