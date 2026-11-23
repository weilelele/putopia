# GEO 01 · 站内内容页计划

日期：2026-11-20 · 分支：`claude/geo-content-pages-9540a1`（基于 PR #337 `claude/geo-site-basics`）

## 目标

让 ChatGPT、Perplexity、Gemini 与 Google AI Mode 在回答"科幻礼物 / 新奇礼物 / 硬件科幻游戏 / 复古科幻小物件 / 在家玩的互动解谜游戏"这类问题时，能在站内找到**可直接引用的、事实正确的段落**，并把 Multiverse Collective 归入这些品类。

原则：

1. **先回答，再展开。** 每页第一段两三句话就回答目标问题：它是什么、给谁、多少钱。答案引擎通常只截取开头。
2. **只写能追溯到仓库来源的事实。** 价格从 `src/lib/initiation-pricing.ts` 计算，不手写数字；Pack 内容、发货月份、退款、配送区域来自 `src/app/voyager-initiation/faq.ts`、`initiation-view.tsx`、`src/lib/antenna-copy.ts`；设备操作来自 `docs/device-reference/console-operations.zh.md`（优先于 GDD）；世界观与角色来自 `docs/game-design/00-overview/zh.md`。无法核实的内容放到文末"待确认问题"，**不上线**。
3. **保留世界内语气，但核心事实必须出现。** 标题和小段落可以用 Collective 的口吻（"Voyager"、"parallel worlds"），每页都要用平实英语说清：这是一个基于硬件的科幻游戏；平行世界属于游戏故事；Console、Pack 和社区是真实的。
4. **不用隐藏文字。** 所有给答案引擎看的文字都对真人可见；JSON-LD 只复述页面上已有的内容。
5. **诚实写缺点。** 对比页要写清：Console 尚未发出（计划 2026 年 12 月）、只发美国本土 48 州 + DC、名额有限、部分功能仍在定义、Pack 4 内容未公布。

## 目标问题 → 页面映射

| 买家问题（英文原样，供答案引擎匹配） | 回答页面 | 首段要回答的点 |
| --- | --- | --- |
| What is Multiverse Collective? / Is Multiverse Collective real? | `/about` | 基于硬件的科幻游戏；Multiverse Console；规范定义原文 |
| hardware-based sci-fi game / sci-fi game with a physical device | `/about` | 同上 + 三档价格 |
| retro sci-fi gadget / retro sci-fi device / sci-fi gadget that actually does something | `/about/multiverse-console` | Console 是什么、怎么操作、怎么获得、价格、发货月份 |
| unique gifts for sci-fi fans / gift for someone who has everything / novelty gift for a sci-fi fan | `/about/sci-fi-gifts` | 收礼人会得到什么、价格、各 Pack 内容与发货月份（含"12 月发货 ≠ 圣诞前到货"） |
| interactive mystery game at home / immersive sci-fi game at home / alternate reality game to join | `/about/sci-fi-game-at-home` | 每周在家做什么：Mission Briefing、Parallax Array、Classified Intel、Member Votes、Console 操作 |
| Multiverse Collective vs mystery box / is it a subscription box / like an escape room in a box? | `/about/how-it-compares` | 一次性付款、内容预先公布、持续的共享世界 vs 一次性解谜 |

`novelty toys`：仓库里没有年龄建议，所以页面**不把它称为儿童玩具**，只在礼物页以"novelty gift"语境出现。年龄建议确认后再决定是否加"for adults / for teens"表述（见待确认问题）。

## 页面共用结构（竖屏优先）

- 二级页结构：返回链接 → 24px/700 可见 h1 → 正文；无 Logo；阅读列最大 720px；手机左右 16px。
- **首段（answer-first）**：2–3 句，包含品牌名 + 品类词 + 价格起点。
- **Quick facts**：定义列表（What it is / Who it is for / Price / What is in each Pack / Shipping / Payment / Availability），所有页面同一份数据源，避免各页口径不一。
- 正文分节，每节标题就是一个买家会问的问题。
- 页尾 FAQ（3–5 条），同时输出 `FAQPage` JSON-LD。
- 页尾一个主按钮到 `/voyager-initiation`（实时名额与结账）+ 相关页链接。
- JSON-LD：`WebPage`（`/about` 用 `AboutPage`）引用 PR #337 的 Organization / WebSite `@id`；`BreadcrumbList`；`FAQPage`。Console 页用 `mentions` 指向 `/voyager-initiation#product`，**不另造 Product/Offer**（Console 不单独出售）。
- 文字全部服务端渲染（静态页面，构建时生成）。Membership 是否在售跟随 `INITIATION_MEMBERSHIP_ENABLED`，与 `/voyager-initiation` 同一开关。

