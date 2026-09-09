# UI 2.3 · 组件替换验收记录

> 2026-09-10 最新更正：此前“所有一级页保留 Logo”“Events 只按用户资格筛选”与“已做浏览器检查即可算视觉完成”的描述已取代。当前应用内容页无 Logo、Events 公开可见，并要求逐页参考图与实际截图对照。下方旧轮次记录仅供追溯。

## 最新修正

- Intel：Voting Hub 右上轻量入口；重点内容 32px 标题、16px 正文与主 CTA，Recent 轻列表；详情继续承载完整正文与媒体；发布按钮移至内容尾部，避免遮挡。
- Voyagers：My Profile 右上轻量入口；原统计看板保留；方形肖像与轻列表，简介/统计/社交/编辑仍可展开；Voyager Logs 是成员列表下方主按钮。
- Dashboard：Events 对访客直接显示所有开放活动，先展示不同操作类型，保留所有后续卡片。参与权限与业务写入未变。卡片宽度、主 CTA 字号及底部对齐修正；Updates 收紧行高，保留至少 12px 可读文字与真实媒体。
- Devices / Worlds：Archive 右上轻量入口；Devices 无直播时使用已有批次图并标明未连接，Archive 可打开批次选择；Worlds 操作位置统一。没有伪造直播、持有关系或设备状态。
- 全部应用页和 iOS 离线默认页移除 Logo 及占位；启动动画与品牌资产保持。UI Kit 同步入口位置和主 CTA。离线快照保留公开 Events，旧缓存兼容；离线不承诺可以参与。

实际比较证据与剩余验收边界见仓库根目录 design-qa.md。未做过截图对照的页面继续标记待验收，不作为还原完成。

---


本轮继续使用 `codex/ui-v23`。范围是替换交互组件与视觉呈现，保留页面内容、业务功能、路由和数据权限；没有进行生产数据回填。

## 实际替换

- 初始批量迁移为 63 个文件、464 个控件，见 [逐文件清单](control-migration.json)。随后补充 Profile 照片选择按钮、Reel 页码按钮、原生范围控件、房间 Tabs 等人工修正。
- 原生 button/input/textarea/select 迁入 ArchiveButton / ArchiveInput / ArchiveTextarea / ArchiveSelect。文件选择、ref、name、受控值、表单动作、校验约束和业务处理器继续透传。
- 清理 95 处局部视觉覆盖；共享字号、边界、焦点、禁用和选中样式集中维护。输入使用 16px，单行至少 48px，textarea 至少 120px。
- 取消旧的 Tabs 围框、分隔格和橙色铺底。Devices / Worlds 面板使用 ArchiveTabs，支持方向键移动焦点、Enter/Space 确认以及明确面板关联。路由切换保留链接语义。
- 修复一级页头在 flex 页面中被压缩的问题，解决 Intel 的操作与筛选重叠。移除旧页面噪点背景；统计数字不再滥用成功/警告色。
- Profile 窄屏表单单列、照片选择目标 44px；保留所有字段、订单和保存/退出行为。
- Worldflow 保留现有世界列表、步骤、素材、审核及制作操作；接入共享控件、紧凑标题和主按钮对比度。
- 三个产品 HudField 调用已退役。历史 demo、视觉实验室和投资演示不作为产品组件验收样板。

## 2026-09-10 一级页头收敛

五个一级 Tab 移除重复页面名称及标题占位，保留原 Logo 和既有 Voting Hub、Logs、Profile、Library、Archive 入口。Web 页面名称保留为 sr-only h1，二级 Logs / Profile / 对象详情的可见标题仍然保留。可交互 UI Kit 和 iOS 离线五 Tab 同步，不变更内容与业务流程。

本次复核：五个一级页 390px 无整页横溢，页面名称均不占布局空间；Voyagers 320px 的 Profile / Logs 入口仍有 44px / 48px 命中高度；Logs 二级标题保留且无品牌块；UI Kit 一级样板不再显示重复标题。iOS 本次通过类型与配置检查，真机验收状态不变。

## Dashboard 数据与媒体修复

