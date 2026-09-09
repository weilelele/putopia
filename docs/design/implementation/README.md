# UI 2.3 实现与验收记录

> **2026-09-10 最新展示规则：游客与登录态头部互斥。** 游客显示原三个数字指标，登录后显示 Voyager/Applicant 欢迎与个人身份状态；两块不叠加。内容区不重复放品牌 Logo；恢复桌面/横屏统一侧栏中的原品牌、导航和账号区域。Intel 列表、新闻详情及 Updates 中的新闻条目保留作者头像（紧邻昵称）和图片。Updates 的类型/有效期暂不改变，当前口径见实现说明。


2026-09-09。设计批准、代码实现、验证和正式发布分别记录。当前权威入口是 [design-system.md](../../design-system.md)，产品内 `/ui-kit` 使用真实共享组件。旧版 golden screens 和海报哲学文档保留历史记录并标记废弃，不再指导开发。

## 实现范围

- 全站共享颜色、字体、字号、平面容器、按钮、页头、五 Tab 导航和详情返回。应用内容页移除品牌区；一级 Tab 名称仅保留辅助技术可见的 h1，移除可见重复标题及占位；二级及深层页面移除重复 Logo。管理、认证、申请、付款结果和加载页同步基础样式。
- `/ui-kit` 替换旧静态样板，覆盖主导航、来源返回、按钮、输入、筛选、弹层、草稿退出、必填校验、提交中/成功/未知、加载/空/错误/离线；样例只使用本地数据。
- Dashboard 使用独立 Updates 和 Events 数据模型。Updates 为各来源真实时间戳汇总后的全局最新 10 条；Events 公开展示真实开放的活动及入口；截止时间与设备状态仍有效，参与权限在目标流程中校验。
- `/welcome` 是独立启动页。普通根入口及 PWA 进入这里；点击任意处或键盘 Enter/Space 立即替换为 `/console`，未操作时在动画完整播放结束后再停留 3 秒替换。直接访问详情和活动入口保留原目的地，不被启动页打断。减少动态效果时显示原文字 Logo 静态图。
- iOS 启动动画和原品牌字形随包打包，计时不依赖网络；结束后显示 Dashboard 或原生离线 Dashboard。WebView 和离线页使用统一五 Tab、颜色、字体及层级。未缓存状态仍显示导航；不伪造离线可参与活动。
- 编辑与创建弹层共用原生 HTML dialog 的焦点约束、背景隔离、关闭和草稿确认。提交结果未知时先检查记录，禁止无条件重复提交。

## 本轮：保留功能的组件替换

已开始全产品控件替换并修复 Dashboard 媒体来源，详见 [本轮实施与验收记录](component-refresh.md)。这里的逐页检查是只读视觉/交互检查，不等同于生产写入流程验收。

## 数据边界

Dashboard 的 World Established 新事件写入已有 `activity_events` 表，仅在实际阶段转换时记录；重复更新海报不重复记录。没有真实转换时间的历史世界不使用创建日期伪造迁移事件。Signal Tuning 使用实际 Signal Thread 时间。无需数据库结构迁移，本次未执行生产数据回填。

分类内容和离线快照在服务端去除受限正文/媒体。离线媒体只渲染已缓存本地文件，缺失记录明确提示联网加载。Events 的可用性独立于 Updates 的历史记录。

## 预览入口

