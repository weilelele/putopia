# GEO 06 · 第三方平台上架评估与文案

更新：2026-11-20。范围：评估第三方平台能否、是否值得为 Multiverse Collective 建立长期可抓取的页面，供 ChatGPT、Perplexity、Gemini、Google AI Mode 在回答“novelty products / sci-fi products / sci-fi games / novelty toys / novelty gifts”类问题时引用。

本文只是文档。**没有创建任何账号、没有接受任何条款、没有提交任何上架。** 每一个平台的注册、条款确认和提交都需要用户本人决定并操作。

## 0 仓库事实基线

所有对外文案只能使用下列事实。价格或权益变化时，先改仓库，再改第三方页面。

| 事实 | 内容 | 来源 |
| --- | --- | --- |
| 统一定义 | Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. | `src/lib/site-seo.ts` `SITE_DESCRIPTION` |
| 口号 | Exploring parallel worlds, together | `SITE_TAGLINE` |
| Voyager Membership | $12，一次性付款；Mission Briefings、Parallax Array 观测提交、Classified Intel、Member Votes；无实体 Pack，无 Console 领取权 | `src/lib/initiation-pricing.ts`、`MEMBERSHIP_FAQ_GROUPS`、`/terms/initiation` |
| Initial Voyager Pack | $38，一次性；会员权益 + Packs 1–2（欢迎信、徽章、Antenna）；**不含 Console** | `INITIATION_PRICES.initial`、`OFFER_DESCRIPTIONS` |
| Complete Voyager Pack | $488，一次性；会员权益 + Packs 1–4，含 Multiverse Console | `INITIATION_PRICES.standard` |
| 升档 | Membership → Initial $26，Membership → Complete $476，Initial → Console + Pack 4 $460；Complete 直购比 Initial + 升档省 $10 | `faq.ts`、`/terms/initiation` |
| 席位 | 每个选项（含 $12 Membership）占用 100 个 S26 席位之一；升档沿用原席位。2026-11-19 发布记录：已占 90 席 | `/terms/initiation`、`docs/releases/voyager-membership-20261118.zh.md` |
| 发货 | 仅美国本土 48 州及 DC；不含阿拉斯加、夏威夷、属地、军邮；运费与适用税已含在价内 | `/terms/initiation` |
| S26 发货月份 | Pack 1 2026-10；Pack 2（Antenna）2026-11；Pack 3（Console）2026-12；Pack 4 2027-01。是计划发货月，不是保证到货日 | `faq.ts` |
| Antenna | 收藏型徽记及装饰性接收配件，须装在 Console 上才能接收信号；外观与数量待定 | `/terms/initiation` |
| 任务 | 会员可阅读 Mission Board 全部简报；接受并执行任务需要已绑定账号的 Console | `faq.ts` |
| 退款 | 未发出的 Pack 可退至原支付方式；$12 Membership 退款即关闭会员并释放席位；按付款平均分摊到 Pack | `/terms/initiation#refunds` |
| 联系 | architect@multiverseco.org | `/terms/initiation` |
| 公开页面 | `/voyager-initiation`、`/console`、`/intel`、`/worlds`、`/worlds/live`、`/devices`、`/voyagers`、`/voyager-pack` | `src/app/sitemap.ts` |

**与任务简报不一致之处。** 简报写“结账目前走站内 Stripe，另有 Shopify guest-checkout 试点”。仓库显示：Shopify 正式结账代码已合并（`src/lib/shopify-live-checkout.ts`、`INITIATION_SHOPIFY_LIVE_ENABLED`，店铺 `jtuuus-k3.myshopify.com`），四个会员相关 Shopify 商品以 **Unlisted** 状态保存在 Headless 渠道，`shopify-guest-pilot.ts`／`shopify-bundle-pilot.ts` 只在本地开发环境生效。生产实际开启哪条结账路径，以 Vercel 环境变量为准（见第 6 节问题 2）。这不改变本文结论：所有第三方页面都应**把购买导回 multiverseco.org**，不在第三方平台成交。

## 1 决策总表

GEO 价值指第三方页面被 AI 搜索引用、并把 Multiverse Collective 放进 sci-fi game / novelty gift 类别的可能性。“渠道冲突”指第三方成交绕过站内 100 席预留、账号绑定和逐包退款逻辑。

