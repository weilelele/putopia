# GEO 03 · 视频与 YouTube：让 AI 回答引擎看得到我们的视频

> 状态：草案（2026-11-20）。本文只做规划和元数据准备。**没有上传任何视频，也没有创建频道或账号**；上传由 Will 按文末清单操作。
> 相关：PR weilelele/putopia#337（站点基础 SEO，`SITE_DESCRIPTION` 的出处）、本 PR（Intel 与 /devices 的 `VideoObject` 结构化数据）。

## 0. 结论

1. **先上 YouTube 的是 2 条长视频**：「How the Multiverse Console works」（1:17，现成 1080p）和「Voyager Orientation Reel 01」（1:37，现成 540p）。这两条讲清楚了设备怎么用、我们是什么，最适合回答 “sci-fi gadget / retro sci-fi device / sci-fi game for adults” 这类问题。
2. **第 3 条是完整版 Orientation**（2:42，含 Will 露脸自我介绍），要不要放由 Will 决定（见 §3.3）。**第 4 条 Reel 03** 等定稿后再上。
3. **Shorts 先做 5 条**，素材全部来自现有片段，但都要重新剪成 9:16 竖版（§4）。
4. 每条视频的标题、描述、章节、标签都已备好（§3），可直接粘贴。描述里放了**完整旁白文字稿**，字幕文件（.srt）在 `docs/marketing/geo/captions/`。
5. 站内：本 PR 给 Intel 视频帖和 /devices 页加了 `VideoObject` JSON-LD，包括 name、description、thumbnailUrl、uploadDate、contentUrl、duration，已知视频还带 transcript。

为什么做 YouTube：多项 AI 引用研究里，YouTube 和 Reddit 都是被引用最多的来源，YouTube 在 Google AI Mode 和 AI Overviews 里尤其突出。AI 读视频主要靠**标题、描述、字幕/文字稿和章节**，画面本身读得很少。所以我们的重点是把这几样写清楚：用 plain facts 说出品类（hardware-based sci-fi game、retro sci-fi device、gift for sci-fi fans），在片子里保留世界观。

---

## 1. 现有视频清单

时长和分辨率用 `ffprobe` 量过。字幕时间轴由 orientation-reel 的剪辑表（EDL）直接算出，算出的总时长与渲染文件相差不到 20 ms，可以确认 EDL 在渲染之后没有改动。

| # | 文件 | 时长 | 规格 | 声音 | 现在用在哪 | 处理 |
|---|---|---|---|---|---|---|
| V1 | `~/Sites/orientation-reel/out/how-it-works-1080p.mp4`（站内版 `public/assets/how-it-works-20261106.mp4` 640×480） | 1:17 | 1920×1080，画面为 4:3 居中 | 伪装旁白 + 烧录字幕 | /devices「How it works」弹窗 | **上 YouTube（第 1 条）**；拆 2 条 Shorts |
| V2 | Intel **INT-640135** 视频（360p，11.8 MB）；母版 `out/reel01-540p.mp4` | 1:37 | 960×540 | 伪装旁白 + 烧录字幕 | Intel 帖「Voyager Orientation, Reel 01: What We Are and the Console」 | **上 YouTube（第 2 条）**；建议先渲 1080p（§5 E1）；拆 1 条 Short |
| V3 | `out/reel-v3-1080p.mp4`（Remotion `Reel`） | 2:42 | 1920×1080 | 伪装旁白；**Will 露脸部分是原声** | 未发布 | **待 Will 决定**（露脸、个人履历） |
| V4 | `out/reel03-draft-540p.mp4`（Remotion `Reel03`，v0.4） | 1:07 | 960×540，画面为 4:3 | 伪装旁白 + 字幕 | 未发布（草稿） | **定稿后再上**；元数据已备好 |
| V5 | `out/reel-device-1080p.mp4`（Remotion `ReelDevice`，TTS 旁白） | 2:25 | 1920×1080 | TTS 旁白 | 未发布 | **暂不上**：和 V2 内容重复，规则部分会被 Reel 02 取代；规则段用了 wide 机位，可能有 Will 的脸配非本人声音（违反声音原则），需要先核查 |
| C1 | `public/assets/device-reel-wasteland-20261021.mp4` | 0:20 | 1280×720 | **无声** | /devices 首屏、onboarding（`DEVICE_REEL`） | **Short S1**（要竖版 + 补音效） |
| C2 | `public/assets/device-reel-v2-20261016.mp4` | 0:20 | 1920×1080 | 有声 | /dev 预览、briefing 海报 | **Short S2**（要竖版） |
| C3 | `public/assets/voyager-briefing/console-unboxing.mp4` | 0:11 | 540×540 | 无声 | Initiation briefing | **Short S5 备选**（分辨率低，最好找母版） |
| C4 | `voyager-briefing/console-film.mp4`、`console-reel.mp4`、`console-press.mp4`、`london-device.mp4` | 5–20 s | ≤960 宽 | 无声 | Initiation briefing 循环背景 | 不单独上（太短，或与 C1/C2 重复） |
| C5 | `public/assets/device-reel.mp4` | 0:38 | 1280×720 | 无声 | /demo、投资人 deck | **不上**：2026-05 的早期原型，外观和现在的 Console 不一致 |
| — | `out/reel01-reaction-preview-v*-540p.mp4`、`trial-*`、`reel-preview-*`、`Multiverseco_Orientation.mp4` | — | — | — | — | 中间稿或旧版，不纳入 |

