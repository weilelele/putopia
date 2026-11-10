# 主次按钮排版统一 · 2026-10-28

用户要求：同组主次按钮的字体、字号、字重和行高一致，统一 Courier Prime、16px、400；检查其他页面并通过 PR 上线。选定参考为用户提供的 [过期页问题截图](reference-expired.png) 和 [登录页问题截图](reference-login.png)，并保留正式域名的 [过期页修改前](expired-before-mobile.png) 与 [登录页修改前](login-before-mobile.png)。

## 根因与修改

共享 ArchiveButton / ArchiveLinkButton 原先使用 13px / 700，后置 primary 样式单独改成 16px / 400；实际线上过期页分别为 16px / 400 / 24px 与 13px / 700 / 19.5px。现在将四项文字属性集中到 `.archive-button.archive-button`：`var(--font-mono)`、`var(--fs-body)`、400、1.5（24px），删除 primary 的单独文字覆盖。按钮和导航链接保留各自原生语义。

源码审查覆盖基线 417 处共享组件调用及对应局部 CSS / 内联样式。同步处理仍使用 `.btn-*` 的旧操作入口；删除世界操作区的小字号／短行高、激活成功页的 700／1.3 覆盖，以及后台 Orders、Quiz、Signal Tasks、Onboarding Editor 共用按钮内联小字号／粗体。现场 Device / World 主动作的原生链接补齐同一行高。激活成功页调整内距后，两按钮仍为 52px 高。

导航与筛选、图标按钮、身份／数值卡片及其多层文字按各自角色保留；例如后台 Orders 的筛选和侧栏账号文字仍为紧凑导航排版。没有将整站所有文字、身份数字或正文强制改为按钮样式。

## 实际页面与组件验收

以 390×844 竖屏为主；过期页另验 320×844、登录／过期／共享样例另验 1280×900。使用最终 Next 生产构建，验证最终 CSS 合并顺序。需要账号的后台使用只监听本机的模拟认证和数据服务；没有提交后台表单、发送邮件或修改生产数据。

| 页面 / 场景 | 实际结果与截图 |
| --- | --- |
| `/auth/expired` | 主次按钮同为 Courier Prime / 16 / 400 / 24，高 48px；[手机](expired-after-mobile.png)、[320px](expired-after-narrow.png)、[桌面](expired-after-desktop.png) |
| `/login` | AUTHENTICATE / REQUEST ACCESS 同一排版；[手机](login-after-mobile.png)、[桌面](login-after-desktop.png) |
| `/console` 游客 | REQUEST ACCESS / LOG IN 同一排版；[手机](dashboard-after-mobile.png) |
| `/voyagers` 游客 | REQUEST ACCESS / LOG IN 同一排版；[手机](voyagers-after-mobile.png) |
| 激活成功引导 | EXPLORE INITIATION / BACK TO DASHBOARD 同一排版、高 52px，原照片及布局保留；[手机](welcome-after-mobile.png) |
| `/ui-kit#buttons-01` | 原生按钮／LinkButton、primary／secondary／ghost／destructive、compact、disabled 以及 world-actions 都为 16 / 400 / 24；[手机](kit-after-mobile.png)、[桌面](kit-after-desktop.png) |
| 带按钮的 Dialog | Cancel / Continue 同一排版；[手机](dialog-after-mobile.png) |
| `/admin/orders` 模拟创建表单 | 取消／创建动作均为 16 / 400 / 24；[手机](admin-orders-after-mobile.png) |
| `/admin/quiz` 模拟编辑表单 | CANCEL / SAVE QUESTION 均为 16 / 400 / 24；[手机](admin-quiz-after-mobile.png) |
| `/admin/signal-tasks` 模拟创建表单 | 切换与创建动作均为 16 / 400 / 24；[手机](admin-signal-after-mobile.png) |
| `/admin/onboarding-preview` 模拟编辑器 | 重载／新增动作均为 16 / 400 / 24；[桌面](admin-onboarding-after-desktop.png) |

[完整计算样式记录](computed-styles.json) 包含字体、字号、字重、行高，以及选定页面的控件尺寸。登录／过期页 390px、过期页 320px 和成功引导 390px 没有横向溢出。加载状态通过 UI Kit 本地开关验证：标签保持原文字、16 / 400 / 24，按钮禁用且带忙碌状态。Dialog 可打开并关闭；禁用动作保留禁用语义。登录页从主按钮按 Tab 可到次按钮，实测保持 2px 焦点轮廓及 3px offset，且文字仍为 16 / 400 / 24；[键盘焦点](login-focus-desktop.png)。普通按钮的换行、边界及颜色沿用共享组件，无路由或业务行为修改。

## 与原参考的对照

字体仍为现有 Courier Prime；主按钮维持 16px / 400，次按钮由 13px / 700 放大、减重，行高由 19.5px 统一为 24px。底色、边框、按钮位置、原页面文案、原素材与主次层级保持原意图。布局允许长文案自然换行，不使用缩字解决空间问题。没有新增渐变、光晕、阴影、模糊、HUD 或品牌颜色。

## 验证

- `npm run design:check`：通过。
- `npx tsc --noEmit`：通过。
- `npm run lint`：0 错误；26 个原有警告。最终修改文件的定向 lint 通过。
- `npm test`：105 文件、895 测试通过。
- `npm run build`：通过。
- React 检查：只移除内联排版属性并补充共享组件的本地样例；无新增 Hook、服务端动作、外部请求、嵌套链接或权限变化。

范围限制：这是普通操作按钮与相关覆盖的收敛，不声称已经逐个打开所有生产数据详情、后台记录或原型。实际验收页面、只读／本地数据边界及例外均列于上表；不需要数据库迁移、环境变量或真实付款／发信测试。

final result: passed