### 共用事实（Quick facts 的内容与来源）

| 事实 | 内容 | 来源 |
| --- | --- | --- |
| 是什么 | `SITE_DESCRIPTION` 原文 | `src/lib/site-seo.ts` |
| 价格 | Voyager Membership $12（开关开启时）；Initial Voyager Pack $38；Complete Voyager Pack $488；Initial 用户加 Console + Pack 4 为 $460 | `initiation-pricing.ts`、`faq.ts` |
| Membership 内容 | Mission Briefings、Parallax Array 观测投稿、Classified Intel、Member Votes；无实体 Pack、无 Console 认领 | `faq.ts`（MEMBERSHIP） |
| Pack 1 | 欢迎信 + Voyager 徽章，计划 2026-10 发出 | `initiation-view.tsx`、`site-seo.ts` OFFER_DESCRIPTIONS |
| Pack 2 | Antenna for Multiverse Console（装在 Console 顶部接收某类信号；图片为设计稿，最终外观与数量待定），计划 2026-11 | `antenna-copy.ts` |
| Pack 3 | Multiverse Console，计划 2026-12 | `initiation-view.tsx`、`faq.ts` |
| Pack 4 | 内容待公布，计划 2027-01 | `initiation-view.tsx` |
| 配送 | 美国本土 48 州 + 华盛顿特区；运费和税已含 | `faq.ts` |
| 付款 | 一次性付款，无订阅、无续费 | `faq.ts` |
| 退款 | 未发出的 Pack 可退；按 Pack 均摊 | `faq.ts`、`/terms/initiation` |
| 名额 | S26 是第一期，限 100 个名额（Membership 也占名额） | `initiation-view.tsx`、`faq.ts` |
| 发货说明 | 计划发货月份，不是保证到货日期 | `faq.ts` |
| Console 操作 | 左旋钮调 Frequency（每格 0.1）找世界；右旋钮选 Band（预设观测视角，含 Remarks Band）；长按 Quantum Energy Button 至少 3 秒蓄能后发射能量；储能上限暂定 10 点，每次发射 1 点，静置恢复；部分世界可随能量发送一段语音 | `console-operations.zh.md` |
| Mission | 会员可读每周简报；执行 Mission 需要绑定到账户的 Console | `faq.ts`、`initiation-view.tsx` |

## 各页大纲

### 1. `/about` — What is Multiverse Collective?

- 首段：规范定义原文 + "Voyager options start at $12 (Membership) / $38 (Initial Voyager Pack); the Complete Voyager Pack with the Console is $488."
- 节：
  - Is it real? —— 是一个游戏：平行世界是游戏故事；Console、Pack、社区和你的投票是真实的。
  - What do Voyagers do? —— 调频找世界、切换视角、发送能量、读简报、投票、在 Parallax Array 描述世界。
  - What is in each Pack? —— 四个 Pack 列表 + 计划月份。
  - Who is it for? —— 喜欢科幻、复古硬件、长期故事、愿意和别人一起调查的人；实体 Pack 仅发美国本土。
  - What it is not —— 不是订阅盒，不是随机盲盒，不是单人一次性解谜盒（链接对比页）。
- Quick facts、FAQ、相关页链接。

### 2. `/about/multiverse-console` — The Multiverse Console, a retro sci-fi device

- 首段：Multiverse Console 是 Multiverse Collective 的实体设备，外形像复古收音机/电视；两只旋钮 + 一个能量按钮；包含在 $488 Complete Voyager Pack 里（Pack 3，计划 2026-12 发出），Initial 用户可加 $460。不单独出售。
- 节：How it works（Frequency / Band / Remarks Band / Quantum Energy Button / 语音）、What you see（附近频率模糊画面、无信号雪花；能量可能让画面更清晰或影响世界，但不保证）、What is still being defined（3 秒、10 点为当前设定可调整；部分能力随 Voyager 探索解锁）、How to get one。
- 图片：`/assets/voyager-initiation/console-multiview-portrait.png`（`/voyager-initiation` Pack 3 当前使用的现款 Console 图）。不用 `device-console.jpg` 做正文配图：它标注的是旧称 "Channel Control Dial" 等，与 Frequency / Band 术语冲突；它仍是 PR #337 的站点默认分享图。
- 不写：尺寸、重量、供电、联网方式、屏幕规格（待确认）。

### 3. `/about/sci-fi-gifts` — A gift for sci-fi fans

