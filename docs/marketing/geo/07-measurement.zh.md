# GEO 07 · 衡量 GEO 是否有效

> 目标：让 ChatGPT、Perplexity、Gemini、Claude、Copilot、Google AI Overviews / AI Mode
> 在「科幻迷礼物、新奇小玩意、硬件科幻游戏、ARG、复古科幻设备」这类问题里推荐
> Multiverse Collective，并且把它描述准确。
>
> 本文规定：**问什么（固定 Prompt 集）、去哪问（引擎与模式）、记什么（评分表）、
> 多久问一次（月度节奏）、用什么工具，以及站内数据（PostHog、Cloudflare、
> Google Search Console）怎么看。**
>
> 第一轮（基线）应在 2026-11 完成，赶在内容页、购物 feed、视频、Reddit、媒体、
> 平台上架等并行工作见效之前，否则以后无法判断变化从哪里来。

---

## 1. 衡量什么：五个指标

| 指标 | 定义 | 数据来源 |
|---|---|---|
| **提及率**（Mention rate） | 回答里出现 Multiverse Collective / Multiverse Console / multiverseco.org 的比例 | 评分表 `mentioned` |
| **Top-3 率** | 在推荐列表里排进前 3 的比例（只算非品牌 Prompt） | 评分表 `position` |
| **引用率**（Citation rate） | 回答的来源链接里出现 multiverseco.org 的比例 | 评分表 `cited_our_url` |
| **描述准确度** | 品牌 Prompt 的平均准确分（0–3，见 §4.2） | 评分表 `accuracy` |
| **AI 来访与转化** | 来自 AI 助手的会话数、Initiation 页浏览、结账、付款 | PostHog `ai_referrer`（§7） |

辅助指标：竞品声量（`competitors` 列里各竞品被点名的次数）、AI 爬虫抓取量（Cloudflare，§8）、
Google 生成式 AI 展示次数（GSC，§9）。

**判断 GEO「起效」的顺序**通常是：爬虫抓取量上升 → 品牌 Prompt 准确度上升 →
检索型引擎（Perplexity、ChatGPT 搜索、AI Mode）开始引用 → 非品牌 Prompt 提及率上升 →
AI 来访与转化出现。模型训练知识的更新要慢几个月，检索型引擎一般几周内就有反应。

---

## 2. 固定 Prompt 集（54 条，英文）

规则：

- **措辞固定，不要随手改。** 改一个词就是另一条 Prompt；确需新增时追加新编号（P55…），
  旧编号停用但不删除，保证历史可比。
- ★ = 核心 20 条，每月在所有网页端引擎上手工检查；其余每季度全量检查一次（§5）。
- `scripts/geo/run-prompt-set.mjs` 直接解析下表，**表格格式不要改**（`| P01 | gift | ★ | … |`）。
- 类别：`gift` 科幻迷礼物 · `novelty` 新奇小玩意/玩具/礼物 · `hwgame` 硬件科幻游戏 ·
  `arg` ARG / 沉浸式 · `retro` 复古科幻设备 · `brand` 品牌问题。

