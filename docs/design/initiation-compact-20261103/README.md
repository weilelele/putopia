# Voyager Initiation 紧凑布局 · 2026-11-03

## 选定参考与用户要求

以当前实体 Pack 的左图右文、橙色时间线为参照。用户要求：Antenna 简介继续缩短，重新生成不同暗色场景而非只降亮度；Parallax Array 与 Mission Board 合并为「核心任务与参与任务」，两项使用左侧缩图；Classified Intel & Votes 为第三类；套餐摘要突出徽章、Antenna 和远程 Parallax Array；FAQ 分类、问题取消加粗，并明确删除 $12 Initial Pack 的独立问题。

依据 `docs/design-system.md`，复用当前 Courier Prime、字号和品牌色、侧图与时间线。没有改写 Pack 1 的实际配送内容。现有付款、领取、状态与链接条件继续由业务逻辑控制。

## 实现与截图对照

| 区域 | 实现 | 实际截图 |
| --- | --- | --- |
| Physical Voyager Packs | Pack 2 复用 Pack 1 方形侧图。新图为深色织物衬里档案盒，移除 CSS brightness；简介为 `Parallel-world signals, received on your Console.` | [390px 手机](mobile-packs.png) |
| Core & Participation Missions | 02 类下为 Parallax Array / Mission Board 两项。复用 Pack 侧图、时间线和 h4 标题，各一句介绍及原入口；不再显示地点在线状态句。原分析 section 标记保留在各条目。 | [390px 手机](mobile-tasks.png)、[1280px 桌面](desktop-tasks.png) |
| Classified Intel & Votes | 03 类，左侧缩图，一句介绍，保留 Intel 与 Votes 两个入口。 | [手机任务及第三类](mobile-tasks.png) |
| Choose your bundle | Initial 摘要为 `Voyager badge & Antenna.` 与 `Remote access to the Parallax Array.`；Complete 通过 Everything in Initial 承接。 | [390px 手机](mobile-bundles.png) |
| FAQ | Devices & functions、Membership & payment、Shipping & taxes 三组。10 个原生 details，问题 16px / 400 字重；删除指定 $12 问题，Antenna 答案保留安装要求与 Initial 不含 Console 的说明。 | [390px 手机](mobile-faq.png) |

手机任务缩图实测 102×102px，与 Pack 侧图一致；桌面任务缩图 260×260px。任务动作使用 16px / 400、1.5 行高，至少 44px 命中高度。FAQ 保留可见焦点与原生键盘操作，分类标题沿用 16px / 700 品牌橙。320、390、1280px 检查未发现横向溢出。

## 图片来源与复查

内置 ImageGen，以既有 Antenna 图保留三枚形状与配色，以 Pack 1 图仅参考暗调光线。完整提示词、输入 SHA-256 与输出 SHA-256 见 [image-generation.json](image-generation.json)。项目素材为 `public/assets/voyager-initiation/antenna-archive-case-v1.png`；旧素材保留。

目视复查：三枚完整同心纹圆盘，古铜、骨白银边、深蓝橙边可区分；新物理环境为档案盒和深色织物，没有亮桌面或新增设备功能。图片用于设计展示，不定义最终数量或结构。共享 Antenna 图引用同时更新使用它的既有界面。

## 验证

- 本机 fixture 预览使用 dummy service settings，未连接真实服务完成交易。
- 390px 先检查，随后 1280px；另做 320px 溢出检查。
- FAQ 三类、10 个问题、全部问题 400 字重；指定旧 $12 问题不存在。Shipping 问题可用 Enter 展开与折叠。
- Initial / Complete 选择分别显示 $38 / $488 Continue。未执行付款。
- Parallax Array 与 Mission Board 入口目标、独立分析标记保留。
- `npm run design:check`、`npx tsc --noEmit`、`npm run lint`（0 errors、26 条已有 warnings）、`npm test`（934 passed）、`npm run build` 通过。

状态：本地实现与截图验证完成，随 PR #284 提供审阅；本轮未合并或发布。