[播放启动动画](https://putopia-git-codex-ui-v23-weileleles-projects.vercel.app/welcome) · [可交互 UI Kit](https://putopia-git-codex-ui-v23-weileleles-projects.vercel.app/ui-kit) · [Dashboard](https://putopia-git-codex-ui-v23-weileleles-projects.vercel.app/console) · [改版 PR](https://github.com/weilelele/putopia/pull/142)

Vercel 预览沿用项目现有登录保护，需要有权限的 Vercel 账号。产品页面仍遵循原来的产品登录权限。此分支未合并生产。

## 验证与发布

本地记录：Dashboard 在 320px/390px 无横向溢出，Updates 为 10 条；启动页已按新规则实测：动画完成后约 3.08 秒自动进入，动画中点击约 45ms 跳过；UI Kit 的弹层焦点、背景锁定和草稿确认已实测。Worlds、Web 离线页在 390px 渲染正常；本轮已使用正常登录会话检查 Intel、Devices、Voyagers、Profile 和 Worldflow；Logs 深层状态仍待进一步验收。

代码检查包括设计增量检查、Web TypeScript、ESLint、Vitest、生产构建；iOS 包括 TypeScript、Expo 配置、JS/资源导出以及启动 Storyboard 编译。结果以提交与 PR 中最终日志为准。

**尚未等同于正式上线或完整真机验收：** 生产共享服务上的付款、创建、个人资料保存等写入流程未通过测试数据执行；不能把静态检查视为这些业务流程已通过端到端测试。iOS 尚未提交签名发行包/TestFlight，需要发行流程和真机安全区、键盘、网络切换验收。预览与正式发布分别记录在 PR。

## 页面清单

[routes.json](routes.json) 枚举每个页面、加载和错误入口，并区分页级改动与共享基础样式覆盖；没有独立运行过的流程标记待验收，不宣称全部已验证。三个迁移 JSON 是编辑清单，不是测试通过证明。

## 已修改页面与改动深度

| 页面 | 本次实际改动 | 验收状态 |
| --- | --- | --- |
| Dashboard `/console` | 重写 Updates 时间轴与 Events 行动卡；公开活动展示；独立空/失败状态；游客数字概览与登录后身份状态分离 | 320px/390px 访客实测；登录后 Events 已只读实测，实际参与写入待验收 |
| Worlds `/worlds/live`、World Archive `/worlds`、World 详情 | 一级/二级页头、队列与分类切换、说明/提交/Signal 弹层、草稿退出与未知结果处理、详情返回 | Live 页 390px 只读实测；提交等写入流程待验收 |
| Devices `/devices`、批次详情、My Consoles、认领/讨论相关页 | 品牌区与返回层级、内容切换、批次列表及 Console 进度弹层、共享按钮和容器 | 共享控件与一级页已只读实测；提交/付款等写入流程待验收 |
| Intel `/intel`、详情、Votes | 筛选与位置记忆、详情返回、创建 Intel/Vote 弹层、上传/提交状态、基础视觉 | 共享控件与一级页已只读实测；提交/付款等写入流程待验收 |
| Voyagers `/voyagers`、My Profile `/profile`、Logs `/logs` 与详情 | Profile 归属、批次筛选、编辑与草稿保护、二级去 Logo、实际来源返回、Logs 加载/错误/空状态 | 共享控件与一级页已只读实测；提交/付款等写入流程待验收 |
| 启动 `/welcome` 与 UI Kit `/ui-kit` | 新增独立启动入口；用真实共享组件重建可操作样板 | 移动端本地实测；计时规则以最新交互合同为准 |
| Web 离线页与 iOS 离线默认页 | 五 Tab、原品牌素材、字体、缓存时间与缺失内容提示、只读 Dashboard、详情返回 | Web 离线页已实测；iOS 完整 Release 模拟器目标编译通过，真机运行待验收 |
| 管理、认证、申请、Quiz、认领结果及加载/错误页 | 共享字体/字号/颜色/容器/按钮、清理重复品牌与装饰 | 基础样式迁移，尚未逐页完整验收 |

“已修改”只表示改动已进入预览分支；不表示生产站已上线、所有业务流程已验证或每个细节已完成设计验收。

## Updates 当前内容类型与有效时长（待用户确认筛选规则）

这是现有实现的实际口径，不是新提案。本轮只恢复作者/媒体展示，未改下面的内容筛选规则。

| 展示类型 | 实际进入条件与来源 | 用于排序的时间 | 当前有效时长 / 移出条件 |
| --- | --- | --- | --- |
| Intel 新闻（NOTICE / DEVICE / ORG） | Intel 记录；公开新闻可读，未授权的 classified 新闻为锁定提示 | 新闻 `timestamp` | 无天数上限；被更新内容挤出全局最新 10 条。删除后不再读出 |
| Signal tuning | 有关联世界的 Signal thread；当前没有按调谐是否结束筛选 | Thread `created_at` | 无天数上限；调谐结束不会自动移出；受最新 10 条限制 |
| Established world · 建立事件 | 可见的 `world_established` 活动记录 | 活动 `created_at` | 无天数上限；隐藏/删除该活动或被挤出最新 10 条后不显示 |
| Established world · Final form | 当前世界为 stable 的 Final assets | Asset `created_at` | 无天数上限；世界不再 stable、资产删除或被挤出最新 10 条后不显示 |
| Voyager activated | 可见的 `voyager_activated` 活动；排除明确标为 architect 的 actor，role 为 null 的记录仍纳入 | 活动 `created_at` | 无天数上限；隐藏/删除该活动或被挤出最新 10 条后不显示 |
| Device update | 可见的 `device_updated` 活动，以及已发布设备批次的资料更新 | 活动 `created_at` / 批次发布内容中的 `updatedAt` | 无天数上限；活动隐藏或批次不再发布则相应来源消失，其余受最新 10 条限制 |
| Vote opened | 投票记录，目前包括已关闭/已到期的投票 | Vote `created_at` | 无天数上限；不会因 `ends_at` 或关闭自动从 Updates 移出；受最新 10 条限制 |

所有来源合并后按发生时间倒序取 10 条；多数来源先各取最新 10 条。没有各类型保留配额，也没有按类型轮换。因此某一类新信息较多时，可以占满整个 Updates。

**30 秒是服务端缓存刷新间隔，不是信息有效期。** 页面也没有每 30 秒自动轮询，通常在重新请求/刷新时取数。

两个已知口径需下一步确认：同一世界可能同时有“建立事件”和“Final form 资产”，同一设备可能同时有活动记录与批次更新，它们使用不同 ID，当前不会按世界/设备合并；投票与 Signal 结束并不使历史 Updates 自动过期。Events 使用另外的开放/有效性条件，不能用 Events 的截止时间解释 Updates。
