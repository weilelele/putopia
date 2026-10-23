# Voyager Pack 现行定价与权益

2026-10-21 用户确认：Initial Voyager Pack **US$38**；Complete Voyager Pack **US$488**；已有 Initial 用户新增 Console + Pack 4 **US$460**，包括历史 **$12** Initial 买家。一次性付款，无续费。新价只用于新交易，已完成的历史 $520/$400 支付不追收、不改账。

| 购买 | 新实付 | 包裹与权益 |
| --- | --- | --- |
| Initial | $38 | 会员数字权益、Pack 1 欢迎信/徽章、Pack 2 Antenna for Multiverse Console（天线）；不含 Console |
| Complete | $488 | 相同会员权益和四包，含一次 Console Claim |
| Initial 升级 | $460 | 保留原前两包，仅新增 Console 和 Pack 4；历史 $12 用户同价 |

$38+$460=$498，直接 Complete 节省 $10。升级不是按历史实付抵扣；不得自行改为 $450。新支付按价格版本 `voyager-bundles-v1` 记录。Initial 入会占一席，升级不重复占席或重复发前两包。Console 权益仅由 Complete/升级成功付款产生，角色、Initial 或获赠身份不自动具备。

2026-10-23 统一成员规则：历史 $12 Initial 买家经真实有效付款核验后也是正式 Voyager，纳入 S26 的 100 席，与新 Initial、Complete 和获赠成员按账户去重。已登记或已升级者不重复占席；已占席的 Initial 成员在满额时仍可升级。登记引用原历史订单，不新建付款、不改实付金额、支付凭证、包裹记录或实物权益，也不自动发放 Console。退款和争议继续按原资格规则处理；升级退款后，有效的独立 Initial 资格保留。迁移若超过容量或存在跨批次冲突则整体回滚，不能静默遗漏历史买家或扩大容量。

配送美国本土连续48州及DC，标价含运费和适用税费。取消退款按本次购买的包数均分：Initial 两包各$19，Complete 四包各$122，升级两包各$230；历史支付按原条款。原 Initial 支付与升级支付独立。发货计划及实际进度以成员记录为准。

代码、数据库新迁移及 Stripe 三个专用 Price 必须配套；本地实现不代表生产已改价。当前迁移 `schema_v103.sql` 尚未应用，正式环境和实际 Checkout 未验收。详见新定价发布记录。

## Antenna 命名与定位

2026-10-22 命名与定位确认：基础名称 **Antenna**，首次出现 **Antenna for Multiverse Console**。它是组织信物与装饰性收藏物，也用于接收特定品类／方向的平行世界信号；接收时必须安装于 Console 顶部，不能独立接收。成员对可接收内容的认知有限，需要共同探索。英文信物表述采用 **An emblem of the Collective**，避免与未来数字 Token 混淆。当前图展示三种造型／材质方向，不承诺 Pack 2 含三支或用户可选颜色；数量和最终外观仍需确认。见[天线产品口径](../../product/antenna.zh.md)。

## 历史记录

旧 $12 / $520 / $400 方案、旧上线状态和原决策已完整保存在[历史定价档案](pricing-before-20261021.zh.md)，不作为新订单报价。