Signal Tuning 使用已有 Signal 素材封面规则：最近两个已发布任务，优先有投票的最新一日的最高票视觉素材，否则取最新一日首个可用视觉。视频只使用海报，不把 mp4 当图片。查询按任务批量读取，投票记录分页读取。

Established World 同时包括实际阶段转换事件，以及已建立世界的 Final Form 素材发布事件；后者明确写“Final form published”，使用素材真实创建时间，不把历史世界创建时间伪称为进入 Established 的时间。Device update 补接可见活动日志。一个来源失败时保留其他来源，显示不完整提示。

Events 的 Signal Dispatch 取当前用户实际可参与世界的真实封面。没有封面字段的普通投票保持文字卡，不伪造图片。原有资格、截止时间、库存、任务及队列筛选未改变。主 CTA 改为橙底深蓝字，摘要和长标题按组件规则收敛显示，正文仍在原详情页。

Updates 仍然全局时间倒序取十条。当前数据中较旧的 Intel 和 Vote opened 不会为了展示类型而插入最近十条。

## Web / iOS

联网 iOS 壳加载同一套 Web 组件；原生离线页同步橙色时间轴、120×80 缩略图（小于 360px 为 96×64）、下划线页签和 14px 列表标题。新封面通过既有离线快照媒体收集流程进入缓存；离线 Events 继续明确需联网确认参与资格。启动动画规则保持“播放完成后再等三秒，任意时刻点击可跳过”。

## 已检查范围

- 390px：Dashboard、Intel、Devices、Worlds、Voyagers、Profile、Worldflow、UI Kit 真实浏览器只读检查。
- Dashboard：10 条更新的 10 张缩略图全部成功；Signal Dispatch / Dreamcatcher 图片成功；投票无封面时为文字卡。320px 和 1280px 均无整页横溢；桌面仅侧栏，Events 卡宽 340px。
- Profile：输入 16px、标签关联正常；照片按钮可访问名称和命中尺寸已修正。未保存个人资料。
- UI Kit：错误 aria-describedby / aria-invalid 与焦点定位通过；弹层焦点进入、草稿关闭确认通过；原生范围控件通过键盘从 50 到 51；文本/选择器/textarea 尺寸检查通过。
- 原表单属性静态比对：迁移清单中的 name/value/checked/disabled/required/ref/accept/处理器均保留；人工重组仅限房间 Tabs 和范围控件，已沿用相同状态更新函数。

付款、上传提交、审核、资料保存等生产写入未执行。此次不是所有角色、所有数据状态、所有深层业务流程的端到端验收。iOS 仍需真机网络切换、键盘与安全区复核；未发布 TestFlight 或合并 main。

## 顶部数字看板恢复

恢复 Logo 下方的 Parallel Worlds / Devices / Voyagers 三项看板与点击展开说明。使用新版 ArchiveStatStrip、颜色、字号和点击状态；统计沿用原来源与 Voyager 展示倍率，Devices 继续为“?”。独立处理统计失败与重试。UI Kit 增加同组件样板；iOS 快照新增可选 dashboardStats，保留旧缓存兼容，缓存不足时展示未知值，不使用局部离线列表长度推算全量。

本次看板复核：390px / 320px 无横向溢出，三项数字基线对齐；展开／收起说明通过。离线快照可选统计字段及非法值校验测试通过。真机运行验收仍待完成。

### 本轮补充：恢复 Voyager 欢迎与身份状态

Dashboard 在已登录时依次显示 Voyager 欢迎/身份状态、原数字看板、Updates、Events。身份模块保留头像（展示）、View your path、个人待参与数和原设备天数；My Profile 管理入口仍属于 Voyagers。离线快照保留状态并注明已保存，旧快照字段缺失时显示未知，不伪造 0 条待参与。

本轮已并排核对 Intel / Voyagers / Devices / Dashboard 参考图和 390px 实现，另检查 Worlds、Logs、Profile、UI Kit；完整审查范围与差异记录见仓库 `design-qa.md`。这不代表所有二级路由或 iOS 真机状态已经验收。
