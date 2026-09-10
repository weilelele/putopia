# UI 组件完整说明

> **2026-09-10 最新展示规则：游客与登录态头部互斥。** 游客显示原三个数字指标，登录后统一显示 WELCOME, VOYAGER 欢迎与个人身份状态（实际身份在角色标签显示）；两块不叠加。内容区不重复放品牌 Logo；恢复桌面/横屏统一侧栏中的原品牌、导航和账号区域。Intel 列表、新闻详情及 Updates 中的新闻条目保留作者头像（紧邻昵称）和图片。UpdateTimeline 与 EventRail 必须执行已确认的内容池、上限、去重和完成态规则。




版本 2.3 · 2026-09-09 · 从属于 [权威 UI 规范](../design-system.md)。

本文是组件设计与实现合同。尺寸是 CSS px 的实施默认值；所有组件继承主规范的颜色、字体、触控、焦点、动效和状态规则。**「目标」表示待构建能力，不是现有 TypeScript API。设计方向已确认，尺寸和映射为实施默认值，各 C01–C28 的产品实现均待逐项验证。** 跨页行为以 [导航与交互合同](interaction-contracts.md) 为准。 不新建另一套与 Archive 并行的组件库。

## 1. 组件层次与目录

| 层 | 组件/模式 | 用途 |
| --- | --- | --- |
| 基础 | Typography、Icon、Divider、Surface | 所有界面的基础表达 |
| 页面框架 | CompactPageHeader（目标）、PageHeader、SectionHeading、AppShell；BrandHeader 用于一级入口及特定展示场景 | 紧凑任务标题、可选品牌展示、容器与滚动 |
| 导航 | BottomNav、Sidebar、BackLink、Tabs、FilterBar、Pagination | 路由、返回、内容切换和浏览 |
| 动作 | Button、LinkButton、IconButton、Menu | 一般动作与低频操作 |
| 内容 | Card、LinkCard、ListRow、MediaFrame、Metadata | 卡片、档案列表和图片视频 |
| Dashboard | UpdateTimeline、UpdateRow、EventRail、EventCard | 最近动态与参与集合 |
| 状态 | StatusLabel、StatStrip、Progress、StepProgress | 状态、指标与进展 |
| 输入 | Field、Input、Textarea、Select、Choice、Search、Upload | 常规表单与媒体提交 |
| 身份与讨论 | Avatar、RoleBadge、MemberRow、CommentThread | 成员、身份、交流 |
| 反馈 | Loading、Empty、Error、InlineNotice、Toast | 异步与操作反馈 |
| 覆盖层 | Dialog、BottomSheet、Popover | 临时决策、辅助内容 |
| 复杂内容 | DataTable、RichText、LiveObservation、QueueItem | 后台、正文、实时房间 |

这些是同一系统的模式名；未实现的模式不要求全部各造一个文件。先组合现有基础组件，多处复用时再抽象。

## 2. 框架与导航

### C01 · AppShell

结构：跳至内容链接 → 桌面 Sidebar / 手机 BottomNav → main 内按层级选择的页头与页面内容 → 全局反馈层。AppShell 按显式页面模式提供一级品牌区，二级及更深不注入 BrandHeader。页面壳负责宽度、滚动和安全区，业务页面不重复添加第二个 main、标题或底栏。

- 390px 宽度：内容左右 16px，只有一个主要纵向滚动容器。
- ≥768px 切换桌面 Sidebar。两种导航消费同一份路由配置、顺序、名称和权限逻辑。
- 底栏实际高度加安全区再加 24px，作为内容尾部补白；文字放大导致栏高改变时同步补白。
- 根据导航与交互合同的路由矩阵处理浏览/专注任务、键盘和覆盖层；登录、后台、newsletter 保留独立流程壳，不能一刀切加底栏。迁移时核查 route/layout 与业务出口。
- 全页 loading 保留稳定外壳；局部 loading 不重建整个 shell。模态焦点与滚动由覆盖层统一管理。

### C02 · BrandHeader / ArchiveBrandHeader（一级入口与品牌展示）

这是可选的品牌组件，允许用于五个一级入口及欢迎、登录、关于、公共介绍、文档封面；二级列表、详情、参与步骤和表单弹层不使用。五个一级页统一采用主规范 §1.3 的默认品牌区，不让各页自行选择大小和间距。

