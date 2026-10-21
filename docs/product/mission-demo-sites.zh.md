# 世界互动Demo公开Sites发布

发布日期：2026-10-16。访问权限：public，任何持有URL的人可访问。

- 站点：https://multiverse-mission-lab.pufflele.chatgpt.site
- 模拟器：https://multiverse-mission-lab.pufflele.chatgpt.site/dev/mission-simulator/
- Observe：https://multiverse-mission-lab.pufflele.chatgpt.site/dev/mission-observe/

两个入口放在同一Site下，保留同源浏览器本地状态同步。同一浏览器的标签页可以联动；不同浏览器、设备或访问者不会共享模拟记录。公开访问不等于服务器多人联机。

## 发布记录

- project_id：`appgprj_6ad1efb863348191acf54227e21fecee`
- version：1
- version_id：`appgprj_6ad1efb863348191acf54227e21fecee~appgver_12ae19ec8dec8191b8281153706175f8`
- deployment_id：`appgdep_6ad1f03797c481919302cde0ef59cf89`
- source commit：`7ccc1676d4659071d4cb68c6db6e43c201c318cc`
- 原生Sites部署结果：succeeded；权限更新结果：public。
- 独立源码目录：`sites/mission-demo/`，该目录具有Sites管理的独立Git源仓库；后续发布复用其中`.openai/hosting.json`的project_id。

## 发布方式与验证

从原Demo复制规则引擎、状态层和组件，使用独立Next静态导出；Observe的URL查询参数改为客户端读取。复制所需本地字体和世界素材，未复制任何环境配置、认证、广告、API或Service Worker代码。源代码已通过Sites源助手提交推送，并以相同提交对应的静态归档保存发布。

独立静态构建通过。发布前静态预览、发布后两个HTTPS入口均验证成功。线上按键蓄能超过3秒后发射，规则110使个人与集体U/D从4/4变为5/5，Observe另一标签页自动收到同一事件`shepherdess-110-5`，含Ada、Unit-01、时间和前后值。线上验证未出现登录页面。

角色动画、完整24h视频与自动语音转写仍沿用[原Demo限制](mission-demo-verification.zh.md)。

## 2026-10-16 事件画面更新（v2）

- 新增牧羊女与机器人各四张事件静帧（两张图集），模拟器与 Observe 共用。
- 新增 Rule to preview / Preview selected rule，所有14个世界规则组合均测试命中目标规则。
- 当前世界预演会替换测试历史，准备前置条件，再通过正常能量发送引擎执行，结果同步 Observe。
- Sites v2: `appgprj_6ad1efb863348191acf54227e21fecee~appgver_95eb63779880819187f48f32524fbccb`。
- 源码提交：`f0ba2c3b0748117e9e308014f9771f1d3565eb33`；部署 `appgdep_6ad1f642e97c81919be51915bc97df78` 成功，公开权限不变。
- 验证：723项测试、根项目及静态站构建、类型检查均通过；源码 lint 无错误（25项既有警告，排除独立 Sites 的生成文件），变更文件 lint 无警告；手机390px无横向溢出；本地与线上规则30事件及 Observe 联动验证。