Intel 里目前只有 **INT-640135** 一条帖子带 `video_url`（2026-11-20 用公开 anon key 只读查询）。

**需要 Will 确认的事实（影响 YouTube 的 “Altered or synthetic content” 申报）**：C1、C2、C3、C4 是实拍、CG 渲染，还是 AI 生成？如果画面是写实风格、但设备本身或场景是生成或渲染的，上传时要勾选 *Altered or synthetic content = Yes*，描述里也不能写成 “real footage”。§3 和 §4 的文案没有写 “real footage” 或 “filmed”，两种情况都适用。

---

## 2. YouTube 频道设置

| 项 | 值 |
|---|---|
| 频道名 | **Multiverse Collective** |
| Handle | 首选 `@multiverseco`（和域名一致），备选 `@multiversecollective` |
| 头像 | `public/assets/vi-icon.png`（橙色标志，深蓝底） |
| 横幅 | 2560×1440，安全区 1546×423：深蓝 `#080C20` 底，橙色 `#E35205` wordmark（`vi-wordmark.png`），下面一行 Courier Prime 灰白字 `Exploring parallel worlds, together`。不要加渐变、发光或 CRT 效果（遵守 design-system） |
| 国家/地区 | United States |
| 默认上传语言 | English（标题、描述、字幕都是英文） |
| 默认分类 | Gaming（备选 Entertainment）。不要在 “Game title” 里关联其他游戏 |
| 默认字幕认证 | “This content has never aired on television in the U.S.” |
| 频道预告片（给未订阅者） | V1「How the Multiverse Console works」 |
| 精选栏目 | ① 播放列表 *Voyager Orientation Tapes* ② 播放列表 *Multiverse Console Shorts* |

### 2.1 About / Description（直接粘贴）

```
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course.

This channel is the Collective's tape archive: orientation tapes on how the Console works, short clips of Voyagers tuning into parallel worlds, and field reports from the worlds we watch.

Voyager Packs arrive by mail, about one a month; the Complete Voyager Pack includes the Multiverse Console. It's a sci-fi game that lives on your desk, and a gift for sci-fi fans who want the story to arrive at their door. Physical Packs ship to the 48 contiguous US states and Washington, DC.

Become a Voyager: https://www.multiverseco.org/voyager-initiation
```

第一段逐字照搬 `SITE_DESCRIPTION`，请勿改写；网站、YouTube 和其他平台用同一句话，AI 才会把它们认作同一个实体。“about one a month” 来自 Reel 03 的 “Four packs. About one a month.”。只有 Complete Voyager Pack 含 Console（Initial 只含 Pack 1–2，Membership 不含实体 Pack），所以第三段不写 “joining gets you a Console”。各方案的说法以 `initiationDescription()` 和 Initiation 页为准。

### 2.2 Links（频道 → Customization → Basic info → Links）

| 标题 | URL |
|---|---|
| Multiverse Collective | https://www.multiverseco.org |
| Become a Voyager | https://www.multiverseco.org/voyager-initiation |
| The Multiverse Console | https://www.multiverseco.org/devices |
| Intel: field reports | https://www.multiverseco.org/intel |

其他平台（Reddit、Instagram 等）开通后再补，和兄弟会话 geo-reddit-community、geo-platform-listings 的结果对齐。

