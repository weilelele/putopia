# UI 2.3 实现与验收记录

2026-09-09。设计批准、代码实现、验证和正式发布分别记录。当前权威入口是 [design-system.md](../../design-system.md)，产品内 `/ui-kit` 使用真实共享组件。旧版 golden screens 和海报哲学文档保留历史记录并标记废弃，不再指导开发。

## 实现范围

- 全站共享颜色、字体、字号、平面容器、按钮、页头、五 Tab 导航和详情返回。一级品牌区沿用原 PNG；二级及深层页面移除重复 Logo。管理、认证、申请、付款结果和加载页同步基础样式。
- `/ui-kit` 替换旧静态样板，覆盖主导航、来源返回、按钮、输入、筛选、弹层、草稿退出、必填校验、提交中/成功/未知、加载/空/错误/离线；样例只使用本地数据。
- Dashboard 使用独立 Updates 和 Events 数据模型。Updates 为各来源真实时间戳汇总后的全局最新 10 条；Events 按资格、待办、投票完成情况、截止时间、设备状态与库存显示横向行动卡。
- `/welcome` 是独立启动页。普通根入口及 PWA 进入这里；点击任意处或键盘 Enter/Space 立即替换为 `/console`，未操作时 3 秒后替换。直接访问详情和活动入口保留原目的地，不被启动页打断。减少动态效果时显示原文字 Logo 静态图。
- iOS 启动动画和原品牌字形随包打包，计时不依赖网络；结束后显示 Dashboard 或原生离线 Dashboard。WebView 和离线页使用统一五 Tab、颜色、字体及层级。未缓存状态仍显示导航；不伪造离线可参与活动。
- 编辑与创建弹层共用原生 HTML dialog 的焦点约束、背景隔离、关闭和草稿确认。提交结果未知时先检查记录，禁止无条件重复提交。

## 数据边界

Dashboard 的 World Established 新事件写入已有 `activity_events` 表，仅在实际阶段转换时记录；重复更新海报不重复记录。没有真实转换时间的历史世界不使用创建日期伪造迁移事件。Signal Tuning 使用实际 Signal Thread 时间。无需数据库结构迁移，本次未执行生产数据回填。

分类内容和离线快照在服务端去除受限正文/媒体。离线媒体只渲染已缓存本地文件，缺失记录明确提示联网加载。Events 的可用性独立于 Updates 的历史记录。

## 预览入口

[播放启动动画](https://putopia-git-codex-ui-v23-weileleles-projects.vercel.app/welcome) · [可交互 UI Kit](https://putopia-git-codex-ui-v23-weileleles-projects.vercel.app/ui-kit) · [Dashboard](https://putopia-git-codex-ui-v23-weileleles-projects.vercel.app/console) · [改版 PR](https://github.com/weilelele/putopia/pull/142)

Vercel 预览沿用项目现有登录保护，需要有权限的 Vercel 账号。产品页面仍遵循原来的产品登录权限。此分支未合并生产。

## 验证与发布

本地记录：Dashboard 在 320px/390px 无横向溢出，Updates 为 10 条；启动页点击退出及自动约 3 秒退出均通过；UI Kit 的弹层焦点、背景锁定和草稿确认已实测。Worlds、Web 离线页在 390px 渲染正常；Intel、Devices、Voyagers、Logs 受现有登录保护而跳转登录页，登录后界面仍待验收。

代码检查包括设计增量检查、Web TypeScript、ESLint、Vitest、生产构建；iOS 包括 TypeScript、Expo 配置、JS/资源导出以及启动 Storyboard 编译。结果以提交与 PR 中最终日志为准。

**尚未等同于正式上线或完整真机验收：** 生产共享服务上的付款、创建、个人资料保存等写入流程未通过测试数据执行；不能把静态检查视为这些业务流程已通过端到端测试。iOS 尚未提交签名发行包/TestFlight，需要发行流程和真机安全区、键盘、网络切换验收。预览与正式发布分别记录在 PR。

## 页面清单

[routes.json](routes.json) 枚举每个页面、加载和错误入口，并区分页级改动与共享基础样式覆盖；没有独立运行过的流程标记待验收，不宣称全部已验证。三个迁移 JSON 是编辑清单，不是测试通过证明。
