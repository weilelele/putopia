# Putopia / Multiverse Collective — AIGC 图像生成素材手册

> 本文档基于现有数据库内容（生产库 `voyager_profiles` 表、`content/devices.ts`、
> `content/stories.ts`）与 `src/app/api/studio/generate/route.ts` 中的官方世界观设定
> 整理而成。
> 用途：作为 AIGC 图片生成模型（LovArt / Midjourney / Flux 等）的基础素材，
> 指导其生成符合 Putopia 视觉语言的设备图与人物肖像。
>
> 每个条目都附带：**中文设定说明** + **可直接复制的英文 image prompt 片段**。

---

## 0. 全局视觉基调（所有图像必须遵循）

这是整个品牌的视觉锚点，生成任何图片前都应附加这段风格描述，确保画面统一。

**Putopia Aesthetic（官方定义，逐字引用自代码库）：**

- 背景：深空蓝 `#0A0E27`（deep space blue / `--color-deep`）
- 硬件：复古未来主义的模拟硬件（retro-futuristic analog hardware）
- 点缀光：原子核橙 `#FF6B35`（retro orange / `--color-nucleus`）+ 焦糖橙 `#E85D04`（burnt orange / `--color-burnt`）；正文/高光用米白 `#F5F5F5`（`--color-star`）。品牌**无青、无灰**。
- 屏幕：CRT 显示器质感，带扫描线颗粒（scan-line grain）
- 尺度与景深：宇宙级尺度感，电影级浅景深（cinematic depth of field）
- 风格参考：《银翼杀手 2049》调色 · 复古 NASA 控制室美学 · Lo-fi 科幻硬件摄影
- **避免**：泛泛的「太空背景」、纯白背景、卡通感、廉价图库摆拍感

**通用风格后缀（English, append to every prompt）：**

```
deep-space-blue background #0A0E27, retro-futuristic analog hardware,
retro-orange #FF6B35 and burnt-orange #E85D04 accent lighting, off-white #F5F5F5 highlights,
CRT display with scan-line grain, cinematic depth of field, cosmic scale,
Blade Runner 2049 color grading, retro NASA control-room aesthetic,
lo-fi sci-fi hardware photography, photorealistic, no text, no logo, no cyan/teal
```

---

## 1. 核心设备：Multiverse Console（多元宇宙终端）

### 设备总体设定

一台神秘的平行世界通讯装置。全球已知约 **20 台**，来源不明（很可能是经由量子能量
从另一个世界传输而来）。设备模块化，可接入能量弹夹与扩展配件；**每一台都残留着
历代持有者的痕迹与记忆**。

**物理形态（逐字源自 Voyager 故事）：**
> 「你可以说它有点像收音机，但它有一块非常奇特的屏幕；你可以说它是电视，
> 但它不像传统电视那样调台，也没有任何『智能』功能；你也可以叫它显示器，
> 然而它显示的内容是非现实的，甚至充满了不确定性。」

关键外观元素：
- 一块**奇特的、非现实的屏幕**（介于收音机 / 电视 / 显示器之间）
- **两侧各有旋钮**（knobs）——转动旋钮搜索信号
- 一盏**红色警示灯**——当与平行世界建立连接时会**闪烁/亮起**，设备同时轻微震颤
- 一颗 **Quantum Energy Button（量子能量按钮）**——长按录音，伴随「beep」提示音，
  用于向平行世界发送讯息

**English base prompt for the device body：**

```
A mysterious parallel-world communication console, hybrid of a vintage radio,
an old television, and a CRT monitor — but unmistakably otherworldly. Heavy
analog hardware with two large tuning knobs on either side, a single red
warning light, and a prominent "quantum energy" press button. The screen
shows unreal, uncertain imagery. Worn, well-used, carries traces of past
owners. [+ 全局风格后缀]
```

---

### 设备的四大功能（FOUR DEVICE FUNCTIONS）

> 官方设定（逐字引用）：
> *"Functions: spatial signal detection across frequency bands · quantum energy
> discharge · transtemporal audio transmission · inner voice reception from
> intelligent life in other worlds."*

下面将四个功能拆解为独立的可生成画面。

#### 功能一 · 空间信号侦测 Spatial Signal Detection

**设定：** 跨频段扫描空间，捕捉来自其他世界的信号。这是 Voyager 使用设备的第一步——
转动两侧旋钮，在频段之间搜索，直到屏幕上浮现出「本不该看见的世界」的影像。画面强调
*搜索 / 调谐 / 噪点中浮现图像* 的过程。

```
Close-up of hands turning the dual tuning knobs of the Multiverse Console,
CRT screen resolving from static snow into the faint outline of another world,
amber/orange signal waveform sweeping across a frequency spectrum, scan-line grain,
tense moment of first detection. [+ 全局风格后缀]
```

#### 功能二 · 量子能量释放 Quantum Energy Discharge

**设定：** 设备核心能力——释放量子能量以强化、稳定跨世界连接。世界观中，建立连接会
在操作者周围形成一圈**稳定能量场**。画面强调*能量迸发 / 场域 / 橙色核心辉光*。

