# Multiverse Collective — Press Fact Sheet (DRAFT)

> **Status: draft, not for distribution.** Part A is the press-facing sheet.
> Part B is internal: the repo source for each fact and the open questions that
> must be answered before Part A is sent. Delete Part B before you export Part A.
> Facts were checked against `main` @ `058d21b4` on 2026-11-20.

---

## Part A — Fact sheet (press-facing)

### What it is

Multiverse Collective is a hardware-based sci-fi game that brings the virtual
into reality. Voyagers claim a physical device, the Multiverse Console, to look
into different parallel worlds. This retro sci-fi device decodes signals, so
Voyagers can explore those worlds and try to change their course.

- **Website:** https://www.multiverseco.org
- **Join / buy:** https://www.multiverseco.org/voyager-initiation
- **Tagline:** Exploring parallel worlds, together
- **Category:** Toys & Games › Games (hardware-based sci-fi game)

### How the Console works

- The **left dial** sets the Frequency: different values tune into different
  parallel worlds. Near a world's frequency you catch a faint signal and a blurred
  image. With no signal, the screen shows static.
- The **right dial** switches between a world's preset observation angles
  (Bands). One of them, the Remarks Band, introduces the world and carries notices.
- Players **press and hold the Quantum Energy Button** to charge it, then send
  energy into the world they are watching. In some worlds, players can record
  their voice and send it with the energy.
- A transmission might bring a faint image into focus or change something on the
  other side. Voyagers share what they observe and investigate the results together.

### Prices and what's included (USD, one-time payment, not a subscription)

| Option | Price | Includes |
|---|---|---|
| Voyager Membership | **$12** | Member access to Mission Briefings, Parallax Array observations, Classified Intel and Member Votes. No physical Packs, no Console. |
| Initial Voyager Pack | **$38** | Membership plus Packs 1–2: a welcome letter, an exclusive Voyager badge, and an Antenna for the Multiverse Console. No Console. |
| Complete Voyager Pack | **$488** | Membership plus all four Packs, **including the Multiverse Console**. |
| Console + Pack 4 (upgrade for Initial Pack owners) | $460 | Adds the Console and Pack 4. Initial + upgrade totals $498; Complete upfront is $488. |

- A $12 Membership counts toward an upgrade: $26 more for the Initial Pack, or
  $476 more for the Complete Pack.
- Shipping and applicable taxes are included in the Pack prices.
- Accepting and carrying out missions requires a Console bound to the player's
  account. Members without a Console can read the full mission briefings.

### First release: S26

- S26 is the first Voyager Initiation release. It is **limited to 100 membership
  seats**. Every option, including the $12 Membership, uses one seat.
- 100 seats does not mean 100 Consoles. Device quantities are tracked separately.
- Further batches may open later with their own availability and schedules.

### Dispatch schedule (planned dispatch months, not guaranteed delivery dates)

| Pack | Planned dispatch |
|---|---|
| Pack 1 (welcome letter and Voyager badge) | October 2026 |
| Pack 2 (Antenna for Multiverse Console) | November 2026 |
| Pack 3 (Multiverse Console) | December 2026 |
| Pack 4 (contents to be announced) | January 2027 |

People who buy after a dispatch date get their earlier Packs sent together, and
the rest follow the schedule above.

### Shipping region

Physical Packs ship only to the **48 contiguous US states and Washington, DC**.
The $12 Membership needs no delivery address. At checkout the card is
authorized, then charged after the delivery region is verified. If the region
is not supported, the authorization is cancelled.

### Refunds

Unshipped Packs can be cancelled for a refund. Full terms:
https://www.multiverseco.org/terms/initiation

### Images

See "Image provenance" in Part B. Until real photographs exist, every image sent
to press is labelled **"Product rendering"** or **"Concept illustration"**.

### Contact

- **Press:** _[TBD: press address, see open question Q1]_
- **Customer support:** architect@multiverseco.org

---

## Part B — Internal: sources and open questions (do not send)

### B1. Where each fact comes from

| Fact | Source |
|---|---|
| Canonical description, site URL, tagline | `src/lib/site-seo.ts`: `SITE_DESCRIPTION`, `SITE_URL`, `SITE_TAGLINE` |
| Product category `Toys & Games > Games` | `src/lib/site-seo.ts`: `initiationProductJsonLd` |
| Console controls: left dial / Frequency, right dial / Band, Remarks Band, Quantum Energy Button with press-and-hold charging, voice in some worlds, static with no signal | `docs/device-reference/console-operations.zh.md` §1–§4; `src/app/voyager-initiation/faq.ts` "What is the Multiverse Console?" |
| "A transmission might bring a faint image into focus…" | `src/app/voyager-initiation/faq.ts` |
| Prices $12 / $38 / $488 / $460 | `src/lib/initiation-pricing.ts`: `INITIATION_PRICES` |
| Contents of each option | `src/lib/site-seo.ts`: `OFFER_DESCRIPTIONS`; `src/app/voyager-initiation/faq.ts` `MEMBERSHIP_FAQ_GROUPS` |
| Pack 1 = welcome letter + badge; Pack 2 = Antenna | `src/app/voyager-initiation/initiation-view.tsx` `packs`; `src/lib/antenna-copy.ts` |
| Upgrade math: $26 / $476 / $498 vs $488 | `faq.ts` "Can I upgrade later?" |
| One-time payment, not a subscription | `faq.ts` "Is this a subscription?" |
| Shipping and taxes included | `faq.ts` "Where do you ship?" |
| Missions require a bound Console | `faq.ts` "Can I take part in missions without a Console?" |
| 100 seats; Membership uses a seat | `src/lib/initiation-types.ts` `INITIATION_CAPACITY = 100`; `faq.ts`; `initiation-view.tsx` "Batch S26" dialog |
| 100 seats is not 100 devices | `src/lib/device-membership-copy.ts` "Does S26 mean 100 available devices?" |
| Further batches may open | `initiation-view.tsx` "Batch S26" dialog |
| Dispatch months; catch-up dispatch; not guaranteed delivery dates | `faq.ts` "When will my packs ship?" |
| Contiguous US + DC; card authorized, then charged | `faq.ts`; `src/lib/site-seo.ts` `SHIPPING_REGION` |
| Unshipped Packs refundable | `faq.ts`; `/terms/initiation` |
| Support email | `src/lib/device-purchase-terms.ts` `DEVICE_SUPPORT_EMAIL` |

