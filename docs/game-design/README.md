# Multiverse Collective — 玩法设计文档 / Game Design Document

> 本目录是 **Multiverse Collective（原 Putopia Collective）** 的完整玩法设计文档（GDD）。
> 它从游戏策划 / 产品经理视角，对产品现有的全部模块、系统与玩法进行**全面、准确**的梳理，
> 作为后续讨论、汇总与迭代的权威依据。
>
> This directory is the full Game Design Document (GDD) for **Multiverse Collective**
> (formerly Putopia Collective). Written from a game-design / product perspective, it
> describes every existing module, system and gameplay loop **comprehensively and
> accurately**, to serve as the authoritative basis for future discussion and iteration.

---

## 文档约定 / Conventions

- 每个系统一个文件夹，内含 `zh.md`（中文）与 `en.md`（English）两个版本，内容对齐。
- 每篇文档统一结构：**定位 → 玩家体验 → 核心机制 → 数据与权限 → 当前状态与缺口 → 未来钩子**。
- "现状标注"区分三类：✅ 已上线、🟡 已建未启用 / 部分、⬜ 仅设计未实现。
- 设计规范（配色 / 字体 / token）以仓库 `docs/design-system.md` 为准；本文档不重复。

- One folder per system, each containing `zh.md` (Chinese) and `en.md` (English), kept in sync.
- Every doc follows the same shape: **Positioning → Player experience → Core mechanics → Data & permissions → Current status & gaps → Future hooks**.
- Status legend: ✅ live, 🟡 built-but-gated / partial, ⬜ designed-only.
- Visual spec (colors / type / tokens) lives in `docs/design-system.md`; not repeated here.

---

## 目录 / Table of Contents

| # | 系统 / System | 文件夹 / Folder |
|---|---|---|
| 00 | 总览：世界观、角色、进度状态机、信息架构 / Overview: fiction, roles, progression, IA | [`00-overview/`](./00-overview/) |
| 01 | 身份与进度体系 / Identity & Progression | [`01-identity-progression/`](./01-identity-progression/) |
| 02 | 世界构筑 / World Building | [`02-world-building/`](./02-world-building/) |
| 03 | 信号派遣（每日解谜） / Signal Dispatch (daily puzzles) | [`03-signal-dispatch/`](./03-signal-dispatch/) |
| 04 | 投票中心 / Voting Hub | [`04-voting-hub/`](./04-voting-hub/) |
| 05 | 情报 / Intel | [`05-intel/`](./05-intel/) |
| 06 | 航行者日志 / Voyager Logs | [`06-voyager-logs/`](./06-voyager-logs/) |
| 07 | 设备档案 / Device Archive | [`07-device-archive/`](./07-device-archive/) |
| 08 | 多元宇宙控制台 / Multiverse Console | [`08-multiverse-console/`](./08-multiverse-console/) |
| 09 | 社区与社交 / Community & Social | [`09-community-social/`](./09-community-social/) |
| 10 | 商业化：航行者礼包 / Commerce: Voyager Pack | [`10-commerce/`](./10-commerce/) |
| 11 | 获客与引导 / Onboarding & Acquisition | [`11-onboarding-acquisition/`](./11-onboarding-acquisition/) |
| 12 | 后台与运营 / Admin & Operations | [`12-admin-ops/`](./12-admin-ops/) |

---

## 一句话产品定义 / One-line definition

> **中文**：一个以"秘密组织"为外壳的角色扮演式社区游戏——玩家化身"航行者（Voyager）"，
> 通过一台名为"多元宇宙控制台（Multiverse Console）"的复古设备观测、辨认并共同"构筑"平行世界。

> **English**: A roleplay-flavored community game wrapped in a secret-organization fiction —
> players become **Voyagers** who use a retro device, the **Multiverse Console**, to observe,
> identify, and collectively **build** parallel worlds.
