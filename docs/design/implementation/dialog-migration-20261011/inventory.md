# 全站弹窗盘点 · 2026-10-11

基线：origin/main 0df3da7；分支：codex/dialog-migration。源码盘点覆盖 src 下 TS/TSX，通过 TypeScript AST 检查共享弹窗调用及浏览器原生确认，同时检查固定全屏层和 Portal。调用点数不等于独立业务场景数，条件分支、复用组件和 UI Kit 样例分别计数。

当前共有 **40 个 ArchiveSheet 调用点**（含样例）、**20 处原生 alert/confirm/prompt**，以及下列手写/专用覆盖层。源码盘点不表示所有页面均经过登录态视觉验收。

## 第一、二批结果

- 入会席位、批次说明：既有共享居中壳继续使用；Initial Pack 优惠说明恢复标准标题，校准题目已开始后的 fullscreen 是主分支既有专注任务模式，保留。
- 成员详情：MemberProfileSheet（评论、成员头像等入口）、Voyagers、Activity Feed、旧 Feed prototype 共用 MemberProfileContent。数据获取、权限和本人编辑入口不变；NPC 明示、加载/失败/不存在状态保留；社交链接仅允许 http/https。旧 Feed 的手写外壳已移除。
- 资料编辑：Profile 改成固定共享标题 + 原表单 + footer 保存，通过 form/id 保留 HTML 校验和 Enter 提交；Voyagers 编辑的保存/结果未知恢复操作移入 footer。草稿保护、提交禁用和错误展示保留。
- Console 领取确认与入会引导：主分支已使用共享 footer/busy，本轮检查保留，不重复改领取业务。
- 参与登录引导：AuthPromptSheet 主次入口移入 footer，返回地址不变。
- UI Kit 的 Member details 使用真实共享详情组件，并增加真实 ProfileView 的本地服务样例，可在预览环境安全保存，不触发账号写入。

## 共享调用清单

| 文件:行 | 标题/场景 | 固定 footer |
|---|---|---|
| `src/app/devices/_components/batch-actions.tsx:104` | {title} | 无；只读无需操作，表单待逐项判断 |
| `src/app/devices/_components/device-claim-panel.tsx:75` | "Confirm your Console" | 是 |
| `src/app/devices/_components/device-claim-panel.tsx:83` | "Voyager Initiation" | 是 |
| `src/app/devices/_components/device-field-lead.tsx:22` | {lead.name} | 无；只读无需操作，表单待逐项判断 |
| `src/app/devices/_components/device-purchase-terms.tsx:23` | "Original order terms" | 无；只读无需操作，表单待逐项判断 |
| `src/app/devices/live/console-packages.tsx:48` | "Explore the packages" | 无；只读无需操作，表单待逐项判断 |
| `src/app/devices/live/device-live-room.tsx:250` | "All device batches" | 无；只读无需操作，表单待逐项判断 |
| `src/app/devices/live/device-live-room.tsx:271` | "My Console progress" | 无；只读无需操作，表单待逐项判断 |
| `src/app/feed-proto/feed-client.tsx:526` | "Voyager profile" | 是 |
| `src/app/intel/CreateIntelModal.tsx:126` | "Publish Intel" | 无；只读无需操作，表单待逐项判断 |
| `src/app/profile/profile-view.tsx:184` | "Edit profile" | 是 |
| `src/app/signal/SignalFeed.tsx:23` | "Signal Dispatch" | 无；只读无需操作，表单待逐项判断 |
| `src/app/ui-kit/dialog-examples.tsx:32` | "Initiated places" | 无；只读无需操作，表单待逐项判断 |
| `src/app/ui-kit/dialog-examples.tsx:35` | "Continue to Initiation?" | 是 |
| `src/app/ui-kit/dialog-examples.tsx:41` | "Voyager profile" | 无；只读无需操作，表单待逐项判断 |
| `src/app/ui-kit/dialog-examples.tsx:45` | "Observation guide" | 是 |
| `src/app/ui-kit/ui-kit.tsx:158` | "Delete sample record?" | 无；只读无需操作，表单待逐项判断 |
| `src/app/ui-kit/ui-kit.tsx:168` | "Edit display name" | 无；只读无需操作，表单待逐项判断 |
| `src/app/vote/CreateVoteModal.tsx:85` | "Create vote" | 无；只读无需操作，表单待逐项判断 |
| `src/app/voyager-initiation/initiation-view.tsx:225` | "Signal Calibration" | 无；只读无需操作，表单待逐项判断 |
| `src/app/voyager-initiation/initiation-view.tsx:228` | "Initial Pack member discount" | 无；只读无需操作，表单待逐项判断 |
| `src/app/voyager-initiation/initiation-view.tsx:232` | "Initiated places" | 无；只读无需操作，表单待逐项判断 |
| `src/app/voyager-initiation/initiation-view.tsx:235` | "Batch S26" | 无；只读无需操作，表单待逐项判断 |
| `src/app/voyagers/page.tsx:280` | "Edit profile" | 是 |
| `src/app/voyagers/page.tsx:412` | "Voyager profile" | 是 |
| `src/app/worlds/live/signal-vote-sheet.tsx:42` | "Signal vote" | 无；只读无需操作，表单待逐项判断 |
| `src/app/worlds/live/signal-vote-sheet.tsx:64` | "Signal vote" | 无；只读无需操作，表单待逐项判断 |
| `src/app/worlds/live/worlds-live-room.tsx:252` | "How the Parallax Array works" | 无；只读无需操作，表单待逐项判断 |
| `src/app/worlds/live/worlds-live-room.tsx:254` | "Share an observation" | 无；只读无需操作，表单待逐项判断 |
| `src/components/activate-action.tsx:65` | "Activate your account" | 无；只读无需操作，表单待逐项判断 |
| `src/components/activity-feed.tsx:300` | "Voyager profile" | 是 |
| `src/components/activity-feed.tsx:308` | "Voyager profile" | 无；只读无需操作，表单待逐项判断 |
| `src/components/auth-prompt-sheet.tsx:22` | {title} | 是 |
| `src/components/dashboard-voyager-header.tsx:25` | "Multiverse Console" | 无；只读无需操作，表单待逐项判断 |
| `src/components/established-world-detail.tsx:75` | "Tuning process" | 无；只读无需操作，表单待逐项判断 |
| `src/components/established-world-detail.tsx:236` | "Observation details" | 无；只读无需操作，表单待逐项判断 |
| `src/components/established-world-detail.tsx:249` | {designating.isFirstObserver ? 'Remove first observer' : 'Designate first observer'} | 无；只读无需操作，表单待逐项判断 |
| `src/components/mc-console-panel.tsx:72` | "Console functions" | 无；只读无需操作，表单待逐项判断 |
| `src/components/member-profile-sheet.tsx:23` | "Member profile" | 无；只读无需操作，表单待逐项判断 |
| `src/components/world-report-sheet.tsx:88` | {copy.title} | 无；只读无需操作，表单待逐项判断 |