| 平台 | 资格（按官方规则） | 成本 | 工作量 | GEO 价值 | 主要风险 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| **Crunchbase** | 公司实体资料，不涉及商品政策 | 预计免费（官方支持页本次抓取 403，待核实） | 低：1–2 小时 | 中：AI 引擎常用它确认“这家公司是谁” | 法人名称、成立时间、地点须真实；不可夸大融资 | **立即做**（第 3.3 节） |
| **Gadget Flow** | 接受非众筹的电商产品，免费提交生成“永久产品页”，但免费不保证被推荐 | 免费；付费推广 $2,499／$3,499／$4,999 | 中：需 4–5 张 1600×900 无文字生活照 + 至少 1 段产品视频 | 中高：gadget / gift 语境，正好是目标查询词 | 素材必须真实可信；页面价格须与站内同步；席位售罄后页面过时 | **有实拍素材后立即提交**（第 3.2 节） |
| **Product Hunt** | 可以发布；但“Hardware（除非有显著数字部分）”不进首页推荐，且“只推荐当前可用的产品”，waitlist 不推荐 | 本次阅读的官方页未列发布费用 | 中高：素材 + 当天全程值守 | 高：发布页长期存在、被大量转引；我们有 $12 纯数字会员和公开 Intel / Worlds，可主张“显著数字部分” | 席位剩约 10 个，发布当天售罄则不再“可用”；不得拉票；NPC 账号不得参与 | **在新一批席位开放时发布**（第 3.1、第 4 节） |
| **Wikidata** | 三项知名度标准满足其一即可，其中“可用严肃且公开的来源描述”；公司官网可作非自夸性事实来源；有偿编辑须披露 | 免费 | 低 | 中高：知识图谱实体，AI 用于消歧 | 目前缺少独立报道，条目可能被提删；自建条目有利益冲突 | **等至少 2 篇独立报道后再建**（配合 PR 外联） |
| **Kickstarter** | 硬件项目须展示可工作原型视频，**禁止写实渲染图**；生成式 AI 不能成为主要创作来源，须披露 | 成功后 5% + 支付处理约 3–5% | 高：完整众筹项目 | 中：项目页长期存在 | 现有设备图多为 AI 辅助，不符合；产品已在站内销售；与席位模式冲突 | **本季不做**；下一代 Console 或新季需要众筹时再评估 |
| **Indiegogo** | InDemand 已改名 Late Pledge（众筹后阶段），也开放给外部众筹项目；2025 年被 Gamefound 收购 | 5% 平台费 + 3% + $0.20／笔 | 高 | 低中 | 没有先行众筹，适用性不明；与站内结账冲突 | **不做** |
| **Shopify Catalog → ChatGPT 等** | Basic 方案满足“Starter 及以上”；但商品**不能是 Unlisted**、店铺不能有密码；须完成三项政策页并接受补充条款 | 无渠道费，只付支付手续费 | 高：需改结账架构 | 高（ChatGPT 购物卡片） | **ChatGPT 买家在 Shopify 结账，购物车没有站内席位预留号，现有对账在找不到 `_putopia_live_reservation` 时直接跳过（`shopify-live-reconciliation.ts` `reconcileOrder`）**：付款但无席位、无会员，或超卖 100 席 | **现在不开**；先解决席位门控（第 2 节） |
| **Etsy** | 只允许 made / designed / handpicked / sourced 四类；**服务一般不允许**；OEM/ODM/白牌不算生产伙伴 | 上架 $0.20；成交 6.5%；美国支付处理 3% + $0.25；Offsite Ads 15%（年销 <$10k 可退出） | 中 | 中（Etsy 商品可在 ChatGPT、Gemini、Google AI Mode、Copilot 内购买，仅限美国买家） | 会员是数字访问权益，属服务；Console 生产方式未确认；第三方成交与席位冲突 | **本季不做**；未来可考虑独立周边（第 2 节） |
| **Amazon** | 需 GTIN 或豁免；Brand Registry 需已注册或申请中的商标；Toys & Games 每年 Q4 有卖家门槛（2026 年细则未核到） | Professional $39.99／月 或 $0.99／件；Toys & Games 佣金 15% | 很高 | 中 | 会员+硬件+席位+账号绑定无法在 Amazon 标准商品页表达；只发 48 州 | **不做** |
| **AlternativeTo** | 定位是“软件替代品”目录 | 免费 | 低 | 低 | 类别不符，可能被拒或误分类 | **不做** |
| **BoardGameGeek** | 官方页本次 403，规则未核实 | — | — | 可能中（“游戏”实体） | 是否收录电子硬件游戏未知 | 列为待查（第 6 节问题 11） |

