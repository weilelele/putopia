# Guest 访问检查 · 2026-09-25

范围：检查 Web 路由策略、客户端身份判断、公开页面调用的 server actions 与相关 API；检查 mobile 包装层是否另设 Tab 门槛。浏览器使用游客状态验证。没有更改数据库权限、运行迁移或执行参与/支付写入；这不是完整安全审计。

## 本次已调整

- 五个主 Tab（Dashboard、Intel、Devices、Worlds、Voyagers）全部允许游客与未完成注册的会话浏览。
- World Archive、公开 Intel/World 详情和设备批次/讨论阅读页使用相同公开浏览规则；详情返回按钮回到所属档案。
- Intel 的 Classified 内容继续使用原有角色权限和数据库策略，不因入口开放而解锁。
- 修复 WorldPoster 封面的 fill 与固定高度冲突；此前会导致世界档案整页进入错误边界。

主要位置：`src/lib/access-policy.ts`、`src/proxy.ts`、`src/lib/auth-context.tsx`、`src/app/intel/[id]/page.tsx`、`src/app/worlds/[id]/page.tsx`。

## 仍然存在的限制 / 体验差异

| 位置 | Guest 当前行为 | 建议 / 本次处理 |
| --- | --- | --- |
| `/vote` | 整个列表跳登录；Dashboard Events 可以看到公开投票入口 | 剩余浏览阻断，建议后续开放列表，只在投票时登录；本次保留 |
| `/logs` | 整个 Voyager Logs 列表跳登录 | 剩余浏览阻断，建议后续开放已发布内容；本次保留 |
| `/logs/[id]` | 与列表不一致：proxy 未对详情做同样的 Guest 门槛；读取函数用 admin client 限定已发布且有视频的故事 | 后续统一列表/详情规则；列表门槛不能作为内容保密边界 |
| Intel / Vote 的 Classified | Voyager 及以上才可查看 | 保留内容级角色权限 |
| 评论、Dreamcatcher Live Chat | 可读；发言需要登录 | 保留；`comment-thread.tsx`、`dreamcatcher-chat.tsx` 及写入 actions/API |
| 描述梦境、世界上传和修改 | 提交需登录；部分管理操作还有所有者/角色要求 | 保留；`worlds-live-room.tsx`、`actions/worlds.ts`、上传 API |
| Signal Dispatch / 任务回应 / 投票 | 可浏览公开信号；回应、投票需登录，并满足任务或投票资格 | 保留；`SignalFeed.tsx`、`actions/signal-tasks.ts`、`actions/votes.ts` |
| 设备批次关注 | Guest 点击后进入登录 | 保留；`batch-actions.tsx` |
| 批次讨论参与 | 公开阅读；参与需要登录及批次设备持有资格或 Architect 权限 | 保留；`actions/device-batch-community.ts` |
| 设备认领与购买 | `/devices/claim` 登录后进入；checkout 再检查身份/资格 | 保留；`proxy.ts`、两类 checkout API |
| `/profile` / MY PROFILE | Guest 跳登录；编辑自己的信息需要账号 | 保留；Voyagers 公共列表已开放 |
| `/devices/my-consoles` | 页面可打开，但 Guest 的订单/设备返回空列表 | 体验问题：空态写“此账号没有设备”，建议 Guest 显示登录查看个人设备提示 |
| Quiz / Voyager Path / 会员进度 | Guest 没有个人任务进度；提交和身份激活需账号 | 保留；`actions/quiz.ts`、`actions/tasks.ts`、`actions/membership.ts` |
| Dashboard / 侧栏 | Guest 显示公共统计、登录入口；不显示个人待办/身份详情；PWA 安装提示只给登录用户 | 身份状态差异，不阻挡公开浏览 |
| 推送设备注册 | 需要登录 | 保留个人通知归属 |
| Admin / Studio | Architect 或特定 onboarding 授权 | 保留管理权限 |

`/vote` 与 `/logs` 的列表限制集中在 `REGISTRATION_REQUIRED_ROUTES`，并未在本次主 Tab 开放中扩大修改。对于已有 session 但尚未完成注册的用户，未列入公开例外的其他页面仍由注册引导拦截；不能仅用真正匿名 Guest 的结果推断这些页面的体验。

## 遗留代码

- `src/components/nav.tsx` 仍有把所有 Guest 链接替换成登录地址的旧逻辑，但当前源码没有该组件的使用点。实际主导航使用 `PrimaryNavigation`，不改写 Guest 链接。
- `src/components/access-gate.tsx` 仍保留旧体验限时门槛，目前没有组件使用点。
- `mobile` 中发现 Guest 离线身份类型与个人推送注册逻辑，没有发现独立的主 Tab 登录拦截规则；离线快照继续遵循原有数据访问边界。

## 验证

- 390×844 游客状态：Intel 公开任务正常、Classified 保持锁定；Voyagers 显示同伴；Worlds 实时房间和 World Archive 可阅读。
- 设备头部三张整机静态图均保留中央及两侧显示器；手动循环切换。
- 设备地点切换前后滚动位置均为 441px，头图仍保留所选第三张；浏览器返回恢复上一地点且不跳顶。
- 路由单元测试覆盖公开 Tab、详情例外、受限操作，以及设备批次共享滚动状态。
