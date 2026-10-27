# Initiation 方案切换修复验收 · 2026-10-27

基于远端 `main` 的 `6852591f`。原工作区的未提交修改保留在原处。

## 问题与证据

- 用户报告选择 $38 后没有跳转，$488 可以继续。
- 只读检查线上购买页：已显示 `Checkout is unavailable. Check existing orders and seat availability on Initiation.`，但位置在 Delivery 下方，用户截图的可见区域没有包含它。
- 只读检查生产库：当时只有一笔活跃的 Initiation 订单，为 `standard / pending / 48800`，已有 Stripe Session、没有保存的 PaymentIntent。创建时间为 `2026-10-27 04:50:44 UTC`，预留到期时间为 `05:25:44 UTC`。没有读取或记录用户身份。
- `reserve_initiation_v2` 要求待支付订单的方案与本次选择相同，否则抛出 `Existing checkout requires reconciliation`。因此 $488 复用成功，$38 无法创建新订单。
- Vercel 对所查接口的运行时错误和最近日志没有提供额外信号；诊断依据是线上可见报错、订单状态和预留函数代码。

## 修复行为

- 两个结账入口共用 `createInitiationCheckout`，因此登录购买和邮箱直接购买都经过同一修复。
- 同一方案仍复用原来的订单与 Session。
- 切换方案前核对旧订单及 Stripe Session 的归属、金额、币种、运行模式与商品元数据。先使未付款的旧 Session 过期，确认无法继续付款，再条件更新旧订单为 canceled，最后走现有预留函数创建新方案。
- 若旧 Session 有 PaymentIntent，还须确认其已取消且没有收款。已付款、处理中、审核中、丢失 Session 绑定、超时或并发变化时，均保留旧记录并停止切换。
- 错误提示放在购买按钮后、Delivery 前；提示获得焦点并滚动到视口中部，避免被底栏遮住。
- Stripe 仅允许使 open 状态的 Session 过期；详见[官方 API](https://docs.stripe.com/api/checkout/sessions/expire)。

## 验证

- `npm run design:check`、`npx tsc --noEmit`、`npm run build`：通过。
- `npm run lint`：0 errors，26 个现有 warnings。
- `npm test`：98 个文件、852 条测试通过，其中新增 35 条切换与支付保护回归测试。所有测试均使用内存依赖，无数据库、网络或环境变量访问。
- 浏览器使用 `/dev/voyager-initiation?state=pending&qa=1` 与本地假配置，未加载生产服务密钥。
- 手机 390×844：选择 $38 并点击后，错误提示获得焦点，顶部约 402px、底部约 441px，完整可见。
- 桌面 1280×900：改选 $488，按钮价格同步更新；点击后错误提示获得焦点，顶部约 440px、底部约 460px。
- 沿用设计系统和既有 CSS：Courier Prime、品牌橙 / 深蓝 / 灰白文字、原字号和间距。按钮和方案卡结构、图片均保留，仅调整错误提示的位置及焦点行为。

修复前参考：用户提供的手机截图。

![修复前：错误位于截图可见区域之外](before.png)

![手机：错误紧邻购买按钮且自动进入可见区域](phone-error.png)

![桌面：$488 选择与错误反馈](desktop-error.png)

未创建、取消或支付任何生产订单，未修改生产配置；无需数据库迁移。真实 Stripe 跳转尚待在隔离支付环境或正式发布后验收，当前证据为纯逻辑回归测试和无支付副作用的浏览器用例。