```
The Multiverse Console discharging a burst of quantum energy, nucleus-orange
#FF6B35 glow erupting from its core and the quantum-energy button, expanding
into a stabilizing energy field / halo around the operator, particles and
light folds, dramatic volumetric lighting against deep void black.
[+ 全局风格后缀]
```

#### 功能三 · 跨时空语音传输 Transtemporal Audio Transmission

**设定：** 长按 Quantum Energy Button 录音并发送语音讯息，可**跨越时间**传递给
另一个世界的人（故事中 Voyager Page 向 121 年后的「自己」发送了第一条语音）。
画面强调*录音的瞬间 / 声波跨越时间 / 红灯亮起确认连接*。

```
A finger pressing and holding the glowing quantum-energy button of the
Multiverse Console, red warning light lit, a voice/sound wave traveling from
the device into the CRT screen toward a person from a different era, a future
timestamp glowing in the screen corner, intimate and quiet, scan-line grain.
[+ 全局风格后缀]
```

#### 功能四 · 异世界内心之声接收 Inner-Voice Reception

**设定：** 接收来自其他世界智慧生命的**内心之声**——对方嘴唇不动，但操作者能直接
「听见」其脑海中的想法（故事原文：*"His mouth didn't move, but I clearly heard
the thoughts in his mind."*）。画面强调*无声的心灵感应 / 屏中人凝视 / 思绪以
青色光丝流入*。

```
A person inside the Console's CRT screen looking directly at the viewer, lips
closed and still, glowing orange threads of thought streaming from their head
through the glass into the real world — telepathic inner voice made visible,
the device's red connection light steadily on, eerie and intimate.
[+ 全局风格后缀]
```

---

### 已知的四台具体设备（用于场景/编号差异化）

| 编号 | 别名 | 地点 | 状态 | 设定描述 |
|---|---|---|---|---|
| Unit 001 | **The Originator**（始源者） | Berlin, Germany | IN USE | 记录中最古老的 Console，曾被一位德国 Voyager 持有 20 年，现重新流转使用。沧桑、有历史感。 |
| Unit 012 | **The Observer**（观察者） | Shanghai, China | IN USE | 朋友间相赠；建立了史上首条确认的跨时空量子连接。带情感温度。 |
| Unit 019 | **The Wanderer**（漫游者） | Tokyo, Japan | AVAILABLE | 从废弃邮政储物柜中寻回，功能正常，等待分配。来历神秘。 |
| Unit 023 | **The Broken Eye**（破碎之眼） | London, UK | NEEDS REPAIR | 长期深频段暴露后屏幕校准失效，正在修复。「看了太多」的受损之眼。 |

> 提示：可让 001 显得最古旧磨损、012 带暖色情感光、019 落灰待启、023 屏幕故障闪烁。

---

## 2. Architects（架构师）人物介绍

> Architect 是 Putopia Collective 的**领导/治理层**：建立新的世界连接、开发 Console
> 扩展模块、审核申请、发布情报、为世界分类命名、维护组织运作结构。
>
> 以下 **6 位为生产数据库 `voyager_profiles` 中 `role = architect` 的全部当前成员**
> （bio 逐字引自数据库）。其中 Gloria X、Weile Yang、Arthur 已有**真人上传头像**
> （见下方图像与 URL），可直接作为图生图 / 风格参考；Maren、Ryo、Valentina 为设定
> 角色，附代码库中**官方头像生成 prompt**。

### 2.1 Gloria X — 伪装成普通市民的闯入者

- **地点：** Shanghai, China（中国·上海）
- **加入：** 2026-05-15 ｜ 观测天数 132 ｜ 发现世界 1
- **设定（逐字 bio）：** *"Driven by reckless curiosity and zero fear of the unknown,
  she stumbled into the Organization purely for fun. Today, she masquerades as an
  unassuming citizen amidst the city's daily rush."*
- **气质关键词：** 莽撞的好奇心、对未知毫无畏惧、为了好玩误入组织、隐于都市人潮中的
  「普通市民」伪装。
- **已有头像：** 是（`avatars/5cd808a6-…/avatar.JPG`）

```
illustrated portrait of a young East Asian woman in a bustling modern Shanghai
crowd, blending in as an ordinary citizen yet a spark of reckless curiosity in
her eyes, candid street feel, warm orange rim light, editorial illustration style.
[+ 全局风格后缀]
```

### 2.2 Weile Yang — 世家血脉的归来者

- **地点：** Bay Area, USA（旧金山湾区，不时往返上海）
- **加入：** 2026-05-14 ｜ 观测天数 870 ｜ 发现世界 3
- **社交：** X `@YangWeile52622` · LinkedIn `weile-will-yang`
- **设定（逐字 bio）：** *"His ancestors were among the first in China to establish
  contact with this organization. It wasn't until after he turned 30 that he began
  to realize the existence of this mysterious group. He currently resides in the
  Bay Area, but he also travels to Shanghai from time to time."*
- **气质关键词：** 世家血脉（祖辈是中国最早接触组织的人之一）、年过三十方觉醒、
  往返湾区与上海、连接东西方的桥梁感。
