# 会员化版本发布记录 · 2026-10-09

当前状态：发布候选版本，尚未部署会员版，正式收款关闭。

## 发布范围

- $520 一次性 Initiation；旧 $12 Initial Pack 会员继续加入价 $400。
- Stripe Hosted Checkout 收集地址；先授权，校验美国本土州及 DC 后扣款。
- 四个 Pack、会员权限、设备自主选择及 Claim 二次确认；Pack 3 显示所选批次。
- 收货并绑定实体设备后才成为 Console Holder。
- 部分退款保留数字权益、冻结实体履约待管理员处理；全额退款撤销本次权益，旧 $12 权益独立。
- NPC 登记、内部语言配置、头像队列、成员资料和容量说明。
- 个人资料编辑弹窗、统一 Dialog；保留最新主干的账号注销、屏蔽、举报及 Worlds 投票改动。
- 旧设备付款、旧包裹付款及聊天入口退役，已有记录保留。
- 题库后台服务端管理员检查；题库及两张 outreach 表只允许服务端读取。

## 已确认的正式环境配置

Stripe 账户 acct_1TeNZZA6e1upDxOq，产品 prod_VPModfWvLA6dtp。

| 类型 | Price ID | 金额 | 状态 |
| --- | --- | --- | --- |
| Standard | price_1UOY53A6e1upDxOqEJT1FHCQ | USD 52000 cents | live, active, one_time, inclusive |
| Legacy upgrade | price_1UOY53A6e1upDxOqAdHsB3kN | USD 40000 cents | live, active, one_time, inclusive |

Webhook we_1TgCkiA6e1upDxOqurCLqSdF 已修正为 https://www.multiverseco.org/api/stripe/webhook，保留原签名密钥，订阅九种 Checkout / PaymentIntent / refund / dispute 事件。历史事件 evt_1UO4ieA6e1upDxOqXDjaV8RC 重投获得 HTTP 200；这不是所有历史失败订单已完成核对的证明。

Vercel production 已配置产品、两个价格、US、shipping/taxes included，以及 INITIATION_CHECKOUT_ENABLED=false。S26 数据库 checkout_open=false。未进行真实扣款。

## 迁移记录与版本号冲突

两条开发线使用过同号文件。保留主干已提交文件，会员历史迁移保存为：

- schema_v83_initiation.sql：原会员 v83；与主干设备状态 v83 不同。
- schema_v85_initiation_roster.sql：原会员 v85；与主干 first observer v85 不同。
- schema_v87_npc_initiation.sql：原会员 v87；与主干内容举报 v87 不同。

这些文件保留原 SQL 内容，不因注释中的旧状态而再次执行。生产迁移历史确认：initiation_bootstrap_v83_and_granted_roster_v85、npc_s26_atomic_registration_v87、initiation_payment_access_and_member_device_choice_v90_v88_v89_v91、npc_deferred_roster_check_auth_context、npc_private_voice_profiles、v94_receipt_binding_partial_refund_access、v95_protect_server_only_quiz_and_outreach 已应用。

会员新环境依赖顺序：83_initiation → 85_initiation_roster → 87_npc_initiation → 90 → 88 → 89 → 91 → 92 → 93 → 94 → 95。隔离测试在创建相应依赖后使用等价顺序。不要按文件名字典顺序批量重放生产 SQL。

v95 生产读回确认：quiz_questions / outreach_log / outreach_replies 均启用 RLS，anon/authenticated 无读取权限，service_role 保留 CRUD。公开题目由服务端投影，不返回 answer_key。题库 action 权限补丁需随应用部署才生效。

## 验证

合并最新主干后：76 个测试文件、576 项 Vitest 测试通过；62 项真实处理器+模拟适配器断言通过；独立 PGlite 会员迁移及 v94/v95 ACL 测试通过；TypeScript、设计门禁和隔离生产构建通过；lint 0 error / 25 warning。

此前 Stripe 沙盒完整流程已覆盖授权、扣款、拒绝不支持地址、取消、回调幂等、退款；真实 Next 登录→校准→Stripe→返回→Claim→Pack 3 通过。最新收货绑定和部分退款规则已通过 SQL 测试，合并后的浏览器全流程仍待复验。不能把这些结果当作生产真实支付验收。

## 开放付款前仍需完成

1. 最终候选 commit 的构建、设计检查、PR CI、手机预览验收。
2. 核对正式部署的 Stripe key/endpoint 匹配关系、站点 URL 与条款同源；写入已批准的条款及履约开关。
3. 核对历史失败 webhook 对应订单；不要重复扣款或重复登记。
4. 确认税务运营配置；inclusive price 只表示金额含税，不代表已配置注册、申报或自动计税。
5. 以关闭收款状态部署，验证页面、权限、回调及定时任务，再决定开放两个收款开关。

## 回退

先关闭环境及数据库两道收款开关。保留回调及对账服务处理已创建的 session 和授权，不删除订单/会员/履约历史，不盲目撤销迁移。旧设备售卖版本不一定兼容新的会员交易；优先前向修复，或仅回退 UI 且保留兼容支付后端。

## 2026-10-10 合并前修复

- 资料页使用 effective_access_role，与 Intel 和投票的数字权益保持一致；实体设备绑定仍单独读取。
- 账户注销开始前登记私有隐藏标记；公开名册、Initiation 头像和成员详情过滤该标记。保留历史名额、订单和履约记录。
- v96_account_deletion_public_visibility 已应用正式数据库。旧匿名化账户按精确 tombstone 邮箱回填；RLS 开启，客户端无表权限。
- 新增 14 项纯单元测试及独立 PGlite v96 回归；设计检查、TypeScript、lint、Vitest 和隔离生产构建通过。正式收款继续关闭。
- 后续运营增强：完整发货后台、旧会员前两包履约记录、通知邮件及异常订单操作入口，按此前约定继续排期。