### 2.3 频道关键词（Settings → Channel → Keywords）

```
"Multiverse Collective" "Multiverse Console" "hardware-based sci-fi game" "sci-fi game" "retro sci-fi device" "sci-fi gadget" "gift for sci-fi fans" "novelty gift" "parallel worlds" multiverse "VHS"
```

### 2.4 播放列表

- **Voyager Orientation Tapes**：*Archival VHS orientation tapes for new Voyagers of Multiverse Collective, a hardware-based sci-fi game. How the Multiverse Console works, what the Collective is, and the rules of observation.* 顺序：V2 → V1 → (V3) → (V4)
- **Multiverse Console Shorts**：*Short clips of the Multiverse Console, the retro sci-fi device in Multiverse Collective, tuning into parallel worlds.*

---

## 3. 长视频元数据（逐条，可直接粘贴）

通用规则：
- 标题前 60 个字符就要出现 **Multiverse Console** 或 **Multiverse Collective**，再加一个品类词。
- 描述前两行是 plain facts，因为这是 YouTube 折叠前、也是 AI 摘要最常截取的部分；世界观的口吻放在后面。
- 章节：第一条必须是 `00:00`，至少 3 条，每条 ≥ 10 秒（下面已按这个规则合并过）。
- 描述里放完整文字稿。片子里的字幕是烧在画面上的，伪装后的声音也会让 YouTube 自动字幕出错，文字稿是 AI 唯一可靠的文本来源。
- 字幕：Subtitles → Add language → English → Upload file → *With timing* → 选对应的 `.srt`。
- 链接带 UTM 参数，方便 geo-measurement 归因；如果兄弟会话定了别的 UTM 规则，以它为准。
- 标签总长 < 500 字符。YouTube 对标签的权重很低，标签主要用来纠正拼写变体。

### 3.1 V1 · How the Multiverse Console works（第 1 条，频道预告片）

- 上传文件：`~/Sites/orientation-reel/out/how-it-works-1080p.mp4`（1080p，112 MB）
- 字幕：`docs/marketing/geo/captions/v1-how-the-console-works.en.srt`
- 缩略图：截 `00:24`（FIG. 1 — FREQUENCY 标注 + 设备）的帧，左上加 Courier Prime 大字 `HOW THE CONSOLE WORKS`（橙 `#E35205` 底、深蓝字）。也可以直接用站内海报 `how-it-works-20261106-poster.jpg` 的同一帧
- 播放列表：Voyager Orientation Tapes
- 片尾画面：最后 5 秒没有可用空档（片尾是 “RETURN THIS TAPE TO THE ARCHIVE.” 字卡），**不加片尾元素**，改用置顶评论放链接

**Title**
```
How the Multiverse Console Works | Retro Sci-Fi Device Orientation Tape
```

**Description**
```
How the Multiverse Console works: the retro sci-fi device at the centre of Multiverse Collective, a hardware-based sci-fi game. The left dial finds a parallel world, the right dial chooses where you watch it from, and the quantum button sends energy across.

This is an archival orientation tape for new Voyagers. Each frequency on the Console belongs to a world. Come close to the right number and shapes begin to surface. The band dial selects the fixed points from which that world may be watched. Hold the quantum button for three seconds and something is sent across. What happens next depends on the world.

▶ Become a Voyager: https://www.multiverseco.org/voyager-initiation?utm_source=youtube&utm_medium=video&utm_campaign=v1_how_it_works
▶ The Multiverse Console: https://www.multiverseco.org/devices
▶ Field reports: https://www.multiverseco.org/intel

Chapters
00:00 Opening tape
00:15 Fig. 1 — The frequency dial
00:42 Fig. 2 — The band dial
00:52 Fig. 3 — The quantum button
01:03 What happens next

Transcript
This is the Multiverse Console. It will live in your home.
This one is the frequency dial. Every frequency is a parallel world that exists.
Close to the right number, you will see shapes. On it, you may see a certain place.
And this one — the band dial. It chooses where, in that world, it watches from.
And this — the quantum energy button. Hold it. Wait.
What will happen next depends on the world.
End of orientation. Stay on the frequency.

About Multiverse Collective
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. A sci-fi game that lives on your desk, and a gift for sci-fi fans. Physical Packs ship to the 48 contiguous US states and Washington, DC.

#SciFi #Multiverse #RetroTech
```