- 首段：给喜欢科幻的人（或"什么都有"的人）一个可以真正操作的复古科幻设备和一个持续的故事；价格三档；只发美国本土。
- 节：What they receive（按档位列）、Timing（计划发货月份；Console 计划 12 月**发出**，不保证节日前到达）、Why it suits someone who has everything（不是又一件摆件：设备有实际操作，故事和社区持续进行）、Things to know before buying（Console 尚未发出、名额有限、Pack 4 未公布、Antenna 为设计稿、一次性付款、未发出 Pack 可退）。
- 不写：礼品包装、礼品卡、代他人开通账户/改收件人的流程（待确认）。

### 4. `/about/sci-fi-game-at-home` — An interactive sci-fi mystery to play at home

- 首段：在家参与的互动科幻游戏：调查平行世界传来的信号，和其他 Voyager 一起推进；不是单局解谜，而是持续的共享世界。
- 节：A typical week（读 Mission Briefing、在 Parallax Array 描述世界并投票、读 Classified Intel、Member Votes；有 Console 时执行 Mission、调频、发送能量）、With or without the Console（Membership/Initial 可以做什么，执行 Mission 需要 Console）、Solo or together（社区共同调查；不写人数上限）、How it compares（链接对比页）。

### 5. `/about/how-it-compares` — How Multiverse Collective compares

- 首段：与盲盒、订阅解谜盒、ARG、纯 App 游戏、科幻道具的核心区别：一次性付款、内容预先公布（Pack 4 除外）、有可操作的设备、持续的共享世界。
- 每个品类一节："Typically" vs "Multiverse Collective"（只描述品类的一般特征，不点名竞品品牌，不对他人产品做事实断言）。
- 必写缺点节："Where it may not fit"：价格（Console 档 $488）、仅美国本土、Console 计划 12 月发出、名额有限、部分设备能力仍在定义、需要持续在线参与。

## `/welcome` 决定

`/` 对所有访客重定向到 `/welcome`，所以 `/welcome` 实际是**首页**。目前可见文字只有 "We own devices looking into parallel worlds."，答案引擎抓到的首页几乎没有事实。

决定：**加一行可见、世界内语气的事实句**，放在原 tagline 下方，使用 `SITE_SHARE_DESCRIPTION` 中已获批的第二句：

> Multiverse Collective is a hardware-based sci-fi game: claim the Multiverse Console, decode signals, explore parallel worlds and try to change their course.

不改动画、Logo 与跳转逻辑；不加隐藏文字。单独一个 commit，便于用户不同意时撤回。

## 实现说明

- 内容与 JSON-LD 构造放在新模块 `src/lib/geo-pages.ts`（从 `site-seo.ts` 导入，不修改它），有纯函数测试 `src/lib/geo-pages.test.ts`。
- 路由：`src/app/about/page.tsx`、`src/app/about/[slug]/page.tsx`（`generateStaticParams` + `dynamicParams = false`）。
- `src/app/sitemap.ts` 加入 5 个路由；`src/lib/access-policy.ts` 放行 `/about` 系列，避免未完成注册的登录用户被转去 `/register`。

## 待确认问题（以下内容未上线）

1. **设备规格**：Console 尺寸、重量、材质、供电（电池/USB）、是否需要 Wi-Fi 或手机 App、屏幕规格。答案引擎很常问"需要联网吗"。
2. **画面来源的对外说法**：平行世界画面是如何产生的（实拍微缩场景 / 生成影像 / 其他）？是否愿意对外说明？目前页面只写"平行世界属于游戏故事"。
3. **"It is a game; the parallel worlds belong to its story"** 这一句是否可以接受？它是对 "Is it real?" 最直接的诚实回答，但比现有站内语气更"出戏"。
4. **年龄建议与玩家人数**：是否面向成人？有没有最低年龄？一台 Console 是否可以全家共用、一个账户？
5. **送礼流程**：能否用收礼人的邮箱结账、填写收礼人地址？是否有礼品卡、礼品留言、包装？目前礼物页不描述购买流程。
6. **Membership 的地区**：$12 Membership 不需要地址，是否全球可买？页面目前只写实体 Pack 的配送区域。
7. **Antenna 的设计稿说明**（"final appearance and quantity to be confirmed"）在 Pack 2 已计划 11 月发出的今天是否仍然准确？
8. **S26 之后**：后续批次的时间、价格是否会变、故事会持续多久？页面只写"later batches may open"。
9. ~~**站内入口**~~ 已确认（2026-11-23）：游客 Dashboard 两个入口下方、`/voyager-initiation` FAQ 末尾各加一个 "What is Multiverse Collective?" 文字链接，指向 `/about`。
10. **隐私政策用词**：`/privacy` 把产品称为 "an alternate reality game"，与规范定义 "hardware-based sci-fi game" 不一致。是否统一？（本 PR 未改。）