## 原生提示清单（后续批次）

浏览器离站提示保留平台原生机制。管理员删除/发布、评论删除、账户安全等本批只盘点，迁移时需逐项验证风险说明和服务端结果，不能全局替换 window.confirm。

| 文件:行 | 类型 |
|---|---|
| `src/app/admin/activity/page.tsx:50` | confirm |
| `src/app/admin/device-batches/batch-config-editor.tsx:300` | window.confirm |
| `src/app/admin/device-batches/blueprints/story-blueprint-browser.tsx:242` | window.confirm |
| `src/app/admin/device-batches/blueprints/story-blueprint-browser.tsx:299` | window.confirm |
| `src/app/admin/intel/page.tsx:196` | confirm |
| `src/app/admin/mc-config/page.tsx:49` | confirm |
| `src/app/admin/onboarding-preview/page.tsx:153` | prompt |
| `src/app/admin/onboarding-preview/page.tsx:164` | confirm |
| `src/app/admin/reports/page.tsx:21` | window.confirm |
| `src/app/admin/signal-tasks/page.tsx:259` | alert |
| `src/app/admin/signal-tasks/page.tsx:416` | alert |
| `src/app/admin/signal-tasks/page.tsx:535` | confirm |
| `src/app/admin/signal-tasks/page.tsx:546` | confirm |
| `src/app/admin/stories/page.tsx:111` | confirm |
| `src/app/admin/votes/page.tsx:60` | confirm |
| `src/app/admin/worlds/page.tsx:106` | confirm |
| `src/app/profile/profile-view.tsx:95` | window.confirm |
| `src/app/profile/profile-view.tsx:218` | window.confirm |
| `src/components/comment-thread.tsx:150` | window.confirm |
| `src/components/final-form-panel.tsx:85` | alert |

## 其余覆盖层及后续范围

| 位置 | 结论与后续处理 |
|---|---|
| feed-proto/feed-client.tsx：VoteModal、VoyagerGateModal、SignInGateModal | 3 个手写弹层，留第三批；成员详情已迁移。投票必须保留选项/提交/结果未知状态，不能只换 div。 |
| new/onboarding-client.tsx、new/demo/page.tsx、demo/page.tsx | 启动视频、扫码及入场过场/媒体遮罩，专用体验，不计普通 Dialog；后续单独评估。 |
| components/scan-initiation.tsx、app/preview/page.tsx | 扫描启动与预览整页容器，并非临时短弹窗，不机械迁移。 |
| profile/account-safety.tsx | 页内展开的账号删除/屏蔽流程，无独立覆盖壳，本批不改。 |
| worlds、Signal vote、world-report-sheet、established-world-detail、CreateIntelModal、CreateVoteModal | 已用共享外壳；表单操作仍有内联按钮，第三批迁移 footer，并验证结果未知、媒体和提交保护。 |
| Device 批次/包裹/历史条款/负责人、Console functions、Signal about | 已有共享居中壳；长文与媒体第三批逐页视觉验收。 |

## 验收入口

- `/ui-kit#shell-01`：短说明、按钮、成员详情、长文；展开 Product profile editor · local fixture → Edit → BIO & LINKS，验证固定保存区、校验和放弃修改。所有保存仅内存。
- `/voyager-initiation`：只查看席位/批次/优惠说明，不创建 checkout。
- `/voyagers`：浏览成员详情；本人编辑仅查看，真实保存会写产品数据。
- `/profile`：登录后编辑预览；安全保存测试优先使用 UI Kit。
- `/devices`：领取弹层只打开/取消，不执行真实 Confirm claim。

预览不合并 main，不运行数据库迁移。预览环境可能共用生产服务；本批没有 DB、支付、权限或 schema 改动。