### B2. Image provenance (none of these are photographs of a finished unit)

| File | What it is | Can it go to press? |
|---|---|---|
| `public/assets/device-console.jpg` (1280×1023) | Console rendering, used in the Product JSON-LD | Yes, labelled "Product rendering". The resolution is too low for print or a hero image. |
| `docs/device-reference/originals/01-latest-front-left.jpg` (1702×1276) | Latest front-left view and the reference for the design's structure. **Unclear whether it is a photo or a rendering** | Only after Q5 is answered |
| `docs/device-reference/originals/02-front-right-render.jpg`, `03-rear-render.jpg` | Original renderings | Yes, labelled "Product rendering" |
| `public/assets/voyager-initiation/console-multiview-portrait.png` | Multi-view composite. The alt text says "Kyoto workshop" | Labelled "Product rendering" |
| `public/assets/voyager-initiation/pack-1-workbench.webp` | ImageGen edit based on a real Pack 1 photo supplied by the user (SHA in the README) | **Send the original photo, not the edit**: it is the only real photo |
| `public/assets/voyager-initiation/antenna-still-life-v1.jpg` | ImageGen illustration of three Antenna design studies. Final appearance and quantity are unconfirmed | Only labelled "Concept illustration — final design may differ" |
| `public/assets/console-intro/scene.webp`, `device.png` | ImageGen workshop scene and cut-out | Labelled "Concept illustration" |
| `public/assets/voyager-initiation/fourth-delivery.png`, `classified-archive.png` and others | ImageGen concept images | Not recommended for press |
| `public/assets/how-it-works-20261106.mp4`, `device-reel-v2-20261016.mp4` | Operation videos (provenance in the corresponding docs) | Only after Q6 is answered |

### B3. Open questions (in Chinese; must be answered before Part A is sent)

**发送前必须回答**

1. **Q1 媒体联系邮箱**：用 `architect@multiverseco.org`，还是新开 `press@multiverseco.org`？谁回复、承诺几个工作日内回复？
2. **Q2 发言人和创始人故事**：对外用真名，还是用世界观内的身份 “The Architect”？可以公开的创始人背景（为什么做这个、团队几个人、在哪里）、一句可引用的话、是否接受采访和视频露脸（之前定过的规矩是变声不配本人脸）。仓库里没有创始人故事，本文没有自己编。
3. **Q3 公司主体**：对外署名的法律实体名称和所在城市。terms 和 privacy 页面都没有写。
4. **Q4 送礼流程**：现在没有礼品选项（礼品留言、送货地址填收礼人、礼品卡或兑换码）。账号和 Console 都绑定在购买人的邮箱上，收礼人怎么激活和认领？礼物导购最先问的就是这个，这个问题不解决，“送礼”角度就不能主推。
5. **Q5 产品实拍**：`01-latest-front-left.jpg` 是照片还是渲染？有没有能上手、能拍照的 Console 工程样机或量产机？什么时候能拍正面、侧面、旋钮特写、手持比例和开箱这一组照片？
6. **Q6 视频素材**：`how-it-works` 和 `device-reel` 视频里哪些是实拍、哪些是生成或合成的？能不能作为 B-roll 给媒体？
7. **Q7 Console 屏幕上到底是什么**：对科技媒体要能用一两句话说清楚（不破坏世界观也行，但不能误导）。设备需要 Wi‑Fi、App 或账号吗？怎么供电？尺寸和重量多少？内容从哪来？平行世界的画面是实时的吗？
8. **Q8 圣诞前能不能送到**：现在下单，Packs 1–2 补发通常几天内寄出？12 月那批 Console 有没有可能在 12/25 前送到？如果不能保证，文案只能写 “planned December dispatch”。
9. **Q9 名额现状和售罄预案**：S26 现在还剩几个名额？对外说 “100 seats” 时，要不要说明其中包括赠送名额和剧情角色名额？名额卖完以后，礼物指南的链接指向哪里（候补名单或下一批）？
10. **Q10 评测机**：能不能从 12 月那批里留 3–5 台给媒体？评测机算不算进 100 个名额？需要寄回吗？媒体账号能不能用不占名额的角色授权？参见 `05-media-outreach.zh.md` 第 6 节。
11. **Q11 Membership 是否在线**：`INITIATION_MEMBERSHIP_ENABLED` 在生产环境开着吗？Pitch 里写 “from $12” 之前要确认。

**可以晚一点再回答**

12. Antenna 的最终外观和数量是否已经确认，Pack 2 现在能不能实拍？
13. Pack 4 的内容是否继续对媒体保密（保密本身可以做成卖点）？
14. 要不要做媒体专用的落地页或带 UTM 的链接，好统计每家媒体带来的流量（和 geo-measurement 会话对齐）？
