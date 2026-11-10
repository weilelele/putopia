# Android 安装引导 · 2026-10-29

## 发布范围

- Dashboard 首行采用已有纯文字 Intel 的日期、INTEL、标题、发布者与单行摘要，不增加配图、箭头或置顶标签。只对 Android 普通浏览器显示；系统报告安装完成后立即隐藏，独立 PWA 与原生 iOS 壳不显示。
- 点开共享居中 Dialog，再点 Add to home screen 调用真实 `beforeinstallprompt` 安装事件。事件单次消费，防止重复调用；接受、取消、失败和不支持时都有对应反馈。没有可用事件时提供 Chrome 菜单操作说明，不把“不支持”误报为安装成功。
- 邀请不写数据库、不创建 Intel 或 NPC 内容，不占用原动态池的 10 条名额。无迁移，无邮件发送。
- `/install` 是公开、无需登录的安装落地页，提供菜单指引、邮件内置浏览器转到 Chrome 的说明、复制链接和返回 Dashboard。iOS/电脑访问时只说明目前支持 Android，不提供未就绪的 iOS 下载按钮。

## 安装入口排查

- 原正式站自定义安装入口只有 `PwaInstallNudge`，已删除该组件、专属状态逻辑和旧测试，并移除 Dashboard 引用。
- 现在正式站的自定义安装操作只有 Dashboard 确认弹窗和 `/install`，共用 `PwaProvider.promptInstall`。浏览器自身提供的安装菜单不受影响。
- 先前主工作区的 `/dev/dashboard-install` 是未提交的本地模拟效果页，未纳入本发布分支。

## 邮件用法

推荐按钮文案：**Save Collective to your Android phone**。

固定链接：`https://www.multiverseco.org/install?source=email`

```html
<a href="https://www.multiverseco.org/install?source=email">Save Collective to your Android phone</a>
```

邮件点击只打开网页；安装必须由用户在支持的 Android 浏览器里再次点击确认。不要在邮件里链接到模拟页或直接声称下载 APK。`source=email` 会进入安装分析事件，不发送任何邮件。

## 验证

- `npm run design:check`、`npx tsc --noEmit`、`npm run lint`、`npm test`、`npm run build`。初次检查：0 lint errors，26 个既有 warnings，107 个测试文件、928 项测试通过；生产构建通过。
- 浏览器在开发专用、未提交的事件 fixture 中使用真实 PwaProvider/正式组件，验证没有事件时的指引、接受、取消、调用异常、安装完成隐藏，以及关闭后再次打开不残留错误。三个新事件各调用一次 prompt；appinstalled 后邀请数为 0。fixture 已移除，不发布。
- [普通纯文字 Intel 对照](../design/android-install-20261029/text-row-390.jpg)：两行共用组件，标题均 14px、摘要均 12px，均无缩略图。[确认弹窗](../design/android-install-20261029/dialog-390.jpg) 使用共享外壳。390×844、320×844 无页面横向溢出。Escape 关闭后焦点回入口。
- 邮件链接页面在普通浏览器中可打开、可复制链接，并显示 Android 适用说明。
- 本地占位环境日志只有未配置 PostHog token 的既有初始化错误；事件 fixture 没有安装处理未捕获异常。
- 事件 fixture 不等于真机系统安装验收；实际 Android 安装仍由支持浏览器的安装条件和系统确认决定。

final result: passed