## 2 推荐顺序与理由

1. **Crunchbase（现在）。** 零渠道冲突，只描述公司。先把实体信息统一，后面所有平台都引用同一套名称和描述。
2. **Gadget Flow 免费提交（实拍素材就绪后）。** 官方要求至少比期望开始日提前 30 天提交，FAQ 建议 3–4 周。页面是永久产品页，语境就是 gadget 和礼物。只提交免费版，先看收录效果，再决定是否付费。
3. **Product Hunt（新一批席位开放时）。** S26 只剩约 10 席。Product Hunt 只推荐“当前可用”的产品，发布当天售罄会同时伤害推荐资格和访客体验。建议等下一季或扩容开放、Membership 公开入口确认开启后，用 30 天预约窗口排期。
4. **Wikidata（有独立报道后）。** 依赖 PR 外联的产出。建条目时只写可由独立来源核实的事实，并在用户页披露关系。
5. **Shopify Catalog（需工程方案，单独立项）。** 要让 ChatGPT 购物卡片可用，至少需要：商品改为非 Unlisted、店铺公开；ChatGPT 进入的 Shopify 商品页必须先把买家送回 multiverseco.org 预留席位，或者在 Shopify 结账端增加席位门控；退款与 100 席上限逻辑同步覆盖。在此之前，保持现有 Unlisted 状态，并在 Shopify 后台 **Sales channels → Agentic** 确认当前资格与开关状态。另一条路是向 OpenAI 申请直接提交商品 feed（目前是申请/候补制），把 `url` 指回站内、`is_eligible_checkout=false`；这部分归 shopping-feeds 方向处理。
6. **Kickstarter（未来）。** 只适合下一代 Console 或新季的众筹。前提是有真实原型实拍视频，不能用写实渲染或 AI 生成图代替。
7. **Etsy（未来，可选）。** 只有在推出可独立售卖、由我们原创设计的实体周边（例如徽章、Antenna 复刻）时才考虑，且须按“designed by a seller”申报生产伙伴；不得把会员或席位放上 Etsy。
8. **Amazon、AlternativeTo、Indiegogo：不做。**

### Etsy 资格的逐项判断

| Etsy 类别 | 官方定义要点 | 本产品是否符合 |
| --- | --- | --- |
| Made by a seller | 卖家亲手或用 3D 打印、CNC、Cricut 等工具制作 | Console 不是这样生产的（生产方式待确认），不符合 |
| Designed by a seller | 卖家原创设计，由第三方生产伙伴按设计“从头到尾”生产，须在商品页披露 | **仅在** Console／周边是我们的原创设计、由合同制造商按我们规格生产时可能符合；若是 OEM/ODM 或白牌改标，属于转售，可致封店 |
| Handpicked | 20 年以上古董、自然物、精选合集 | 不符合 |
| Sourced | 激发买家创意的材料，如手工材料、派对装饰、个性化商品 | 不符合 |
| 服务 | “In general, services … are not allowed” | $12 Membership 和会员权益属于数字访问服务，不符合 |

结论：S26 的三种选项都不能如实上架 Etsy。

## 3 前三名平台的英文上架稿

以下文案可直接粘贴。方括号内是填写前要确认的项目。若 $12 Membership 的公开入口未开启，删除所有提到 Membership 的句子。

### 3.1 Product Hunt

字段上限来自 Product Hunt 官方指南：名称 40 字符，tagline 60，描述 500，maker comment 5,000，launch tags 最多 3 个。

**Name**（21 字符）

```
Multiverse Collective
```

**Tagline**（58 字符）

```
A hardware-based sci-fi game for exploring parallel worlds
```

**Description**（450 字符）

```
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. Join online from $12, one-time, or get the Console in the $488 Complete Voyager Pack. Seats are limited each season. Packs ship to the contiguous US.
```

**Link**：`https://www.multiverseco.org/voyager-initiation?utm_source=producthunt&utm_medium=launch`（直链，不用短链；UTM 命名与 geo-measurement 方向统一。）

