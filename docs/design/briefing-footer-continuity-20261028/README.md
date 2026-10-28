# 简报底色连续性与包裹文案 · 2026-10-28

用户指定移除包裹页中的 `One a month; contiguous US only, shipping and taxes included.`，保留 `Tap a pack to see what is inside.`。

用户截图指出前两页底部提示区存在颜色断层：页面为黑底，新增的 74px 提示区透出 stage 默认深蓝底色。修复为前两页的整个 stage 同步使用其既有黑底；第 3–8 页仍使用原深蓝。保持提示位置、字号、44px 命中区、内容滚动、点按与埋点行为。

## 验证

用生产构建和占位凭据运行现有只读 `/dev/voyager-initiation` 夹具，不创建账号、邮件或支付。

- 390×844：[第一页](01-device-mobile.png)与[第二页](02-collective-mobile.png)的 active page 与 stage 计算背景均为 `rgb(0, 0, 0)`；footer 透明，沿用相同黑底。底部已无深蓝色块。
- 第 3 页去除 cinematic 标记，active page 与 stage 均恢复 `rgb(8, 12, 32)`。
- [包裹页](03-packs-mobile.png)只显示保留的操作提示，删减文本不再出现。
- 1280×720：[桌面首屏](04-device-desktop.png)检查同样的底部连续性。
- 保持原 Console 视频、字标、字体、色值与留白；对照[上一轮参考](../briefing-tap-navigation-20261028/README.md)，只修复外壳与既有页面的底色匹配并删减指定短句。夹具会员与席位并非线上数据。

设计检查、TypeScript、lint（0 errors）、899 项测试和生产构建通过。未新增与样式或文案实现重复的单元测试；使用实际渲染验收。