- 一级：图形宽 40px、字标宽 160px、间距 12px、四周净空至少 8px，左右页边距 16px，品牌区最小 64px；其后单独显示一次页面 h1。其他品牌展示可用 48/184px 起点。
- 原图等比 contain、不重画、不滤镜；长字/窄屏不拉伸图片。
- 一级 Logo 默认非链接且不吸顶；明确品牌展示中的链接按实际目标命名，不能统一叫返回 Home。
- 移除二级品牌组件时连同专属空白一并移除，不删除原始资产。
- 当前 ArchiveBrandHeader 默认 href 为 `/console`、aria-label 仍含 home；需要补可选非链接模式和尺寸模式，不能假定现 API 已支持。

### C03 · CompactPageHeader / PageHeader / SectionHeading

CompactPageHeader 是目标模式，优先由现有 ArchivePageHeader 扩展实现，不另造独立样式系统；紧凑标题已由共享样式实现。二级及更深默认替代品牌栏和重复页标题；一级保留克制品牌区，页面名称仅辅助技术可见，不显示重复 Tab 标题，也不预留标题占位。

| 模式 | 左侧 | 标题与语义 | 右侧 |
| --- | --- | --- | --- |
| 一级 Tab 必要操作行 | 无返回，不预留空图标位 | 页面名称为 sr-only h1，不占布局空间 | 保留 Voting Hub / Logs / Profile / Archive 等既有入口；无操作时整行省略 |
| 二级列表 | 返回实际来源，无来源用稳定父级 | 24px/700 页面名称，h1 | 最多一个必要动作 |
| 详情 | 返回实际来源，无来源用稳定父级 | 20px/700 简短上下文；正文完整长标题为 h1 | 有真实需求才出现的操作 |
| 编辑/提交/参与 | 返回或关闭，两者按任务选一 | 24px/700 任务名称，h1 | 必要保存动作；不与正文主提交按钮重复 |
| 弹层 | 直接显示标题 | 20–24px/700，按页面层级使用 h2 或关联标题 | 44px 关闭按钮 |

- 实施默认值：二级/任务内容最小高 56px，一级无可见标题行（品牌区最小 64px，必要动作命中至少 44px）；左右 16px、图标 20–22px、图标命中 44×44px、相邻内容间距 8px，正文紧随其下 16px。高度不包含顶部安全区；放大与长标题可自然增高。
- 根标题左对齐，不用左右空白按钮硬凑居中；标题优先，动作无法容纳时次要内容移到正文。禁止靠省略、缩字隐藏必需任务名称。
- 一页一个 h1。详情栏只放返回/上下文，完整文章或对象标题保留在正文；同一标题不在栏内和正文重复。
- 日期是元信息，不是装饰。没有真实操作时右侧留空，不新增菜单、头像或通知。Voyagers 可放 My Profile，Dashboard 不可放。
- 默认非吸顶；需要吸顶的流程单独登记，保护焦点、锚点和键盘显示。模态打开遵守 C24，不将页面标题栏放到遮罩上。
- 目标合同包括 title、页面模式、返回/关闭动作、可选尾部动作和标题语义；这些需经正式 API 设计后实现，不把本文当作已支持的参数。
- SectionHeading 保持 20px/700，下面间距 12–16px；Dashboard 的 Updates、Events 为区块标题，不重复 Dashboard。

### C04 · BottomNav / Quiet Rail

这是已确认的底栏样式。五项等宽，全宽背景与页面连续；**仅一条浅色顶线，无围框、竖线、底边、选中底色块、凸起中心入口**。

| 项目 | 目标 |
| --- | --- |
| 顺序 | DASHBOARD、INTEL、DEVICES、WORLDS、VOYAGERS |
| 默认目标 | `/console`、`/intel`、`/devices`、`/worlds/live`、`/voyagers` |
| 图标 | lucide-react，22×22，统一 strokeWidth=1.5；映射见下表，不自绘 HUD |
| 图标语义 | LayoutDashboard / FileText / Gamepad2 / Globe / Users；分别对应五个入口 |
| 标签 | Courier Prime，12px，正常字距，完整拼写 |
| 图标到标签 | 6–8px |
| 栏高 | 72px 内容区 + 底部安全区 |
| 未选中 | 灰白 55% 或更高，经对比度检查 |
| 选中 | 橙色图标和标签；顶线上的 24×2px 短橙条对齐该项中心 |
| 触控 | 整个等宽格可点，至少 44×44 |

通用图标映射（实施默认）：返回 ArrowLeft；关闭 X；前后 ChevronLeft/ChevronRight；更多 Ellipsis；搜索 Search；成功 Check；错误 CircleAlert；忙碌 LoaderCircle（减少动态时静态）；上传 Upload；删除 Trash2。以上导出已核对当前 lucide-react 存在；图标装饰隐藏，独立按钮另有具体可访问名称。