**Tags**
```
Multiverse Console, Multiverse Collective, how it works, hardware-based sci-fi game, sci-fi game, retro sci-fi device, sci-fi gadget, retro tech, parallel worlds, multiverse, gift for sci-fi fans, novelty gift, sci-fi gift, VHS, orientation tape, Voyager
```

**置顶评论**
```
New Voyager? Start here: https://www.multiverseco.org/voyager-initiation. Which frequency did you land on first? Leave it below. Rule three: write down everything.
```

### 3.2 V2 · Voyager Orientation Reel 01（第 2 条）

- 上传文件：最好先渲 1080p（§5 E1）；不渲的话就传 `out/reel01-540p.mp4`（YouTube 会标成 SD，不影响被收录）
- 字幕：`captions/v2-orientation-reel-01.en.srt`
- 缩略图：标题卡帧（Intel 封面用的就是 14.6 s 那一帧），左上加 `REEL 01 · WHAT WE ARE`
- 片尾画面：从 01:32 起是 “NEXT REEL: RULES OF OBSERVATION” 字卡，可以在这里放 *Subscribe* 和 *V1* 两个片尾元素
- 和 Intel 的关系：Intel 帖 INT-640135 保留站内直传（Will 之前的决定）。YouTube 版上线后，可以在 Intel 帖评论区放 YouTube 链接，但正文不动（AGENTS.md 规定不能悄悄改旧帖）

**Title**
```
Voyager Orientation Reel 01: What We Are | Multiverse Collective Sci-Fi Game
```

**Description**
```
Orientation tape for new Voyagers of Multiverse Collective, a hardware-based sci-fi game that brings the virtual into reality. Part one explains what the Collective is; part two shows the Multiverse Console, the retro sci-fi device Voyagers keep at home to look into parallel worlds.

"If this tape has reached you, you were noticed." Reel 01 covers the Collective's single purpose — to find the worlds beside this one, and to watch them — and the Console's three controls: the frequency dial, the band dial and the quantum energy button. Reel 02, on the rules of observation, is being prepared.

▶ Become a Voyager: https://www.multiverseco.org/voyager-initiation?utm_source=youtube&utm_medium=video&utm_campaign=v2_reel01
▶ Read this reel's Intel dispatch: https://www.multiverseco.org/intel/INT-640135

Chapters
00:00 Opening tape
00:15 Chapter one — What we are
00:41 Chapter two — The Console: the frequency dial
01:08 The band dial and the quantum button
01:27 End of orientation

Transcript
Welcome, Voyager.
If this tape has reached you, you were noticed.
The Multiverse Collective existed for many years for only one purpose: to find the worlds beside this one — and to watch them.
Not imagine them. Watch them.
So from today, you are part of the work.
This is the Multiverse Console. It will live in your home.
This one is the frequency dial. Every frequency is a parallel world that exists.
Close to the right number, you will see shapes. On it, you may see a certain place.
And this one — the band dial. It chooses where, in that world, it watches from.
And this — the quantum energy button. Hold it. Wait.
What will happen next depends on the world.
End of orientation. Stay on the frequency.

About Multiverse Collective
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. A gift for sci-fi fans. Physical Packs ship to the 48 contiguous US states and Washington, DC.

#SciFi #Multiverse #VHS
```

**Tags**
```
Multiverse Collective, Multiverse Console, Voyager Orientation, Reel 01, hardware-based sci-fi game, sci-fi game, retro sci-fi device, sci-fi gadget, parallel worlds, multiverse, VHS, found footage style, orientation tape, gift for sci-fi fans, novelty gift
```

### 3.3 V3 · 完整版 Orientation（含 Handler 自我介绍）—— 待 Will 决定

这条片子的价值最高，**因为它带出了一个真人和可以核实的履历**：“Before the Collective, I made games at NetEase and hardware at ByteDance... A game with a million daily players. A device that sold two million units.” AI 引擎在推荐时会参考 “谁做的、可不可信”，这段话能直接回答这个问题。

**发布前要确认**：
1. Will 是否愿意在 YouTube 公开露脸，并公开具名的前雇主？
2. 履历数字是否可以对外公开、能否站得住（“million daily players”“two million units”）？
3. 声音原则：这版剪辑里露脸的部分都是原声（`clean`），伪装声只出现在设备和空镜画面上，符合原则。CHAPTER THREE 开头两句（“A handler has been assigned to you. / You will be listening to him —”）用的是伪装声，画面是设备特写，需要 Will 再看一眼，确认这两句的画面里没有他的脸。