| ID | 类别 | 核心 | Prompt |
|---|---|---|---|
| P01 | gift | ★ | What are some unique gifts for a sci-fi fan who already has everything? |
| P02 | gift | ★ | What are the best gifts for sci-fi lovers under $100? |
| P03 | gift |  | What's a good Christmas gift for someone who loves Star Trek and The X-Files? |
| P04 | gift |  | Gift ideas for a sci-fi nerd boyfriend who likes gadgets |
| P05 | gift | ★ | Unusual gifts for someone obsessed with the multiverse and parallel universes |
| P06 | gift |  | What should I get a science fiction reader who likes interactive experiences? |
| P07 | gift |  | Cool sci-fi themed gifts that aren't just merch or posters |
| P08 | gift |  | Experience gifts for science fiction fans |
| P09 | gift |  | Is there a gift for sci-fi fans that arrives by mail over several months? |
| P10 | gift |  | Gifts for fans of mysterious sci-fi shows like Severance or Black Mirror |
| P11 | novelty | ★ | What are some weird novelty gadgets that make great gifts? |
| P12 | novelty | ★ | Best novelty gifts for adults this year |
| P13 | novelty |  | Unique conversation-piece gadgets for a desk |
| P14 | novelty |  | Novelty toys for adults who like science fiction |
| P15 | novelty | ★ | What are the strangest products you can buy online that are actually fun? |
| P16 | novelty |  | Quirky tech gifts that aren't smart home devices |
| P17 | novelty |  | Mysterious gadgets that come with a story behind them |
| P18 | novelty |  | Unique gifts for people who love puzzles and mysteries |
| P19 | novelty | ★ | Fun retro-futuristic gadgets to buy |
| P20 | novelty |  | Novelty items for a sci-fi themed room or office |
| P21 | hwgame | ★ | Are there any sci-fi games that use a physical device? |
| P22 | hwgame | ★ | Games that blend physical hardware with an online sci-fi story |
| P23 | hwgame |  | Sci-fi mystery games where you receive real objects in the mail |
| P24 | hwgame |  | Sci-fi games played over several months instead of in one sitting |
| P25 | hwgame | ★ | What are some hardware-based games for adults? |
| P26 | hwgame | ★ | What are some phygital games that combine a real device with an app or website? |
| P27 | hwgame |  | Collaborative sci-fi games where players vote on what happens next |
| P28 | hwgame |  | Narrative games that come with a collectible physical device |
| P29 | hwgame |  | Sci-fi games for people who don't play video games |
| P30 | hwgame |  | Games about parallel universes you can play in real life |
| P31 | arg | ★ | What are the best alternate reality games (ARGs) running right now? |
| P32 | arg | ★ | ARGs a beginner can join today |
| P33 | arg |  | Immersive sci-fi experiences you can do from home |
| P34 | arg |  | Interactive fiction where the community changes the story |
| P35 | arg |  | Games like Cicada 3301 but for casual players |
| P36 | arg | ★ | Paid ARGs that mail you physical props |
| P37 | arg |  | Online sci-fi mystery communities worth joining |
| P38 | arg |  | Transmedia sci-fi stories with real-world clues |
| P39 | retro | ★ | Retro sci-fi devices or props you can actually use |
| P40 | retro | ★ | Where can I buy a retro-futuristic gadget that looks like it's from a 1970s sci-fi movie? |
| P41 | retro |  | Gadgets that decode mysterious signals, like a radio from a sci-fi film |
| P42 | retro |  | Analog-looking sci-fi gadgets that have a real function |
| P43 | retro |  | Cassette-futurism style tech products |
| P44 | retro |  | Sci-fi console or terminal replicas for a desk |
| P45 | retro |  | Unique devices for people who love the multiverse concept |
| P46 | brand | ★ | What is Multiverse Collective? |
| P47 | brand | ★ | What is the Multiverse Console? |
| P48 | brand | ★ | Is Multiverse Collective legit? |
| P49 | brand | ★ | How does Multiverse Collective work? |
| P50 | brand |  | How much does Multiverse Collective cost? |
| P51 | brand |  | What comes in the Multiverse Collective Voyager Pack? |
| P52 | brand |  | Does Multiverse Collective ship outside the US? |
| P53 | brand |  | Multiverse Collective reviews |
| P54 | brand |  | What is multiverseco.org? |

> 品牌名「Multiverse Collective」并不独特，模型可能把它和其他同名或带 Multiverse 的品牌、
> 社群、加密项目、漫威内容混为一谈。品牌 Prompt 的首要观察点就是**实体是否认对**。

---

## 3. 引擎与模式

### 3.1 网页端（手工检查，代表真实用户看到的答案）

| 代码（`engine`） | 入口 | 模式（`mode`） | 账号 | 频率 |
|---|---|---|---|---|
| `chatgpt` | chatgpt.com | 未登录默认（会联网搜索）；如回答没联网，记 `mode=no_search` | 未登录 | 每月·核心 |
| `perplexity` | perplexity.ai | 默认搜索 | 未登录 | 每月·核心 |
| `google_aio` | google.com 普通搜索顶部的 AI Overview | 无痕窗口，`&hl=en&gl=us` | 未登录 | 每月·核心 |
| `google_aimode` | google.com 的 AI Mode（`udm=50`） | 无痕窗口 | 未登录 | 每月·核心 |
| `gemini` | gemini.google.com | 临时对话 / 关闭个性化 | 测试账号 | 每月·核心 |
| `copilot` | copilot.microsoft.com | 默认 | 未登录 | 每月·核心 |
| `claude` | claude.ai | 打开 Web search，新对话 | 测试账号 | 每季度·全量 |
| `grok` / `meta_ai` / `deepseek` | grok.com / meta.ai / chat.deepseek.com | 默认 | — | 每季度·核心（可选） |

