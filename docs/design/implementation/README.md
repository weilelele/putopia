# UI 2.3 实现与验收记录

> **2026-09-10 最新展示规则：游客与登录态头部互斥。** 游客显示完整品牌介绍、设备原图、View Device、Request Access / Login 和原三个数字指标，不再叠加左上角小 Logo；登录后统一显示 WELCOME, VOYAGER 欢迎与个人身份状态（实际身份在角色标签显示）；两块不叠加。五个一级 Tab 在移动端恢复紧凑原图形＋文字 Logo；二级及更深页面无 Logo；桌面/横屏统一侧栏保留品牌，内容区不重复。Dashboard 采用已确认的四类 Updates 与两类 Events 内容池。


2026-09-09。设计批准、代码实现、验证和正式发布分别记录。当前权威入口是 [design-system.md](../../design-system.md)，产品内 `/ui-kit` 使用真实共享组件。旧版 golden screens 和海报哲学文档保留历史记录并标记废弃，不再指导开发。

## 实现范围

- 全站共享颜色、字体、字号、平面容器、按钮、页头、五 Tab 导航和详情返回。移动一级页保留紧凑品牌区，游客 Dashboard 使用完整品牌介绍并省略重复小 Logo；一级 Tab 名称仅保留辅助技术可见的 h1，移除可见重复标题及占位；二级及深层页面移除重复 Logo。管理、认证、申请、付款结果和加载页同步基础样式。
- `/ui-kit` 替换旧静态样板，覆盖主导航、来源返回、按钮、输入、筛选、弹层、草稿退出、必填校验、提交中/成功/未知、加载/空/错误/离线；样例只使用本地数据。
- Dashboard 使用独立 Updates 和 Events 数据模型。Updates 只含 Intel、Voyager Activated、Established World、Device Update，应用分类上限和实体去重后取全局最新 10 条。Events 只含最多 3 个开放 Vote 与最多 3 个当前 Signal Tuning。
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

## Dashboard 内容池与有效性（已确认）

Updates 固定最多 10 条，不为 Intel 子类型预留位置。分类上限与实体去重先执行，再按发生时间倒序取全局最新 10 条。

| Updates 类型 | 进入与排序规则 | 上限 / 移出条件 |
| --- | --- | --- |
| Intel（NOTICE / DEVICE / ORG） | 全部子类型有资格；按 `timestamp` 排序。Classified 对游客只返回锁定卡 | 无分类上限；删除或被全局最新 10 条挤出 |
| Voyager Activated | 可见的非 Architect 激活事件，按 `created_at` | 最多 2 条，只保留 7 天内 |
| Established World | 世界正式进入 stable 的 `world_established` 事件 | 最多 3 条；同一世界仅最新一条，不因 Final Asset 修改重复生成 |
| Device Update | 显式设备事件或已发布批次中的正式 Latest Update | 同一设备只留最新一条；普通资料修订不产生独立动态 |

Signal Tuning 和 Vote Open 不再进入 Updates。30 秒只是服务端缓存刷新间隔，不是内容有效期。

| Events 类型 | 开放规则 | 数量与排序 |
| --- | --- | --- |
| Vote Open | `is_active` 且未到期；游客可见，登录后移除已完成或无资格项目 | 最多 3 个，最近截止优先 |
| Signal Tuning | 世界当前轮次确实开放；游客可见，登录后只保留该用户尚可参与的世界 | 最多 3 个，实际开放时间倒序 |

两类事件交错排列。Dreamcatcher、Console Claim、World Submission、Voyager Quiz 和旧 Signal Dispatch 不进入 Dashboard Events，仍保留在各自所属功能页面。活动结束或完成后从相应用户的 Events 移出；游客点击需要登录的操作后返回原任务。

## 最新修正：紧凑布局与信息层级

Devices 导航已用原品牌图形替换手柄；欢迎标题统一 WELCOME, VOYAGER；Intel 保留首条宽图，后续条目使用右侧缩略图。Devices 城市标签居左。Voyagers 批次箭头使用共享 BatchTabs，首尾禁用且不覆盖标签。Worlds Live 新增独立加载占位，避免 WORLD RECORDS 闪屏。UI Kit 与原生离线展示同步；iOS 仍需原生视觉验收。

## 一级品牌区与二级页面

五个一级 Tab 共用 RootBrandHeader：移动端左侧原品牌图形与字标、右侧原操作入口。Your Path、Logs、详情页不使用此组件。桌面及带侧栏的横屏只显示侧栏品牌。UI Kit 和 iOS 离线根页面同步；缓存详情不显示品牌页头。

本轮品牌层级可在[一级品牌预览](https://putopia-git-codex-ui-primary-brand-weileleles-projects.vercel.app/console)与[对应 UI Kit](https://putopia-git-codex-ui-primary-brand-weileleles-projects.vercel.app/ui-kit)查看。此独立分支已完成视觉验证，等待并入正在整合的 ui-v23；原 ui-v23 入口在整合前可能仍显示上一版品牌规则。


### 未登录 Dashboard 恢复 · 2026-09-10

- 恢复原字标、图形标志、We own devices looking into parallel worlds.、受保护的设备原图与 View Device、Request Access / Login、原口径三项统计。生产统计继续读取真实服务端值，114 / ? / 2542 仅用于 UI Kit 对照。
- Request Access 复用既有激活流程与邀请参数；Login 保留原登录入口；View Device 进入 Devices。
- 游客完整品牌区与 RootBrandHeader 互斥；登录态仍为 Voyager 欢迎与身份状态；加载期间不预判登录态、不闪现小 Logo。
- UI Kit 使用同一个 DashboardGuestHeader。宽屏品牌介绍和设备并排，手机依照参考图顺序展示。
- iOS 离线默认页打包相同原图与访客展示；联网动作显示连接提示及重试入口。原生代码验证与设备视觉验收分别记录，不将 Web 预览视作原生安装包发布。

访客 Dashboard 的完整品牌展示同时替代桌面/横屏侧栏顶部的小 Logo；侧栏导航和账户入口保留。离线默认页沿用这一例外，其他页面的品牌层级规则不变。