- 上传文件：`out/reel-v3-1080p.mp4`（1080p）
- 字幕：`captions/v3-orientation-full-handler.en.srt`

**Title**
```
Meet Your Handler: Full Voyager Orientation Tape | Multiverse Collective Sci-Fi Game
```

**Description**
```
The full orientation tape for new Voyagers of Multiverse Collective, a hardware-based sci-fi game that brings the virtual into reality: what the Collective is, how the Multiverse Console works, who your handler is, and the four rules of observation.

The Multiverse Console is a retro sci-fi device that Voyagers keep at home. It decodes signals from parallel worlds; Voyagers explore those worlds and try to change their course. In this tape your handler, Will, introduces himself: before the Collective he made games at NetEase and hardware at ByteDance.

▶ Become a Voyager: https://www.multiverseco.org/voyager-initiation?utm_source=youtube&utm_medium=video&utm_campaign=v3_full_orientation

Chapters
00:00 Opening tape
00:15 Chapter one — What we are
00:41 Chapter two — The Console
01:27 Chapter three — Your handler
01:59 Chapter four — Rules of observation

Transcript
Welcome, Voyager.
If this tape has reached you, you were noticed.
The Multiverse Collective existed for many years for only one purpose: to find the worlds beside this one — and to watch them.
Not imagine them. Watch them.
So from today, you are part of the work.
This is the Multiverse Console. It will live in your home.
This one is the frequency dial. Every frequency is a parallel world that exists.
Close to the right number, you will see shapes. On it, you may see a certain place.
And this one — the band dial. It chooses where, in that world, it watches from.
And this — the quantum energy button. Hold it. Wait.
What will happen next depends on the world.
A handler has been assigned to you. You will be listening to him —
I'm Will. Before the Collective, I made games at NetEase and hardware at ByteDance. A game with a million daily players. A device that sold two million units. But I thought that was boring.
Only after I joined the Collective did I find this machine — a special device. I have to find more people to work with me, together, to find different worlds.
Rule one. Their time runs with ours. What you miss does not come back.
Rule two. You will never see all of it. Other Voyagers who hold these devices will see what you cannot.
Rule three. Write down everything. Write down every frequency you have found in the device.
Rule four. If the light turns red — it means they may be looking back at our world.
End of orientation. Stay on the frequency.

About Multiverse Collective
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. A gift for sci-fi fans. Physical Packs ship to the 48 contiguous US states and Washington, DC.

#SciFi #Multiverse #VHS
```

**Tags**
```
Multiverse Collective, Multiverse Console, Voyager Orientation, rules of observation, hardware-based sci-fi game, sci-fi game, retro sci-fi device, sci-fi gadget, parallel worlds, multiverse, indie game developer, hardware startup, VHS, gift for sci-fi fans
```

文字稿说明：画面上 Rule three 是用字卡标出的，口播里没有说 “Rule three.”，SRT 也是这样。上面的描述文字稿补上了 “Rule three.”，方便阅读。

### 3.4 V4 · Voyager Orientation Reel 03: The Initiation（定稿后再上）

草稿 v0.4（2026-11-17），1:07。片子里有 Initiation 方案卡（Initial / Complete）。**描述里不要写价格**，价格会变，链接到 Initiation 页就行。定稿后要重新跑一遍字幕（§6），再核对下面的章节时间。片子里说 “There are two ways in”（Initial / Complete），但 #332 之后 Initiation 页还多了 Voyager Membership。如果 Membership 在发布时仍然开放，描述里要补一句 “or Voyager Membership without physical Packs”，或者先改片子，避免描述和页面对不上。

- 字幕（草稿）：`captions/v4-orientation-reel-03-draft.en.srt`

**Title**
```
What Arrives When You Join: Four Packs and the Multiverse Console | Orientation Reel 03
```