如果 Google 搜索结果里**没有出现** AI Overview，`google_aio` 行记 `mentioned=N`，
`notes=no_aio`，不要换说法重搜。

### 3.2 API（脚本批量跑，代表趋势，不代表用户界面）

| 代码 | 接口 | 说明 |
|---|---|---|
| `openai_api` | OpenAI Responses API + `web_search` 工具 | 与 ChatGPT 网页端的模型、检索管线不同 |
| `perplexity_api` | Perplexity Sonar API | 返回来源链接，最接近网页端 |
| `gemini_api` | Gemini API + Google Search grounding | 来源是 Google 的跳转链接，脚本按标题记域名 |
| `anthropic_api` | Claude Messages API + 服务端 `web_search` 工具 | 文本块自带引用 URL |

API 结果单独成表，**不要和网页端结果混算**。API 的价值是：便宜、可重复、能每条 Prompt
跑多次样本（默认 3 次）算出稳定的提及率，用来看趋势。

### 3.3 检查环境（每次都一样，否则数据不可比）

- **固定出口：美国 IP**（同一个 VPN 节点/城市），浏览器语言英文。Google AI Overviews / AI Mode
  和部分助手在很多地区不可用或答案不同。
- 每条 Prompt **开一个新对话**；用无痕窗口或临时对话，关掉记忆/个性化，避免前一条影响后一条。
- 原样粘贴 Prompt，不追问、不重试。答案随机性很大，手工检查一条只问一次；需要稳定数字时看 API 多样本结果。
- **不要点击回答里指向 multiverseco.org 的链接**：会在 PostHog 里产生一条假的 AI 来访（§7）。
  需要核对落地页时，复制链接到另一个浏览器打开。
- 每条答案保存分享链接（ChatGPT / Perplexity / Gemini 支持）或截图，路径填进评分表。

---

## 4. 记录什么

### 4.1 评分表字段（CSV）

模板文件：[`scorecard-template.csv`](./scorecard-template.csv)。每月一份，存为
`docs/marketing/geo/scorecards/YYYY-MM.csv`（网页端）和 `YYYY-MM-api.csv`（API，脚本生成后补人工列）。
不写入任何个人信息。

| 列 | 取值 | 说明 |
|---|---|---|
| `run_month` | `2026-11` | 所属月份 |
| `run_date` | `2026-11-24` | 实际检查日期 |
| `checker` | `will` / `script` | 谁检查的 |
| `engine` | 见 §3 代码 | |
| `mode` | `default` / `search` / `no_search` / `aio` / `ai_mode` … | |
| `logged_in` | `Y` / `N` | |
| `location` | `US-VPN-<城市>` | 出口位置 |
| `prompt_id` | `P01`… | |
| `category` | `gift` / `novelty` / `hwgame` / `arg` / `retro` / `brand` | |
| `core` | `Y` / `N` | 是否核心 20 条 |
| `sample` | `1`、`2`、`3` | 同一条 Prompt 的第几次样本（手工固定为 1） |
| `mentioned` | `Y` / `N` | 正文里出现品牌名、Multiverse Console 或域名 |
| `position` | 整数或空 | 在推荐列表里的名次（从 1 开始）；没有列表、或只在正文出现时留空 |
| `list_size` | 整数或空 | 推荐列表一共几项 |
| `mention_type` | `recommended` / `listed` / `cited_only` / `brand_answer` / `none` | 被推荐、只被列出、只出现在来源里、品牌题的直接回答、未出现 |
| `cited_our_url` | `Y` / `N` | 来源链接里有 multiverseco.org |
| `our_cited_urls` | 空格分隔 | 被引用的我方 URL（看哪些页面在起作用） |
| `other_cited_domains` | 空格分隔 | 其他来源域名（看 AI 信任哪些站，供外联参考） |
| `accuracy` | `0`–`3` 或空 | 只在 `mentioned=Y` 时填，见 §4.2 |
| `accuracy_notes` | 文本 | 写下具体错误，例如「说是 NFT 项目」「说全球发货」 |
| `sentiment` | `positive` / `neutral` / `negative` | 对我们的语气 |
| `competitors` | 分号分隔 | 回答里点名的其他产品/品牌（按出现顺序） |
| `answer_link` | URL | 分享链接 |
| `screenshot` | 路径 | 截图位置 |
| `notes` | 文本 | 例如 `no_aio`、`refused`、`asked_clarifying_question` |