`aria-current="page"` 表达当前入口，图标装饰隐藏于辅助技术。不用 `role=tab`，这是路由导航。禁用或登录门槛要有原因；鉴权 loading 保留真正目标，不闪现错误锁定。

当前底栏有自绘图标，样式和图标需统一升级。截图中的 HOME、设备图标内框差异不照抄。正常 390px 必须五项完整同排；320px 和 200% 字体放大按主规范降级，不缩为 HOME。

主入口激活映射见页面文档：`/profile`、`/logs`、`/voyager-path` 等也应能体现 Voyagers 归属；最终通过共享映射覆盖移动和桌面，不只依赖字符串前缀。

### C05 · Sidebar / BackLink

Sidebar 沿用相同的五项名称、顺序和归属；活跃项采用橙字与细边标记，避免五张大橙卡。低频账户入口通过 Voyagers 组织，Dashboard 不增加个人资料快捷区。桌面不能出现与手机不同的 Worlds/Voyagers 顺序。

BackLink 标签反映实际目的地：有可信应用来源时返回来源，跨 Tab 也如此；无来源才回稳定父级。如 Dashboard 打开 Log，Voyagers 高亮，但返回显示 Back to Dashboard。恢复筛选、位置和焦点，不仅依赖浏览器 history。重复点击当前 Tab 不隐式刷新；完整合同见导航与交互合同 §2。命中最少 44px 高。

### C06 · Tabs 与 FilterBar

**Tabs 切换内容面板；FilterBar 筛选同一集合。** 两者可共享外观，但不能无差别使用 tablist 语义。

- 外观：44px 最低触控高度，13px 标签，12–16px 水平内距，选中橙字 + 2px 下划线；无每格围框。
- Tabs：tablist、tab、tabpanel 成对，稳定 id/aria-controls/aria-labelledby；仅当前 tab 在普通 Tab 顺序内。左右方向键移动，Home/End 到首尾；异步面板用 Enter/Space 确认切换，避免移焦即请求。
- Filter：互斥选项可用 radio 语义，或按钮配 aria-pressed；多选明确可同时启用。变化后保留焦点，播报更新结果数量，不把焦点跳到页首。
- 标签多时允许该行横滚，选中项滚入可见区；不压缩字号。不同时用「下划线 + 大底色 + 厚边框」三重强调。
- count 只显示真实值；没有计数就省略。切换不能丢掉讨论/提交草稿。
- ArchiveTabs 已支持方向键、Home/End 移焦、disabled、panelId；通过 Enter/Space 确认切换。房间面板使用稳定 panelId 关联标题；FilterBar 使用 mode="filter" 和 aria-pressed。

### C07 · Pagination / Menu

Pagination 用上一页、下一页与当前位置；手机不展开大量页码。翻页后焦点保留在合理位置，给新结果提示；失败时保留上页。总量未知不用假的页数。

手机前后卡片按钮使用 ChevronLeft/ChevronRight。低频菜单用一个有名称的 IconButton 打开，列表行高至少 44px；支持键盘、Esc、点击外部关闭与焦点返回。删除等危险操作与普通项分组，不能只靠红字区别。只有真正的菜单交互才使用 menu 语义，普通导航列表仍用链接。

## 3. 动作、卡片与媒体

### C08 · Button / LinkButton / IconButton

| 变体 | 用途 | 外观 |
| --- | --- | --- |
| primary | 当前决策主动作 | 橙底 + 深蓝字，可选单右上切角 |
| secondary | 查看、替代路径 | 深色/透明底 + 灰白边线 |
| ghost | 返回、低优先动作 | 无框，清晰文字和必要下划线 |
| destructive（目标） | 删除等真实危险操作 | 明确动作文案 + 错误语义；确认后执行，不伪装为普通主动作 |
| icon-only（目标） | 关闭、展开、翻页 | 图标 20–22px，命中 44×44，有名称 |

默认高 48px，紧凑高 44px，左右内距 16px，图标间距 8px；标签 13–16px，至少 12px。fullWidth 用于手机表单、卡片主动作，不把所有文字链接拉成按钮。

按钮执行动作，链接导航。原生 disabled 只用于按钮；链接没有 disabled 原生语义，不传一个无效属性就以为禁止导航。目标 loading 保留文字，显示进度且防重复提交；成功失败按真实返回反馈。图标非必需，不给每个按钮加箭头。

ArchiveButton 已支持 primary、secondary、ghost、destructive、fullWidth、loading 和 size（default/compact）。ArchiveLinkButton 保留导航语义，支持 primary、secondary、ghost、fullWidth。边框必须看得见，不能把 10% 分隔线直接当次按钮边界。

### C09 · Card / LinkCard / ListRow