**Description**
```
What a new Voyager receives in Multiverse Collective, a hardware-based sci-fi game: four physical Packs by mail, about one a month — a letter and badge, the Antenna, the Multiverse Console (a retro sci-fi device), and a sealed fourth Pack. Choose the Initial Pack (the first two) or the Complete Pack (all four). Either way, you are a Voyager.

▶ See the Initiation options: https://www.multiverseco.org/voyager-initiation?utm_source=youtube&utm_medium=video&utm_campaign=v4_reel03

Chapters
00:00 Opening tape
00:15 The Initiation: four Packs, about one a month
00:26 Figures 1–4: letter and badge, Antenna, Console, sealed Pack
00:47 Two ways in: Initial or Complete

Transcript
This tape concerns your Initiation.
Once initiated, things began to arrive.
Four packs. About one a month.
Figure one. A letter. And your badge.
Figure two. The Antenna. On a Console, it listens for one kind of signal.
Figure three. The Multiverse Console. Your Multiverse Console.
Figure four. Sealed. Even this tape cannot say what is inside.
There are two ways in. The Initial pack. The first two. The Complete pack. All four.
Either way, you are a Voyager.
End of orientation. Stay on the frequency.

About Multiverse Collective
Multiverse Collective is a hardware-based sci-fi game that brings the virtual into reality. Voyagers claim a physical device, the Multiverse Console, to look into different parallel worlds. This retro sci-fi device decodes signals, so Voyagers can explore those worlds and try to change their course. A gift for sci-fi fans. Physical Packs ship to the 48 contiguous US states and Washington, DC.

#SciFi #Unboxing #Multiverse
```

**Tags**
```
Multiverse Collective, Multiverse Console, what's in the box, sci-fi subscription box, hardware-based sci-fi game, retro sci-fi device, sci-fi gadget, gift for sci-fi fans, novelty gift, sci-fi gift, unboxing, parallel worlds
```

---

## 4. Shorts 计划

现有片段全是横版（16:9 或 4:3），**每条都要剪成 9:16 竖版**（§5 E2）。竖版版式统一如下：1080×1920 画布，深蓝 `#080C20` 底，原画面按宽度铺满并居中；上方用 Courier Prime 写一行世界观标题（橙色），下方写一行 plain fact（灰白）：`Multiverse Console · a hardware-based sci-fi game`。不加渐变、发光或 CRT 边框。烧录字幕保留原样。

每条 Short 在 *Related video* 里关联对应的长视频。描述只写 2 到 3 行，第一行就是 plain fact。

| # | 素材 | 片段 | 时长 | 新剪辑 | Title（直接粘贴） | 关联长视频 |
|---|---|---|---|---|---|---|
| S1 | C1 wasteland | 全片 | 0:20 | 竖版 + **补音效**（原片无声；用 orientation-reel 的 `sfx/static.wav` → `tune.wav` → `lock.wav`） | `Tuning a retro sci-fi device into a parallel world` | V1 |
| S2 | C2 v2 forest | 全片 | 0:20 | 竖版 | `Hold the button for three seconds. Something is sent across.` | V1 |
| S3 | V1 | 00:15–00:42 | 0:27 | 竖版 | `The frequency dial: every frequency is a parallel world` | V1 |
| S4 | V1 | 00:42–01:12 | 0:30 | 竖版 | `The band dial and the quantum button on the Multiverse Console` | V1 |
| S5 | V2 | 00:00–00:41 | 0:41 | 竖版 | `If this tape has reached you, you were noticed.` | V2 |
| 备选 | C3 unboxing | 全片 | 0:11 | 竖版；540p 太低，要找母版 | `Unboxing the Multiverse Console` | V4 |
| 以后 | V4 定稿 | 00:15–00:47 | 0:32 | 竖版 | `What arrives when you join a hardware-based sci-fi game` | V4 |

**Shorts 描述模板**（替换第二行）：
```
The Multiverse Console is the retro sci-fi device in Multiverse Collective, a hardware-based sci-fi game about looking into parallel worlds.
<S1> A Voyager turns the frequency dial until static resolves into a world.
<S2> Hold the quantum button for three seconds and energy is sent across. What happens next depends on the world.
<S3> Come within a few tenths of the right number and shapes begin to surface.
<S4> The band dial chooses where in that world you watch from; the quantum button sends energy across.
<S5> Welcome, Voyager. The Collective exists for one purpose: to find the worlds beside this one, and to watch them.
Become a Voyager: https://www.multiverseco.org/voyager-initiation
#SciFi #Multiverse #RetroTech
```
Shorts 描述里的链接不能点击，但 AI 和搜索引擎会读到。真正能点的入口是 *Related video* 和频道主页链接。