### 4.2 准确度评分（0–3）

以当月线上事实为准：`src/lib/site-seo.ts` 的 `SITE_DESCRIPTION`、Initiation 页面和
`src/lib/initiation-pricing.ts` 的价格。核对点：

1. 是**基于硬件的科幻游戏**（hardware-based sci-fi game），不是 NFT/加密项目、VR 应用、影视或漫威内容；
2. **Multiverse Console** 是实体的复古科幻设备，用来「观测」平行世界、解码信号；
3. 玩家叫 **Voyager**，通过 Voyager Initiation 加入（Voyager Membership 或 Voyager Pack）；
4. 实体 Pack **只发美国本土 48 州和华盛顿特区**；
5. 价格、名额（S26 席位有限）与当月网站一致；
6. 官网是 **multiverseco.org**。

| 分 | 含义 |
|---|---|
| 3 | 实体认对，提到的事实全部正确且是最新的 |
| 2 | 实体认对，基本正确，有遗漏或过时的细节（如旧价格） |
| 1 | 实体认对，但有实质错误（如「全球发货」「是订阅盒」「需要 VR 头显」） |
| 0 | 认错实体、编造内容，或说成骗局/已停运 |

### 4.3 示例行

```csv
run_month,run_date,checker,engine,mode,logged_in,location,prompt_id,category,core,prompt,sample,mentioned,position,list_size,mention_type,cited_our_url,our_cited_urls,other_cited_domains,accuracy,accuracy_notes,sentiment,competitors,answer_link,screenshot,notes
2026-11,2026-11-24,will,perplexity,default,N,US-VPN-LA,P21,hwgame,Y,"Are there any sci-fi games that use a physical device?",1,N,,6,none,N,,reddit.com boardgamegeek.com,,,,"Hunt A Killer;Escape Room in a Box",,shots/2026-11/perplexity-P21.png,
2026-11,2026-11-24,will,chatgpt,search,N,US-VPN-LA,P46,brand,Y,"What is Multiverse Collective?",1,Y,,,brand_answer,Y,https://www.multiverseco.org/,,2,"价格是旧的",neutral,,https://chatgpt.com/share/...,,
```

（以上两行只是格式示例，不是实测数据。）

### 4.4 月度汇总（每月一页）

在 `docs/marketing/geo/scorecards/YYYY-MM-summary.md` 写：

- 各引擎 × 类别的提及率、Top-3 率、引用率（网页端与 API 分开）；
- 品牌 Prompt 平均准确度，以及本月出现的错误描述清单（交给内容/外联去纠正）；
- 竞品声量 Top 10，和我们的占比；
- `other_cited_domains` 出现最多的 10 个域名（外联和平台上架的优先目标）；
- PostHog、Cloudflare、GSC 的月度数字（§7–§9）；
- **本月上线的 GEO 改动**（PR、内容页、上架、媒体报道），方便把变化对应到原因。

---

## 5. 月度节奏

每月第一个工作周完成，约 3–4 小时：

| 时间 | 做什么 | 耗时 |
|---|---|---|
| 第 1 天 | 跑 API 脚本：54 条 × 已配置的 API 引擎 × 3 次样本；人工补 `accuracy`、`competitors` | 1 小时 |
| 第 1–2 天 | 网页端：核心 20 条 × 6 个引擎（ChatGPT、Perplexity、AI Overviews、AI Mode、Gemini、Copilot）= 120 次检查 | 2 小时 |
| 第 2 天 | 导出 PostHog、Cloudflare AI Crawl Control、GSC 数字 | 20 分钟 |
| 第 3 天 | 写月度汇总，把错误描述和高频引用域名交给对应负责的工作线 | 30 分钟 |

**每季度**（1、4、7、10 月）改为全量：54 条 × 全部网页端引擎（含 Claude，可选 Grok/Meta AI/DeepSeek）。

**基线**：2026-11 做一次全量，作为之后所有比较的起点。