**Launch tags**（最多 3 个，在表单里从现有列表中选最接近的）：Games · Hardware · Science fiction / Entertainment

**Pricing**：Paid。（公开 Intel 和 Worlds 可免费浏览，但核心产品付费；选“Free options”容易让访客误解。）

**Promo code**：不设。站内价格和退款分摊都按固定价计算，没有折扣机制。

**Maker comment**（首条评论）

```
Hi Product Hunt 👋

Multiverse Collective is a hardware-based sci-fi game. The idea: what if you owned a real device that could look into parallel worlds?

That device is the Multiverse Console, a retro sci-fi console with two dials and a Quantum Energy Button. The left dial tunes the Frequency to find a world. The right dial switches between that world's observation Bands. Hold the button to charge, then send energy into the world you are watching. Near a world's Frequency you catch faint signals; with no signal you get static.

Around the device sits an online game. Voyagers read Mission Briefings, submit observations through the Parallax Array, follow Classified Intel and vote on what the Collective does next. Carrying out missions needs a Console bound to your account.

How to join (all one-time payments, no subscription):
• Voyager Membership, $12: online member access, no physical Packs.
• Initial Voyager Pack, $38: member access plus Packs 1–2 (a welcome letter, badge and the Antenna). No Console.
• Complete Voyager Pack, $488: member access plus all four Packs, including the Multiverse Console.

Each season has a fixed number of seats. Packs ship to the 48 contiguous US states and Washington, DC, with shipping and taxes included.

You can browse public Intel and the Worlds without an account: https://www.multiverseco.org/intel

We'd love your feedback. What would you want to observe in a parallel world?
```

**Gallery**（官方建议 1270×760，至少 1 张，3 张以上更好；首图最重要）

| 顺序 | 内容 | 现有来源 | 发布前检查 |
| --- | --- | --- | --- |
| 1 | Console 正面，桌面环境 | `public/assets/device-console.jpg` 或新实拍 | 来源与 AI 辅助状态见 `docs/device-reference/manifest.json`；优先换成量产实拍 |
| 2 | 左右旋钮与中央圆屏特写，屏上显示一个世界 | `docs/device-reference/screen-variants` | 与 `console-operations.zh.md` 一致：左旋钮 Frequency，右旋钮 Band |
| 3 | 网页端 Intel／Mission Briefing 截图（手机竖屏） | 生产站截图 | 截图中不得出现真实用户个人信息 |
| 4 | Pack 1 开箱（欢迎信、徽章） | Pack 1 已于 10 月发出，需实拍 | 只拍我们自己的样品 |
| 5 | Antenna | `docs/product/antenna-media-20261022.md` 的桌面静物 | 该图为设计方向，注明外观待定，或等实物照片 |
| 视频 | 30–60 秒设备操作短片 | `public/assets/how-it-works-20261106.mp4`、`device-reel-v2-20261016.mp4` | 先核对素材来源记录 |

**Logo**：240×240，取 `public/icons/icon-512-maskable.png` 缩放（已在 Shopify Membership 商品图使用的同一原始品牌资产）。

**常见问答**（用于当天回复评论，内容与站内 FAQ 一致）

- *Is this a subscription?* No. Each option is a one-time payment with no recurring membership fee.
- *Do I need the Console to play?* Members can read all Mission Briefings, submit Parallax Array observations, follow Intel and vote. Accepting and carrying out missions requires a Console bound to your account.
- *Where do you ship?* The 48 contiguous US states and Washington, DC. Shipping and applicable taxes are included. The $12 Membership needs no address.
- *When does the Console ship?* For the current season, the Console is planned for December 2026 and Pack 4 for January 2027. These are planned dispatch months, not guaranteed arrival dates. [按发布时的季节更新]
- *Can I upgrade later?* Yes. Your $12 Membership is credited toward an upgrade: $26 to Initial or $476 to Complete.
- *Refunds?* Unshipped Packs are refundable to the original payment method. Details: https://www.multiverseco.org/terms/initiation#refunds

### 3.2 Gadget Flow（免费提交）

Gadget Flow 以实物为主，因此主推 Complete Voyager Pack（含 Console）。

**Product name**

```
Multiverse Console · Complete Voyager Pack
```

**Brand**：Multiverse Collective

**Tagline**