**Shorts 标签**（通用）：
```
Multiverse Console, Multiverse Collective, retro sci-fi device, sci-fi gadget, hardware-based sci-fi game, sci-fi game, parallel worlds, gift for sci-fi fans, novelty gift, shorts
```

Reel 02（Rules of Observation，Will 要拍新素材）出来以后，四条规则各做一条 Short，这是最好的系列 Short 素材。在此之前，**不要用 V5 的规则段剪 Short**（见 §1 的声音原则）。

---

## 5. 需要新剪辑或新渲染的视频

全部属于重任务：**一次只跑一个**，Remotion `--concurrency` ≤ 2，不要用 `&` 或 `nohup`，用 Bash 工具的 `run_in_background`。全局 `render-guard.py` 会拦截违规命令，不要绕开它。

| # | 内容 | 方式 | 是否必须 |
|---|---|---|---|
| E1 | Reel 01 渲染 1080p 母版（给 YouTube 用） | `cd ~/Sites/orientation-reel && npx remotion render Reel01 out/reel01-1080p.mp4 --concurrency=2` | 建议做；不做就上传 540p |
| E2 | S1–S5 竖版 | 先渲 1080p 横版母版（V1 已有；V2 用 E1；C1、C2 用原文件），再用 ffmpeg 加竖版底版，见下方命令。上下两行文字最好在 Remotion 里加一个 `ShortVertical` 合成来做，字体更准确 | 做 Shorts 就必须做 |
| E3 | S1 补音效 | 在 E2 的 Remotion 合成里叠 `sfx/static.wav`、`tune.wav`、`lock.wav` | S1 必须 |
| E4 | Reel 03 定稿后渲 1080p | `npx remotion render Reel03 out/reel03-1080p.mp4 --concurrency=2` | V4 上线前 |
| E5 | 缩略图（1280×720） | 单帧截图不算重任务：`ffmpeg -ss 24 -i out/how-it-works-1080p.mp4 -frames:v 1 thumb-v1.png`，再在设计工具里加字 | 建议做 |

最简单的竖版命令（只有画面、不加文字，**一次跑一条**）：
```bash
ffmpeg -ss 15 -to 42 -i ~/Sites/orientation-reel/out/how-it-works-1080p.mp4 -vf "scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:color=0x080C20" -c:v libx264 -preset medium -crf 20 -threads 4 -c:a aac -b:a 160k ~/Sites/orientation-reel/out/short-s3.mp4
```

本次会话**没有做任何重编码**。新剪辑需要 Will 先确认竖版版式，所以留作下一步。

---

## 6. 字幕文件怎么来的、怎么重新生成

`captions/*.srt` 不是听写出来的，而是用 orientation-reel 的 EDL（`src/edl.ts`、`edl-how-it-works.ts`、`edl-reel03.ts`）里的 `captions` 时间轴直接算出来的，和片子里烧录的字幕逐字一致。Reel 03 定稿或任何 EDL 改动之后，都要重新生成：

```ts
// 存成 scratchpad/gen.ts，然后在 ~/Sites/orientation-reel 下运行：
// node_modules/.bin/esbuild <scratchpad>/gen.ts --bundle --platform=node --outfile=<scratchpad>/gen.cjs && node <scratchpad>/gen.cjs
import {TL, TL01, FPS} from '/Users/will/Sites/orientation-reel/src/edl';
import {TLH} from '/Users/will/Sites/orientation-reel/src/edl-how-it-works';
import {TLR3} from '/Users/will/Sites/orientation-reel/src/edl-reel03';
const ts = (fr: number) => { const ms = Math.round(fr / FPS * 1000); const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
for (const [name, tl] of Object.entries({reel01: TL01, full: TL, howItWorks: TLH, reel03: TLR3})) {
  const caps: {start: number; end: number; text: string}[] = [];
  for (const c of [...tl.captions].sort((a, b) => a.start - b.start)) {
    const last = caps[caps.length - 1];   // 同一句被剪成几段时合并
    if (last && last.text === c.text && c.start - last.end < FPS) last.end = c.start + c.dur;
    else caps.push({start: c.start, end: c.start + c.dur, text: c.text});
  }
  console.log(`=== ${name} (${tl.total / FPS}s)\n` + caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));
}
```