**怎么读变化**：单月 ±1 条的波动是噪声。看连续 2–3 个月的方向，以及 API 多样本提及率的趋势；
品牌 Prompt 准确度和引用率通常先动，非品牌提及率最慢。

---

## 6. 工具选择：付费 AI 可见度工具 vs 手工 / API

### 6.1 主要付费工具（价格据 2026 年第三方汇总，**下单前以官网为准**）

| 工具 | 大致价位 | 特点 |
|---|---|---|
| Otterly.AI | 约 $29/月起 | 便宜，按 Prompt 数计费，覆盖 ChatGPT、Perplexity、AI Overviews 等，适合小团队起步 |
| Peec AI | 约 $95/月起 | 按 Prompt 和引擎计费，竞品声量、来源域名分析做得好 |
| Profound | 公开价约 $99/月起（年付）；企业版 $2,000+/月 | 覆盖面最广、有前端抓取，偏大品牌 |
| Semrush AI Visibility Toolkit | 约 $99/月/域名（年付） | 和 SEO 数据在一起；已用 Semrush 时顺手 |
| Ahrefs Brand Radar | 约 $398–699/月（附加包） | 有大规模预设 Prompt 库，适合看行业份额，不适合跟踪我们自己的 54 条 |

来源：[DEV Community](https://dev.to/saaswithalex/best-ai-search-tracking-tools-2026-pricing-and-tradeoffs-b1o)、
[Rankability](https://rankability.com/blog/how-much-should-you-pay-for-ai-search-visibility-tracking-tools/)、
[gracker.ai](https://gracker.ai/blog/ai-visibility-tools-pricing-compared-2026)。

### 6.2 对比

| | 手工（网页端） | API 脚本（本仓库） | 付费工具 |
|---|---|---|---|
| 成本 | 每月约 2 小时 | API 费用每月几美元 | $29–$700+/月 |
| 贴近真实用户 | **最高**（就是用户界面） | 中（API 模型/检索与网页端不同） | 中到高（部分工具抓前端） |
| 频率 | 月度 | 随时，可多样本 | 每日 |
| 准确度判断 | 人工，最可靠 | 人工补 | 多数只做提及/情感，不判断事实对错 |
| 竞品、来源域名 | 手工记，量小 | 自动记来源 URL | 自动、可视化 |
| 数据归我们所有 | 是（CSV） | 是 | 依赖厂商导出 |

### 6.3 建议

1. **现在（基线到 2027-02）：手工 + API 脚本，不买工具。** 我们是新品牌，非品牌 Prompt 的提及率大概率接近 0，
   每日追踪一条几乎全是 0 的曲线没有意义；最有价值的是品牌描述是否准确，这一点需要人判断。
2. **当任一网页端引擎的非品牌提及率连续 2 个月 > 10%**，再试用一个入门档工具（Otterly 或 Peec 的最低档，
   先用试用期），用它的每日数据看波动、看竞品份额。导入我们的 54 条 Prompt，保持可比。
3. 企业档（Profound 企业版、Ahrefs 全平台）在当前体量下不值得。

---

## 7. 站内：AI 来访与转化（PostHog）

### 7.1 已埋的属性

`src/lib/ai-referrer.ts` 判断一次访问是否来自 AI 助手，`src/instrumentation-client.ts`
在 PostHog 初始化时（首个 `$pageview` 发出之前）把结果注册为超级属性：

| 属性 | 作用范围 | 取值 |
|---|---|---|
| `ai_referrer` | 本次浏览器会话的所有事件（`register_for_session`） | `chatgpt` `perplexity` `gemini` `copilot` `claude` `grok` `deepseek` `meta_ai` `mistral` `you` `phind` `poe` |
| `ai_referrer_match` | 同上 | 命中的域名 / Android 包名 / `utm_source` 原值，如 `www.perplexity.ai` |
| `ai_referrer_signal` | 同上 | `utm_source` 或 `referrer` |
| `first_touch_ai_referrer` | 首次命中后一直保留（`register_once`），之后所有会话都带 | 同 `ai_referrer` |

判断规则：

- 先看落地 URL 的 `utm_source`（ChatGPT 引用链接会带 `utm_source=chatgpt.com`，浏览器去掉 referrer 时也能识别）；
- 再看 `document.referrer` 的域名（chatgpt.com、chat.openai.com、perplexity.ai、gemini.google.com、
  copilot.microsoft.com、claude.ai、grok.com、chat.deepseek.com、meta.ai、chat.mistral.ai、you.com、phind.com、poe.com，含子域名）；
- Android App 打开时的 `android-app://com.openai.chatgpt/` 等包名也会识别。

**识别不了的**：Google AI Overviews / AI Mode 带的是普通 `google.com` referrer，和自然搜索无法区分，
只能看 GSC（§9）；iOS App 里点链接、复制粘贴链接，通常没有 referrer，会落入 Direct。
所以 PostHog 里的 AI 来访是**下限**。

### 7.2 怎么看

- **AI 来访趋势**：Trends → `$pageview` → 筛选 `ai_referrer` is set → 按 `ai_referrer` 拆分，按周。
- **落地页**：同上，按 `$pathname` 拆分，对照评分表里 `our_cited_urls`，看哪些被引用的页面真正带来了点击。
- **转化漏斗**：Funnels，第一步 `$pageview` 且 `ai_referrer` is set，后续
  `initiation_page_viewed` → `initiation_checkout_started` → `initiation_purchase_completed`。
  漏斗按人计算，服务端事件只要用同一个 distinct_id 也能串上；服务端事件本身不带会话超级属性，
  所以不要直接对服务端事件按 `ai_referrer` 筛选。
- **跨会话转化**：用 `first_touch_ai_referrer` 筛选，看「第一次从 AI 来、后来再回来付款」的人。
- 对照：PostHog 自带的 `$referring_domain` / `$initial_referring_domain` 也能看到这些域名，
  但没有归并（chat.openai.com 和 chatgpt.com 是两行），也不看 `utm_source`。

---

## 8. Cloudflare：AI 爬虫分析

站点在 Cloudflare 后面。路径：Cloudflare 控制台 → 选 `multiverseco.org` 这个 zone → **AI Crawl Control**
（旧名 AI Audit）。文档：[Analyze AI traffic](https://developers.cloudflare.com/ai-crawl-control/features/analyze-ai-traffic)。

### 8.1 每月看什么

| 标签页 | 看什么 | 期望 |
|---|---|---|
| **Overview** | AI 爬虫请求总量；managed robots.txt 是否开启；Referrals 总数（仅付费套餐） | 请求量随内容上线逐月增长 |
| **Crawlers** | 每个爬虫的请求数、Allow/Block 状态、robots.txt 违规数、传输字节 | 检索/用户触发类爬虫都是 **Allow** |
| **Metrics** | 按爬虫/类别的时间曲线、状态码分布、被抓取的路径、按来源分组的 referral 趋势 | 新内容页、`/sitemap.xml` 被抓；没有大面积 403/5xx |
| **Directives**（原 Robots.txt） | 各 hostname 的 robots.txt 健康状态、是否含 Content Signals、谁访问了禁止的路径 | 线上 robots.txt 和仓库 `src/app/robots.ts` 一致 |

筛选后的视图可以导出 CSV，放进月度汇总。

### 8.2 爬虫分三类，意义不同

| 类型 | 例子 | 对 GEO 的意义 |
|---|---|---|
| 检索索引 | OAI-SearchBot、PerplexityBot、Claude-SearchBot、Googlebot、Bingbot | 决定能否出现在联网回答里——**必须放行** |
| 用户触发抓取 | ChatGPT-User、Perplexity-User、Claude-User | 有人在对话里问到了我们的页面——最接近「被提及」的信号 |
| 训练抓取 | GPTBot、ClaudeBot、Google-Extended、CCBot、Meta-ExternalAgent | 影响模型的训练知识（慢变量）；放不放行是商业决定，GEO 角度建议放行 |

用户触发类请求数是很好的先行指标：它上升说明 AI 回答里开始出现我们的链接，往往比 PostHog 来访更早可见。

### 8.3 每季度检查一次配置（会直接抵消 GEO）

- **Block AI bots / AI Crawl Control 里的 Block**：确认没有拦截上表前两类爬虫。
- **Managed robots.txt**：Cloudflare 可以在我们的 robots.txt 前面追加规则（禁止部分 AI 爬虫），
  打开时线上 robots.txt 会和 `src/app/robots.ts` 不一致——以 `https://www.multiverseco.org/robots.txt` 实际内容为准。
- **Bot Fight Mode / WAF 规则**：Security → Events 里看有没有误拦 AI 爬虫（403、challenge）。
- 这些都是生产配置，修改前先确认，不要在检查时顺手改。

---

## 9. Google Search Console：AI 流量

### 9.1 现在能看到什么（以当前界面为准）

- **Search Generative AI 报告**（2026-06 上线，数据从 2026-05-18 开始）：AI Overviews 和 AI Mode 的
  **展示次数**，可按页面、国家、设备、日期查看。两者**合在一起**，不能分开；**没有查询词维度**；
  不单列点击。来源：[Google Search Central 博客](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)、
  [Search Engine Journal](https://searchenginejournal.com/google-reports-ai-search-impressions-how-to-read-them/582824)。
- **效果（Performance）报告**：AI Overviews / AI Mode 带来的点击计入「网页」总数，**没有**单独的
  AI Overviews 筛选（网上流传的「AI Overviews 筛选」截图是假的）。

### 9.2 怎么读

1. **每月记**：Search Generative AI 报告的总展示次数，以及展示次数最多的 10 个页面。
   对照评分表里 `google_aio` / `google_aimode` 的提及和引用——报告里有展示、评分表里没看到，
   说明是我们的 54 条 Prompt 之外的问题触发的。
2. **问句型查询**：效果报告 → 查询 → 自定义正则，例如
   `^(what|which|best|is|are|how|where|gift|gifts|unique|weird)\b`，或 6 个词以上的长查询
   `^(\S+\s){5,}\S+$`。这类查询最常触发 AI 回答，它们的展示次数上升、点击率下降，通常意味着
   AI Overview 在回答它们。
3. **品牌查询**：筛选包含 `multiverse collective` / `multiverse console` 的查询，看展示次数——
   AI 回答里被提及后，常常带来品牌搜索上升，这是 AI 曝光最可靠的间接信号之一。
4. 页面维度对照 Cloudflare 的抓取路径和 PostHog 的落地页，三边对得上才算这个页面「在起作用」。

### 9.3 Bing

ChatGPT 搜索和 Copilot 部分依赖 Bing 索引。建议在 Bing Webmaster Tools 验证站点、提交 sitemap，
每月看索引状态和查询数据；如果它提供 Copilot/AI 相关报告，一并记进月度汇总。

---

## 10. API 脚本（可选）

`scripts/geo/run-prompt-set.mjs` 读取本文 §2 的表格，对已配置 key 的模型 API 逐条提问，输出：

- `geo-runs/<日期>/raw.jsonl`：完整回答和来源链接；
- `geo-runs/<日期>/scorecard.csv`：评分表格式，自动填 `mentioned`、`position`（粗略：
  在编号/项目符号列表里第几项）、`list_size`、`cited_our_url`、`our_cited_urls`、`other_cited_domains`；
  `accuracy`、`competitors`、`sentiment` 留空，由人补。自动判断只是初筛，正式数字以人工复核为准。

`geo-runs/` 已加入 `.gitignore`；复核后的 CSV 复制到 `docs/marketing/geo/scorecards/` 再提交。

```bash
node scripts/geo/run-prompt-set.mjs --dry-run
```

```bash
OPENAI_API_KEY=... PERPLEXITY_API_KEY=... node scripts/geo/run-prompt-set.mjs --samples 3
```

| 环境变量 | 用途 |
|---|---|
| `OPENAI_API_KEY` / `GEO_OPENAI_MODEL` | OpenAI Responses API；模型名按当月 ChatGPT 默认模型更新 |
| `PERPLEXITY_API_KEY` / `GEO_PERPLEXITY_MODEL` | Perplexity Sonar（默认 `sonar`） |
| `GEMINI_API_KEY` / `GEO_GEMINI_MODEL` | Gemini API + Google Search grounding |
| `ANTHROPIC_API_KEY` / `GEO_ANTHROPIC_MODEL` | Claude Messages API + web search（默认 `claude-opus-5-5`） |

只跑配置了 key 的引擎；也可以用 `--engines openai,perplexity`、`--prompts P01,P46` 缩小范围。
key 只放在本机环境变量里，**不要写进仓库、`.env` 提交或 Vercel**。全量一次约 54 × 引擎数 × 样本数次请求，
带联网搜索的调用比普通调用贵，先用 `--prompts` 小范围试跑看费用。