- Card 是内容容器，不自动可点击。默认 16px 内距、12px 内容间距、平面深蓝；只有需要边界时才加 1px 灰白线。
- LinkCard 整卡导航，确保一个清晰的可访问名称；不在整卡链接内再嵌套按钮/链接。需要多个动作时用普通 Card 和独立动作。
- ListRow 用图片（可选）+ 标题 + 最少必要元信息 + 可选右侧动作，行间细线。正文保持自然阅读，不强迫每行成固定高的截字盒。
- 普通 Card 默认不切角；突出主卡可用一个右上切角，内部主 CTA 可改普通几何以避免叠加。
- 悬停只暗示可点击对象。ArchiveCard 的 actionable 目前只加 CSS，**不会赋予键盘或按钮语义**；迁移时使用正确的 LinkCard 或 button，不能把 div 当动作。

### C10 · MediaFrame / Metadata

| 内容 | 比例与模式 |
| --- | --- |
| 普通世界/活动封面 | 默认 16:9；受控裁切且记录焦点 |
| Dashboard 缩略图 | 390px 下 120×64，3:2，固定左图右文 |
| 成员头像 | 40/48/64px 正方形；身份头像可圆形，不把卡片都胶囊化 |
| 产品原始结构图 | contain 保全轮廓；不能裁掉重要结构 |
| logo | 永远 contain，不能滤镜、裁切 |
| 视频/摄像头 | 先占稳定比例，控制栏可操作；不用图片伪装 LIVE |

图片有来源、alt、加载与失败策略。失败时显示「Image unavailable」等中性文字，不补随机生成图；可读文本与详情动作仍保留。一般缺图直接省略媒体；不能为缺图记录留一个大空洞。

视频不强制有声自动播放。静音自动播放仅在产品确需时，仍提供暂停/静音/全屏控制。音频用真实播放器或真实波形，不用假波形充当数据。iframe 需 title，加载失败有可执行替代方式。

Metadata：类型、作者、时间、状态最多保留当前任务需要的项，12/13px。时间可短显但完整值可访问；不能为了档案感新增虚构编号。

## 4. Dashboard 专用模式

### C11 · UpdateTimeline / UpdateRow

输入的**目标数据合同**：稳定 id、发生时间 occurredAt、类型 label、标题、可选短说明、可选 media(src/alt)、可选真实目标 href。它是适配层合同，不要求后端改成这些字段名。

规则：只接受 Intel、Voyager Activated、Established World、Device Update，应用分类上限与实体去重后取最近 10 条；不足不伪造。按 occurredAt 降序，同时间用稳定 id 排序。Classified Intel 保留锁定卡但不传正文/作者/媒体。最新消息不得自动插入使阅读位置跳动；可显示「有新动态」刷新提示。

390px 的基准计算：内容宽 358 = 时间列 36 + 间距 12 + 图宽 120 + 图文间距 12 + 文本宽 178。时间线和节点属于独立时间列；照片不塞进时间轴节点。

- 行高随内容增长，带图最小约 104px（80px 图片 + 上下各 12px）；不能把 10 行压进一个 844px 视口。
- 图片 120×64，左图右文；分类 12px、标题目标 14/700、说明 13px，图文间 12px。标题最多建议两行，但必要名称可增长。
- 无图行移除图片列，正文占时间列右侧全部宽度，不留空框。无图行按内容高度自然排布。
- <360px 可将时间列改 32px、首间距 8px、缩略图 96×56，保留图文间 12px。200% 字体放大时允许时间移至行上方，确保阅读，不缩字。
- 使用 ol 表达顺序，time 的 dateTime 保存完整时间，时间线和圆点不重复播报。
- 行目标是详情或对应操作时才可点击；无目标动态是普通内容。Dashboard 动态不堆评论数和一排按钮。
- loading 用 3–4 行稳定骨架并标记忙碌；空态、错误、部分图片失败分别处理；不能出现十条虚构占位内容。

### C12 · EventRail / EventCard

目标数据合同：id、title、简短目的、可选 image、availability、真实 action(label/href 或 handler)、可选真实截止时间/资格原因。只接受 Vote Open 与 Signal Tuning；两类各最多 3 个并交错。Vote 按截止时间，Tuning 按开放时间，不套用 Updates 时间倒序。