核对方法：算出的 `tl.total / FPS` 要和渲染文件的 `ffprobe` 时长一致（误差 < 0.05 s）。如果不一致，说明 EDL 在渲染之后改过，要先重新渲染，或者改用当时的 EDL。

---

## 7. 站内结构化数据（本 PR）

- 新模块 `src/lib/video-seo.ts`：`videoObjectJsonLd`、`devicesPageVideosJsonLd`、`intelVideoJsonLd`、`isoDuration`。它从 `site-seo.ts` 引入 `SITE_URL`、`SITE_DESCRIPTION`，但没有修改 `site-seo.ts`。
- **/devices**：两个 `VideoObject`，分别是首屏的 Console 演示（`DEVICE_REEL`）和 “How it works” 片子（带 transcript）。页面没有设备批次时首屏不播视频，这时只输出 “How it works” 一条。
- **/intel/[id]**：新增服务端 `layout.tsx`，只对**非机密、且有 `video_url`** 的帖子输出 `VideoObject`。name 用帖子标题；description 用正文首段加 `SITE_DESCRIPTION`；thumbnailUrl 依次取视频封面、第一张图、Console 海报；uploadDate 用 `timestamp`。已知的上传文件（目前是 INT-640135）还会带 duration 和 transcript。表按文件 URL 对应，换了视频文件就自动失效。
- 已知限制：Google 只给 “视频是页面主体” 的页面展示视频富结果。/devices 的视频是首屏背景加一个弹窗，可能拿不到视频缩略图。但结构化数据仍然会被抓取，AI 引擎也能用来理解页面。Intel 帖子更接近 watch page。上线后到 Search Console → *Videos* 报告看收录情况。

### 上传 YouTube 之后的代码跟进（另开 PR）

1. 在 `organizationJsonLd()` 里加 `sameAs: ['https://www.youtube.com/@multiverseco']`。这需要修改 `site-seo.ts`，等 #337 合并后再做。
2. 给 `SITE_VIDEOS` 和 Intel 视频加上 `embedUrl: https://www.youtube.com/embed/<id>`，把站内文件和 YouTube 视频关联起来。
3. 站内继续用自托管视频，不换成 YouTube 嵌入：加载更快，世界观也不会被 YouTube 的界面打断。

---

## 8. 上传清单（Will 操作）

**频道**
- [ ] 用品牌账户（Brand Account）新建 YouTube 频道 **Multiverse Collective**，不要挂在个人频道下面
- [ ] 申请 handle `@multiverseco`（被占用就用 `@multiversecollective`）
- [ ] 上传头像 `vi-icon.png` 和横幅（§2 规格）
- [ ] 粘贴 About（§2.1）、Links（§2.2）和频道关键词（§2.3）；国家选 United States
- [ ] 上传默认设置：语言 English、分类 Gaming、字幕认证（§2）
- [ ] 完成手机号验证，否则不能用自定义缩略图，也不能上传超过 15 分钟的视频
- [ ] 建好两个播放列表（§2.4）

**每条视频（先 V1，再 V2）**
- [ ] 上传文件（§3 各条写明的路径）
- [ ] 粘贴 Title、Description、Tags
- [ ] Audience：*No, it's not made for kids*（面向成年科幻爱好者，片子风格偏诡异）
- [ ] Altered or synthetic content：按 §1 的确认结果勾选（V1 和 V2 是实拍设备加伪装旁白，一般选 No；C1、C2 要看来源）
- [ ] Subtitles：上传对应的 `.srt`（With timing）
- [ ] 自定义缩略图（§5 E5）
- [ ] 加入播放列表；V1 设为频道预告片
- [ ] 片尾元素（只有 V2）；置顶评论（V1）
- [ ] 公开后，把 YouTube URL 发回给 Claude，用于 §7 的 `sameAs` / `embedUrl` 跟进

**Shorts**
- [ ] 先确认竖版版式（§4），再按 §5 E2 一条一条渲染
- [ ] 每条设置 *Related video*，指向对应的长视频

**上线后 1 到 2 周**
- [ ] YouTube Studio：看搜索词（Traffic source → YouTube search），把实际带来流量的搜索词补进描述的前两行
- [ ] 在 Google 和 Perplexity 里搜 “retro sci-fi device”“hardware-based sci-fi game”“gift for sci-fi fans”，看视频有没有被引用（和 geo-measurement 的基线放在一起记录）