```
A retro sci-fi console that looks into parallel worlds, part of a hardware-based sci-fi game
```

**Price**：$488（Complete Voyager Pack）；另注明 “Online membership from $12; Initial Voyager Pack $38 without the Console.”

**Product URL**：`https://www.multiverseco.org/voyager-initiation?utm_source=gadgetflow&utm_medium=listing`

**Description**

```
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course.

The Console has a central round screen flanked by two vertical capsule screens, silver knurled dials on each side and an orange top piece. Turn the left dial to tune the Frequency and find a world; near the right Frequency you catch faint signals, and with no signal you see static. Turn the right dial to switch between that world's observation Bands. Hold the Quantum Energy Button to charge, then send energy into the world. Some worlds also accept a recorded voice message sent with the energy.

The Complete Voyager Pack is a one-time purchase that includes Voyager membership and all four Packs: a welcome letter and badge, the Antenna for the Console, the Multiverse Console itself and a final Pack. Members read Mission Briefings, submit Parallax Array observations, follow Classified Intel and vote with the Collective. A Console bound to your account lets you accept and carry out missions.

Seats are limited each season. Packs ship to the 48 contiguous US states and Washington, DC, with shipping and applicable taxes included.
```

**Category**：在表单里选 Toys & Games 或 Gaming 中最接近的一项（Gadget Flow 分类列表本次未核实）。

**Tags**

```
sci-fi gadget, retro sci-fi device, hardware-based sci-fi game, sci-fi game, novelty gift, unique gift for sci-fi fans, parallel worlds, multiverse, desk gadget, collectible
```

（前 8 个与 `SITE_KEYWORDS` 一致；“desk gadget”“collectible”为补充词，若不想扩展可删去。）

**FAQ**

- *What is the Multiverse Console?* A physical piece of sci-fi hardware built for the Collective's fieldwork. Use its dials to tune into parallel worlds and switch between observation angles, and send quantum energy into a world.
- *Is it a subscription?* No. The Complete Voyager Pack is a one-time payment.
- *What else is in the Pack?* Voyager membership and four Packs: a welcome letter and badge, the Antenna, the Console and a final Pack.
- *Can I start without the Console?* Yes. Membership starts at $12 one-time, and the $38 Initial Voyager Pack adds Packs 1–2. Initial Pack members can add Console + Pack 4 later for $460.
- *Where does it ship?* The 48 contiguous US states and Washington, DC.

**Images**（官方要求 4–5 张 1600×900 高清生活照，**不得有文字叠加**，外加至少 1 段产品视频）

1. Console 在书桌上的正面实拍
2. 旋钮与屏幕特写
3. 手持或操作中的 Console（只用已授权出镜的人）
4. Complete Voyager Pack 全部内容平铺
5. Antenna 装在 Console 顶部（实物到位后）
6. 视频：现有操作短片，或量产实拍

### 3.3 Crunchbase（公司资料）

Crunchbase 没有 FAQ 字段，下列内容对应组织资料页的主要字段。字数上限以表单为准。

**Organization name**：Multiverse Collective

**Legal name**：[待确认，见问题 5]

**Website**：`https://www.multiverseco.org`

**Short description**（123 字符）

```
Multiverse Collective is a hardware-based sci-fi game where Voyagers use the Multiverse Console to explore parallel worlds.
```

**Full description**

```
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course.

Members join through one-time options: Voyager Membership for online access, the Initial Voyager Pack with physical Packs, or the Complete Voyager Pack including the Console. Each season has a limited number of seats, and physical Packs ship within the contiguous United States.
```

**Industries**：Video Games · Consumer Electronics · Toys · Gaming（从 Crunchbase 下拉列表选最接近的 3–4 项）

**Headquarters**：[待确认]

**Founded date**：[待确认]

**Founders / team**：[待确认是否公开个人姓名]

**Contact email**：architect@multiverseco.org

**Social links**：[待补充官方账号]

**Logo**：`public/assets/logo.png`

## 4 Product Hunt 发布日计划

### 前提条件（全部满足再排期）

- 新一批席位已开放，且剩余数量足够覆盖发布当天的流量；Membership 公开入口在生产开启。
- 实拍素材就绪，所有图片和视频有来源记录。
- 站内 `/voyager-initiation` 在 390×844 手机竖屏下检查无误。
- geo-measurement 方向已确认 `utm_source=producthunt` 能在分析中单独看到。