- 一个横向滚动列表，手机卡宽约可视内容区的 84–88%，间距 12px；第一张清楚完整，下一张露出约 24–48px。实际值按 padding 与 viewport 校准。
- 卡片结构：16:9 媒体（可选）→ 类型 → 20px 标题 → 一至两行说明 → 真实状态（必要时）→ 一个动作。内距 16px，同轨道 CTA 对齐，但不硬截长文字。
- 禁止改成两列网格，禁止自动轮播。可用 scroll-snap；滑动与页面纵滚不互相抢夺。
- 键盘可逐卡进入动作；桌面提供前后按钮和可见的当前位置，手机也不能只依赖手势访问。到头按钮禁用且状态明确。
- 无图活动用文字版，不伪造封面；单活动不显示无意义的滑动提示，空集合说明当前暂无可参与活动。
- 开放 → 主动作；已参与 → 查看结果/参与记录；已结束 → 查看结果或明确关闭；无资格 → 原因和真实解决路径；提交中 → 防重复；失败 → 原地重试。
- 「进入活动页」不是「已完成参与」。图中每张卡可有主按钮，但不能在同卡中再放两个同等级主动作。

## 5. 状态、进度与身份

### C13 · StatusLabel / RoleBadge

12/13px 文字 + 可选 6px 状态点或 14px 语义图标。默认无大底色、无大圆角胶囊；若需边框，仅中性细边。在线、近期画面、录播、离线用不同文字，不能全叫 LIVE。

RoleBadge 表示真实角色；Architect、Voyager 等称谓来自权限数据，不通过颜色推断权限。不用整卡绿色/金色表示级别。状态变化用适度 live region，避免每秒反复播报。

### C14 · StatStrip

label + value，最多三个自然相关的指标，以细线或空白分隔。手机空间不足可换行；数字 20px、标签 12/13px。未知显示破折号加说明，0 只表示真实零。

只有确有目标的指标才用链接/按钮，不能把纯统计做成假入口。没有真实指标需求就不加条带，Dashboard 不为填版补会员等级/个人积分区。

### C15 · Progress / StepProgress

连续数值用 progress：轨道 4–6px 高、真实比例，提供当前/最大值和文字。加载未知总量用无确定进度状态，不编造百分比。

离散阶段用 step list：已完成、当前、未开始、异常分别用形状与文字表达；当前橙色，完成可用中性色勾选，绿色仅小范围真实成功提示。每步允许长名换行，不生成四块彩色大卡。

Devices 的阶段来自订单/批次状态，不从日期推断自动完成。拟议视觉的 Preparing / Pack One / Pack Two / Console 只是对已有阶段的呈现；业务名称和状态映射应先核对现有源。没有服务端 ETA 不显示秒级倒计时。

### C16 · Avatar / MemberRow

头像 40/48px 用于列表、64px 用于身份块；图片缺失用真实姓名首字母或中性人物图标，不随机生成真实成员照片。姓名为首要信息，角色/批次为次要信息。

MemberRow：头像 → 姓名 + 角色/短简介 → 可选一个目标。点击进入什么必须有真实路由；不要把所有人物都链接到当前用户的 `/profile`。个人资料主入口位于 Voyagers 页面标题或独立身份区。

### C17 · CommentThread / Composer

列表按业务顺序，作者、时间、正文、必要回复动作；回复层级在手机限制缩进，避免正文越挤越窄。正文 16px，元信息 12/13px；长链接可断行。

输入 label 常驻，发送高 44–48px；空白/提交中不重复发送。失败保留正文与附件，重试不复制已成功提交内容。只有授权用户显示编辑/删除。空评论区给真实参与引导，不补假对话。切换 Devices 讨论或 Worlds Live Chat 时保留草稿。

## 6. 表单与选择

### C18 · Field / Input / Textarea

结构：label → 可选简短帮助 → 控件 → 错误或补充说明。label 与控件间 8px，字段组间 24px。必填和可选明确，placeholder 不是 label。

- 单行输入至少高 48px，内距 12px，正文 16px；textarea 最小约 120px 高，允许纵向调整或自增，不能挡住提交。
- 深色平面底、1px 可辨识灰白边线、2px 圆角，默认无切角；focus 由统一橙色轮廓表达。
- 默认、focus、filled、readonly、disabled、invalid、loading 均需样例。readonly 允许选中文本，不能弱化到看不见；disabled 说明原因。
- 错误在提交或合适的失焦时出现，不每输入一个字符就打断；aria-invalid 和 aria-describedby 关联稳定 error id。多字段失败先显示摘要并定位首个错误，保留所有值。
- 不用 color-star-deep 作为必要帮助文字。不把密码/邀请码装饰成伪终端，不把输入标签画在切角边框中。
- ArchiveField 已提供 label、helpText、error、稳定说明 id 与 aria-invalid/aria-describedby 关联。ArchiveInput / ArchiveTextarea / ArchiveSelect 透传原生字段属性、事件及 ref，覆盖文字、密码、数字、日期、文件、范围、复选和单选类型；不接管业务校验或提交。它们与 /ui-kit 的 FORM-02 共用实现。

