# 高频弹窗迁移验收 · 2026-10-11

基线 origin/main 0df3da7。原工作区未改动，使用 codex/dialog-migration 独立工作区。

## 已检查

- 390×844：UI Kit 中展开 Product profile editor · local fixture，打开实际 ProfileView，展开 BIO & LINKS，标题与保存按钮固定，正文内部滚动。截图见 profile-editor-390.jpg。
- 在本地内存样例中修改姓名、Escape 触发放弃确认，Keep editing 返回编辑；保存后身份名更新。保存通过 footer 的 form/id 关联原表单，无新增账户或存储请求。
- MemberProfileContent 保留头像失败回退、成员身份、位置、简介、统计、加入时间及社交链接，四个入口复用；不改数据读取权限或服务端写入。
- 领取确认：主分支已有 footer 和 busy 保护，本轮代码复核，无实际领取或付款操作。
- npm run design:check、npx tsc --noEmit、npm run lint、npm test、npm run build 均通过；lint 0 errors / 25 warnings，79 test files / 590 tests。

## 尚待人工验收

- 预览分支的登录态真实成员详情、本人编辑只打开/取消；真实保存会写入共享产品数据。
- 实体 iOS/Android 软键盘、200% 系统字体、头像上传失败和长业务错误。
- 第三批场景见 inventory.md；全站源码盘点不等于全站视觉验收。

无数据库迁移、业务权限、支付或生产配置变更。