### 时间

Product Hunt 每天 12:01 AM（太平洋时间）开始，到当天午夜结束。2026-11 至 2027-03-14 为太平洋标准时间（UTC−8），对应**北京时间当天 16:01 开始，次日 16:00 结束**；夏令时期间提前 1 小时。可提前 1–30 天排期，排期后可改日期。

### 时间线

| 时间 | 事项 |
| --- | --- |
| T−30 天 | 用户本人账号建草稿（草稿不审核）；准备上面的名称、tagline、描述、gallery、logo、maker comment |
| T−14 天 | 定日期；确认席位数与发货月份；把文案中的季节信息改成当时的事实 |
| T−7 天 | 通知现有 Voyagers、newsletter 订阅者和团队：告诉他们发布日期，**请他们留下反馈和评论，不请他们点赞** |
| T−1 天 | 再核对价格、席位、发货月份；准备评论回复用的问答 |
| T 日 16:01（北京时间） | 页面上线后立即发 maker comment；检查链接、图片和价格 |
| T 日 16:00–24:00 | 每条评论 1 小时内回复；在自有渠道（站内 newsletter、官方社交账号）分享发布链接 |
| T 日 24:00–次日 08:00 | 太平洋时间白天时段；安排值守或设置提醒，持续回复 |
| T 日全程 | 每 2 小时查看一次剩余席位；若售罄，在 maker comment 下补充说明并更新页面描述 |
| T+1 天 | 在 PR 稿和站内“Press”或类似位置引用发布页链接（是否在站内加链接由用户决定） |
| T+7 天 | 按 UTM 统计访问与转化，记入 GEO 测量 |

### 禁止事项（来自官方规则）

- 不请人点赞，不买票，不做与点赞挂钩的抽奖，不用小号或额外账号。
- **NPC 账号不得在 Product Hunt 评论或点赞。** NPC 是站内虚构角色，在外部平台发言既违反“no fake accounts”，也违背 NPC 身份只在站内界面披露的规则。
- 不在从未活跃过的社区刷发布链接。
- 两个月内再发布需要申请，且必须有重大更新；不换 URL 规避。

## 5 风险与对应

| 风险 | 对应 |
| --- | --- |
| 第三方页面价格过时 | 本文第 0 节为唯一事实表；站内价格或季节变化时，按清单逐个更新 Crunchbase、Gadget Flow、Product Hunt |
| 席位售罄后页面仍在引流 | 文案统一写“Seats are limited each season”，不写剩余数量；售罄期间页面保持，站内显示售罄状态 |
| 第三方成交绕过席位 | 本文推荐的三个平台都只链接回站内，不在平台成交 |
| 素材被认定为渲染或 AI 生成 | Product Hunt 和 Gadget Flow 用实拍；Kickstarter 明确禁止写实渲染 |
| 虚构叙事被当作虚假宣传 | 对外描述以 `SITE_DESCRIPTION` 为准；操作描述以 `console-operations.zh.md` 为准；不写“真实观测平行宇宙”之类的事实性断言 |
| 利益冲突编辑（Wikidata） | 等独立报道；如自己编辑，在用户页披露 |

## 6 待确认问题

1. **席位与下一季。** S26 当前剩余多少席？下一季或扩容何时开放？这决定 Product Hunt 和 Gadget Flow 的时间。
2. **生产结账与 Membership 开关。** 生产环境 `INITIATION_SHOPIFY_LIVE_ENABLED`、`INITIATION_MEMBERSHIP_ENABLED` 是否已开启？简报写站内 Stripe，仓库显示 Shopify 正式结账已就绪。
3. **Shopify 店铺状态。** 店铺是否仍设密码？**Sales channels → Agentic** 当前显示什么资格？商品保持 Unlisted 的前提下不会进入 Catalog，请确认这是有意的。
4. **Console 生产方式。** 是我们原创设计、合同制造商按规格生产，还是基于 OEM/ODM 改造？影响 Etsy 资格和 Kickstarter 叙述。
5. **公司信息。** 法人名称（运营文档提到 “MultiverseCo, Inc.” 作为开户选项，未确认）、成立日期、所在地、是否公开创始人姓名。
6. **实拍素材。** 是否有 Pack 1 开箱、Console 原型或量产实拍？现有设备库主要是原图渲染和 AI 辅助图。
7. **商标。** “Multiverse Collective”或 Console 外观是否已申请商标？（Amazon Brand Registry 和长期品牌保护都需要。）
8. **Product Hunt 账号。** 由谁的个人账号作为 maker 发布？团队里还有谁列为 maker？
9. **公开 Intel 截图。** 用于 gallery 的 Intel、Worlds 截图是否可公开？截图中的 NPC 内容是否需要按 NPC 规则审核？
10. **Gadget Flow 付费推广。** 免费页上线后，是否考虑 $2,499 起的付费套餐？建议先看免费页效果。
11. **BoardGameGeek。** 官方页本次无法访问。是否值得人工核对其对电子硬件游戏的收录规则？
12. **Wikidata 时机。** 由 PR 外联方向确认首批独立报道后再建。

