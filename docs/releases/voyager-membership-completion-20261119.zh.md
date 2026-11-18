# Membership 试单与返回主站修复 · 2026-11-19

## 过期购物车的授权

Shopify 托管购物车可以在本地 35 分钟席位预留到期后继续提交付款。原对账代码会直接跳过已过期并标为 canceled、尚未绑定授权的本地订单，造成 Shopify 已授权而会员未激活。

`schema_v128.sql` 在 S26 的同一行锁内重新核对资格、剩余席位、其他有效付款/结账、升档来源和退款状态。仅仍符合条件的过期预约会恢复并绑定授权，然后走原来的精确验单与捕获流程；不能取得席位或资格已变化时，服务端取消尚未捕获的授权，不发起退款或额外收费。正在捕获、已退款、已替换、资格不明的订单不会直接复活。

v128 **已应用生产**，名称 `v128_shopify_late_authorization_recovery`。应用后席位仍为 90，绑定函数保持 security invoker、仅 service_role 可执行。生产公开 Membership 开关仍关闭，等待这笔用户试单的捕获、激活和退款权限验收。

验证：1,056 项 Vitest、TypeScript、lint（0 errors / 26 existing warnings）、design:check 与生产构建通过。PGlite v128 覆盖过期后/到期任务前授权、当前其他结账优先、关闭/满额拒绝、已持席位会员满额升档及客户端 ACL；实际路由隔离联调覆盖迟到授权继续捕获、退款回收权限，以及无可用席位时仅撤销授权而不捕获。v127 全套会员、退款及 Parallax/Mission 权限回归通过。

## Continue shopping

Shopify 当前 Horizon 主题（162070855871）的 `layout/theme.liquid` 在 `<head>` 后加入 `scripts/shopify/storefront-home-redirect.liquid` 中的首页跳转。仅 Shopify 首页跳至 `https://www.multiverseco.org/`，主题设计模式不执行。结账、订单状态与政策页不套用首页条件。

已在真实浏览器验证 Shopify 首页落到主站 `/welcome`，不会停留在空的 Shopify 店面。原主题保留，可删除这段首页条件撤销修改。

## Membership 商品图片

使用现有原始品牌资产 `public/icons/icon-512-maskable.png`：512×512、深色底橙色图形 Logo，无新绘制或变形。应用于 Shopify 的 Voyager Membership 商品图片，不改变已选定的 Initiation 权益圆图。

## 实际付款和异步退款

受控 $12 试单经正式 Shopify Payments 授权、捕获及 webhook 对账后，账号实际成为 Voyager，席位由 90 到 91，无 Pack/Console 权益。真实登录页面显示 $26 Initial、$476 Complete 的会员升档报价，390×844 无横向溢出。

已在 Shopify 针对该试单提交全额 $12 原路退款，取消补库存。供应商当前显示 Refund pending；尚未宣称财务退款成功，也未提前回收成功付款的权限或席位。Shopify 说明退款可在处理期间保持 Pending，见 [Shopify Payments refunds](https://help.shopify.com/en/manual/payments/shopify-payments/payouts/refunds)。公开 Membership 入口在最终退款权限验收前仍关闭。

新增 pendingRefund 证据标记，保留原对账队列直到供应商确认 SUCCESS/FAILURE/ERROR，即使后续 webhook 漏送，也由现有每五分钟任务继续读权威订单。已有成功的部分退款先按成功金额同步，其他 Pending 退款继续跟进；未完成的退款不作为成功退款金额。隔离实际路由验证 Pending → SUCCESS 在没有第二条 webhook 时仍会关闭会员并释放席位。

同步最新主线的 Shopify 结账诊断后，共 1,085 项纯测试通过；TypeScript、lint、design:check、实际路由联调和生产构建通过。隔离付款联调继续屏蔽诊断传输，不向生产发送测试分析事件。该退款补充不改数据库结构，不需要新迁移。