### C19 · Select / Search / MemberPicker

原生 select 优先用于简单选项，复杂 searchable combobox 仅在数据量需要时采用；均需常驻 label。单行高 48px。

Search：输入 + 清除 + 结果区；清除命中 44px，查询中不删除已有结果，明确无结果与加载失败。异步结果处理过期请求，键盘上下选择、Enter 确认、Esc 关闭；焦点不能进入不可见选项。MemberPicker 不将尚未确认的人加入已选状态。

筛选可同步 URL 以便返回/分享，但不把敏感输入写入 URL。默认全部的清除操作应恢复明确状态。

### C20 · Checkbox / Radio / Switch / ChoiceCard

控件视觉约 20–22px，label 与控件合计命中至少 44px；checkbox 表多选、radio 表互斥、switch 表立即开关。大面积选项可用 ChoiceCard，但仍保留原生选择语义。

选中使用橙色 + 勾/点，不能仅变底色。fieldset/legend 表达问题组，说明是否必选、多选上限。禁用给原因；服务端保存失败要回滚或明确未保存。需要最后提交的选项不用让人误以为已即时生效的 switch。

### C21 · Upload / Attachment

结构：类型与限制说明 → 选择文件动作 → 已选文件/预览 → 上传进度 → 单文件错误/重试/删除。移动端提供系统选择入口，拖拽只是增强。

文件类型、大小、数量来自真实后端限制，文档不编造阈值。上传成功不等于业务提交成功。失败保留其他成功项和表单文字；取消上传与删除既有内容语义区分。预览图片有文件名，删除按钮有具体名称。

## 7. 反馈与覆盖层

### C22 · Loading / Skeleton

骨架用静态深蓝表面与细线，不用发光/扫光渐变。尺寸匹配真实内容，避免图片加载后大幅跳动。局部容器 aria-busy，简短状态用 polite；装饰骨架隐藏于辅助技术。超过正常等待提供仍在处理的明确状态，不伪造完成比例。

### C23 · Empty / Error / InlineNotice / Toast

| 模式 | 内容 | 行为 |
| --- | --- | --- |
| 空集合 | 这里会出现什么 + 适用下一步 | 不显示虚假记录、不一定需要按钮 |
| 无搜索结果 | 当前条件无匹配 + 清除筛选 | 不暗示服务故障 |
| 局部失败 | 哪个模块失败 + 重试 | 保留其他模块与输入 |
| 整页失败 | 清楚标题、说明、重试、返回 | 保留可用导航，不循环重试 |
| 权限不足 | 当前无法访问的原因 + 登录/申请路径 | 不泄露不可见内容 |
| 完成 | 真实结果 + 下一步 | 重要结果留在页面可再次阅读 |
| Toast | 简短非关键确认 | 不承载唯一错误说明或必须阅读的结果 |

提示使用中性容器和语义图标，不整框强色。错误 role=alert 仅用于需及时告知的变化，避免页面十个 alert 同时播报。Toast 实施默认 5 秒，hover/focus 暂停，可关闭；含重要行动则留存至处理，不只依靠计时消失。

### C24 · Dialog / BottomSheet

适用：短决策、必要确认、简短 Dream 描述等临时任务。多步骤、长文、复杂附件和独立恢复地址用专注任务页；选择依据见导航与交互合同 §4。手机 BottomSheet、宽屏 Dialog 共享内容与状态，跨断点不丢输入。

- 背景为实色半透明遮罩，不 blur。容器深蓝、细边，默认 2px 圆角；不使用巨型圆角和投影。
- 手机宽度占可用屏幕，最大高度按动态视口约 90%；内容区可滚，标题和必要动作不被键盘遮挡。宽屏短对话框最大约 480px、复杂表单 640px。
- 结构：标题 + 明确关闭 → 正文/表单 → 主动作 + 次动作。长表单不为了弹窗高度缩字体。
- role=dialog、aria-modal、名称关联；打开设置合理焦点，Tab 留在模态内，Esc 发起关闭并经过退出保护，真正关闭后将焦点还给触发器。背景不可交互，关闭后恢复滚动位置。
- 关闭/返回/Esc/遮罩统一遵守导航与交互合同 §4–5；表单 Sheet 默认不启用下滑关闭。上传/提交/结果未知不能统一当作可直接丢弃；关闭不等于取消服务端操作。
- 危险操作先展示具体对象和影响，再确认；不要给普通可逆浏览动作都加确认弹窗。

### C25 · Popover / Tooltip