## 7 来源（2026-11-20 访问）

- Product Hunt：[Featuring guidelines](https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines) · [Unreleased products](https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product) · [Pick your launch date](https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date) · [Build your product page](https://help.producthunt.com/en/articles/17834537-4-build-your-product-page) · [Promote and what to avoid](https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid) · [Relaunch](https://help.producthunt.com/en/articles/17734411-7-relaunch-your-product)
- Etsy：[What can I sell on Etsy?](https://help.etsy.com/hc/en-us/articles/360024112614-What-Can-I-Sell-on-Etsy) · [Production partners](https://help.etsy.com/hc/en-us/articles/360000336547-Working-with-Production-Partners-on-Etsy) · [Fee basics](https://help.etsy.com/hc/en-us/articles/360035902374) · [Payment processing fees](https://help.etsy.com/hc/articles/115015628847) · [Offsite Ads](https://help.etsy.com/hc/articles/360000338367) · [Purchasing Etsy items through ChatGPT, Gemini, Google AI Mode and Copilot](https://help.etsy.com/hc/en-us/articles/34208252828695-Purchasing-Etsy-Items-Through-ChatGPT-Gemini-Google-AI-Mode-and-Copilot)。Creativity Standards、Prohibited Items、Fees 法律页本次抓取 403，未核实。
- Shopify：[Shopify Catalog requirements](https://help.shopify.com/en/manual/shopify-catalog/requirements) · [Agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts) · [ChatGPT](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/chatgpt)
- OpenAI：[ChatGPT merchants](https://chatgpt.com/merchants) · [Commerce docs](https://developers.openai.com/commerce) · [Product feed spec](https://developers.openai.com/commerce/specs/file-upload/products.md)
- Gadget Flow：[Marketing plans & pricing](https://thegadgetflow.com/submit/)
- Kickstarter：[Hardware and product design rules](https://help.kickstarter.com/en-us/articles/16236428-what-are-the-rules-for-hardware-and-product-design-projects) · [AI-generated content](https://help.kickstarter.com/en-us/articles/16236759-can-i-use-ai-generated-content-in-my-project) · [Fees](https://help.kickstarter.com/en-us/articles/16236674-what-are-the-fees)
- Indiegogo：[Platform upgrade](https://help.indiegogo.com/article/645-what-changed-with-the-platform-upgrade)
- Amazon：[Pricing](https://sell.amazon.com/pricing) · [Brand Registry](https://sell.amazon.com/brand-registry) · [Registration guide](https://sell.amazon.com/sell/registration-guide)。Toys & Games 2026 年 Q4 卖家门槛未在官方页核到。
- Wikidata：[Notability](https://www.wikidata.org/wiki/Wikidata:Notability) · [Verifiability](https://www.wikidata.org/wiki/Wikidata:Verifiability) · [Disclosure of paid editing](https://www.wikidata.org/wiki/Wikidata:Disclosure_of_paid_editing)
- AlternativeTo：[About](https://alternativeto.net/about/)
- 仓库：`src/lib/site-seo.ts` · `src/lib/initiation-pricing.ts` · `src/app/voyager-initiation/faq.ts` · `src/app/terms/initiation/page.tsx` · `src/lib/shopify-live-reconciliation.ts` · `src/lib/shopify-live-order.ts` · `docs/releases/voyager-membership-20261118.zh.md` · `docs/releases/voyager-membership-completion-20261119.zh.md` · `docs/device-reference/console-operations.zh.md`