- **已有头像：** 是（`avatars/6fc6e5cd-…/avatar.png`）

```
portrait of an East Asian man in his early 30s, quiet inherited gravitas, a
bridge between East and West, subtle Bay-Area-meets-Shanghai duality, burnt-orange
accent light, modern editorial illustration, dark background.
[+ 全局风格后缀]
```

### 2.3 Arthur — 设备技师 / 复古玩家

- **地点：** Bay Area（湾区）
- **加入：** 2026-06-02 ｜ 观测天数 312 ｜ **发现世界 23（全员最高）**
- **设定（逐字 bio）：** *"A technician by trade. If you find a console that needs
  fixing, tap me. I love VINTAGE things. Bikes, cars, stereos, guitars, and
  devices that monitor worlds beyond our own. I spend 2½ hour a day figuring out
  what more can MC console do. Ping me if you want to join my research."*
- **气质关键词：** 技师、修理 Console 的人、复古控（自行车 / 老爷车 / 音响 / 吉他）、
  每天花 2.5 小时钻研 MC 设备潜能、爱召集同好做研究。
- **已有头像：** 是（`avatars/1dc63560-…/avatar.jpeg`）

```
portrait of a hands-on technician in a workshop full of vintage gear — bikes,
classic stereos, guitars — bent over a half-open Multiverse Console with a
soldering iron, warm orange work-lamp glow against deep-space-blue ambient light,
tinkerer energy, lo-fi sci-fi hardware photography.
[+ 全局风格后缀]
```

### 2.4 Maren Solberg — 信号分类协议的架构师

- **地点：** Oslo, Norway（挪威·奥斯陆）
- **加入：** 2023-07-01 ｜ 观测天数 1024 ｜ 发现世界 5
- **设定（逐字 bio）：** *"Theoretical physicist and architect of the Collective's
  signal-classification protocol. Rarely appears in public communications — her
  influence is felt in the structure of everything. Every sentence she writes does
  work. Every silence is intentional."*
- **气质关键词：** 理论物理学家、极简、精确、克制、隐于幕后、字字有用、刻意的沉默。
- **官方头像 prompt（代码库 seed 707）：**

```
minimalist geometric illustration portrait of a Scandinavian woman in her 40s,
blonde hair pulled back, cool blue tones, clean vector art style, precise lines,
professional, dark background, modern. [+ 全局风格后缀]
```

### 2.5 Ryo Tanaka — 四角色结构的提出者

- **地点：** Kyoto, Japan（日本·京都）
- **加入：** 2023-06-15 ｜ 观测天数 1156 ｜ 发现世界 8 ｜ 社交：X `@ryotanakaputo`
- **设定（逐字 bio）：** *"Philosopher-engineer who was present before the Collective
  had a name. Proposed the four-role structure still in use today. Thinks in
  decades. Patient to the point of stillness. Opens meetings with a question,
  closes them with a single sentence."*
- **气质关键词：** 哲学家-工程师、组织创始元老、以十年为单位思考、沉静近乎静止、
  以提问开场、以一句话收束。
- **官方头像 prompt（代码库 seed 808）：**

```
ink brush painting portrait of a distinguished Japanese man in his 50s, calm
composed expression, traditional brushwork style with modern touch, monochrome
with subtle amber tones, zen aesthetic, dark background. [+ 全局风格后缀]
```

### 2.6 Valentina Cruz — 对外沟通与增长负责人

- **地点：** Mexico City, Mexico（墨西哥·墨西哥城）
- **加入：** 2024-01-08 ｜ 观测天数 623 ｜ 发现世界 3 ｜ 社交：X `@ValentinaCruzi`
- **设定（逐字 bio）：** *"Communications strategist responsible for the Collective's
  growth, the intake of new Voyagers, and the organization's public-facing
  narrative. The most outward-facing of the Architects. Decisive, high-energy, and
  unusually comfortable with uncertainty."*
- **气质关键词：** 传播策略师、负责增长与新成员引入、最外向的 Architect、果断、
  高能量、对不确定性异常自如。
- **官方头像 prompt（代码库 seed 909）：**

```
vibrant illustrated portrait of a Latina woman in her late 30s, dark hair,
confident warm smile, bold saturated colors, editorial illustration style,
dynamic composition, dark background. [+ 全局风格后缀]
```

> 备注：`scripts/create-architect.mjs` 中另有三个**用于内容生成的虚拟人格**
> （Nova / Shen Echo / Lingbo），非组织真人成员，通常不需要人物肖像，故不列入上表。

---

## 3. 角色体系速查（背景参考）

- **Voyager（旅行者）**：持有一台 Multiverse Console，观测并与平行世界互动。
- **Architect（架构师）**：建立新世界连接、开发 Console 扩展模块、领导组织运作。
- **核心世界观：** 当前世界的数据过载正在损害与平行世界的连接，导致全球人类情绪失稳；
  世界之间的连接越多 → 秩序与生命力越强；建立连接会在操作者周围形成稳定能量场。

---

*文档结束 · 所有引号内英文均逐字引自代码库 / 生产数据库设定，可安全用于图像生成 prompt。*