短辅助内容、非核心解释。重要说明必须在页面/表单可见，不仅在 hover tooltip。支持键盘 focus，触摸有可点触发；不遮挡操作，不越出窄屏。需要复杂表单或长文本时改 Sheet/Dialog，不在小浮层嵌多层滚动。

## 8. 复杂内容模式

### C26 · DataTable / Admin Form

表头 13px、数据 14/16px，行高至少 44px；对齐文字与数值，稳定列宽。后台可以更密集，但不低于 12px，不改成另一套灰色品牌。

手机优先关键字段卡片视图；确需列间比较时局部横滚并保留行识别信息。排序按钮有名称与当前方向；批量选择显示真实选中数量，分页后明确选择范围。危险批量操作不能因视觉改版自动触发。

加载、空、无结果、失败、权限、部分失败均有局部状态。行内菜单与整行导航不能嵌套交互元素。

### C27 · RichText / Article

阅读列最大 720px，正文 16px/1.6，段间 16px；h2 24px、h3 20px。链接明显且可 focus；列表、引用、代码块、附件、图片说明共享间距。代码可局部横滚，不带动整页。

保留真实叙事与作者信息；不为减少字数删掉业务条款或操作说明。媒体允许独立宽度，但文字不拉满大屏。外部内容安全处理沿用既有方案，视觉组件不放宽渲染信任边界。

### C28 · LiveObservation / QueueItem

观察模块组合 MediaFrame + 来源/时间 + StatusLabel + 内容说明。严格区分直播、录播、最近抓帧、离线；缺少连通数据不能标 ONLINE。全屏/静音/刷新等动作有名称。

队列行显示真实位置、对象、状态、必要操作；排队、等待用户选择、处理中、成功、失败是不同状态。更新不强行抢焦点或跳滚动。容量和 ETA 来自配置，不从效果图硬编码。与业务规则的具体映射见页面模板。

## 9. 现有代码与迁移缺口

截至本次源代码核对；此表不等同于浏览器验收。

| 当前组件 | 现有能力 | 本轮目标差距 |
| --- | --- | --- |
| [ArchiveBrandHeader](../../src/components/archive-brand-header.tsx) | className、href；使用原始 logo | 一级与品牌展示场景保留，二级移除；新增静态模式并修正链接名称 |
| [ArchiveButton](../../src/components/archive-button.tsx) | 原生 button 属性；fullWidth、primary/secondary/ghost | 对比度、完整状态；loading/size 等需正式扩展 |
| [ArchiveLinkButton](../../src/components/archive-link-button.tsx) | href、原生 anchor 属性、fullWidth、三个变体 | 链接禁用策略、状态与按钮一致 |
| [ArchiveField](../../src/components/archive-field.tsx) | children、label、htmlFor、error、className | 帮助/错误 id、aria 关联、统一控件状态 |
| [ArchivePageHeader](../../src/components/archive-page-header.tsx) | title、accent、action、identity、hideTitle、className | 扩展紧凑标题栏模式，一级 hideTitle 保留 sr-only h1 与必要操作，无标题占位 + 品牌区、二级 56px 最小高度、24/20px 标题、返回/关闭语义；identity 不放 Dashboard |
| [ArchiveTabs](../../src/components/archive-tabs.tsx) | activeId、ariaLabel、items(id/label/count)、onChange、containerRef | 键盘、id/面板关联、禁用与 focus |
| [FilterBar](../../src/components/filter-bar.tsx) | 复用 ArchiveTabs 的选择外观 | 按筛选语义修正，不一律 tablist |
| [ArchiveCard](../../src/components/archive-card.tsx) | div 属性、actionable CSS | 不将 CSS 可点击态当真实交互 |
| [ArchiveLinkCard](../../src/components/archive-link-card.tsx) | Next Link 与 href | 卡片焦点、长文、嵌套交互检查 |
| [ArchiveStatStrip](../../src/components/archive-stat-strip.tsx) | label/value；可选 color/expanded/href/onSelect | 统一状态色和真实指标；不滥用 |
| [ArchiveRouteLoading / Error](../../src/components/archive-route-state.tsx) | 路由骨架、错误、重试与返回 | 局部状态层级、布局与文案校准 |
| [BottomNav](../../src/components/bottom-nav.tsx) | 五主路由、鉴权 loading、部分隐藏策略 | Quiet Rail、统一图标、完整子路由归属 |
| [Sidebar](../../src/components/sidebar.tsx) | 桌面导航与身份区域 | 五项顺序/名称与手机统一、资料归属 |
| [PathStatusBar](../../src/components/path-status-bar.tsx) | 身份、路径、设备状态组合 | 拆清内容归属，保留真实业务能力 |
| [CommentThread](../../src/components/comment-thread.tsx) | 既有讨论组件 | 按 C17 校准状态、输入与布局 |
| [MemberPicker](../../src/components/member-picker.tsx) | 既有成员选择 | 按 C19 验证键盘与异步状态 |
| [RoleBadge](../../src/components/role-badge.tsx) | 既有角色显示 | 收敛尺寸/语义色，不改角色逻辑 |

ArchiveSectionLabel、BackLink、媒体封装和 AdminNav 延续共享入口，按对应规则校准。UpdateTimeline、EventRail、标准 Sheet/Toast 等模式是否单独抽出组件，在实施时检查已有相似实现后决定；本文件不宣称已经新增。

提交失败必须有明确服务端依据；超时或断网用结果未知，不盲目允许再次写入。表单、上传、投票和队列共同遵守 [导航与交互合同 §5–6](interaction-contracts.md)。

## 10. 每个组件的交付标准

- 文档注明用途、不要用于什么、尺寸、状态、行为与真实数据要求；标记设计状态与实现状态，不把批准等同于实现。
- 可执行样板按导航与交互合同 §7 的 NAV-01/02、SHELL-01、FORM-01、SUBMIT-01、LIVE-01 逐项交付，在现有 `/ui-kit` 复用真实组件。
- `/ui-kit` 有默认、长文/缺图、focus、disabled、loading、empty/error、success 的适用示例；不适用状态标 N/A，不造无意义状态。
- 390px 可用，再查 320/360px、200% 放大、桌面；触控、焦点、辅助名称完整。
- 业务数据由父层/适配层提供；基础外观组件不直接访问生产数据库。
- 新 API 明确兼容与迁移调用点；不传一个现有组件不支持的 prop 伪装完成。
- 每个新视觉变体说明为何不能由现有变体组合完成，避免页面专属按钮/卡片家族。


## 已实现的交互组件（2.3）

- `ArchiveSheet`：`open`、`onClose`、`title`、`dirty`、`busy`、`children`。使用原生 dialog 管理背景不可交互、焦点范围和焦点返回；Escape、关闭及遮罩统一走草稿确认。提交进行中不允许关闭。父级在确认丢弃后清理自己的草稿，不把关闭视为提交成功。
- `PrimaryNavigation`：Web 底栏和桌面侧栏共用五个目标、图标、顺序与所属判断。`activePath`/`onNavigate` 仅用于受控展示；产品默认读取实际路由。
- `UpdateTimeline`：`updates` 包含稳定 id、真实 occurredAt、分类、标题、链接和可选图片。缺图不补作者头像；正文摘要两行，详情保留完整内容。
- `EventRail`：`events` 横向排列，前后按钮与触摸滚动共用当前位置，使用减少动态偏好。参与资格由服务端计算，不能从卡片显示推断写入权限。
- `useSessionPreference` 只保存当前会话中的页面筛选，不保存私人内容、草稿、权限或提交结果。
- `LaunchScreen` 是 iOS 离线启动层；Web `/welcome` 使用原 FlipWordmark。进入时播放一次，点击随时跳过；动画完成后再停留 3 秒自动进入，跳转只发生一次。

Dashboard 顶部数字看板使用 ArchiveStatStrip，保留原统计口径与展开说明交互，采用新版平面三列样式。ArchiveStatItem 的 controls 对应说明容器 id，expanded 对应展开状态；规则见页面模板的“顶部数字看板”。

主 CTA 使用 Courier Prime 16px / 400、至少 48px 高、橙底深蓝字和一个右上切角；轻量右上入口使用 12–14px / 400、44px 命中、不铺满整行。不得用旧版小号粗体按钮或重复卡片边框代替参考图层级。

## 新闻媒体与两种 Dashboard 头部

- `DashboardStats` 只用于游客：无外框，细分隔线，32–48px 数值，12px 指标，保留点击指标查看原口径的交互。
- `DashboardVoyagerHeader` 只用于登录用户：欢迎 → 圆形头像/昵称/身份/Path → 待参与数/设备天数；正文与次级文字用灰白色，橙色用于角色和关键数字，不能整卡都染成橙色。设备天数保留原口径。
- `PublisherIdentity` 在昵称左侧显示 32px 圆形头像；紧凑 Updates 为 24px；没有头像时显示昵称首字母，占位不改变行高。
- `NewsMedia` 在列表直接显示最多四张附件；一张为单列，多张为两列；保留自然色，点击进入原详情。超过四张显示数量提示，详情保留全部图片。
- 新闻图片和作者身份是内容，不得为模仿生成图而移除。数据权限仍由原接口控制，锁定新闻不泄露正文、附件或作者信息。
