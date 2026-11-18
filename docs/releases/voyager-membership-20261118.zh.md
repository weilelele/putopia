# S26 $12 Voyager Membership 发布候选 · 2026-11-19

分支 `codex/voyager-membership-12`，PR [#324](https://github.com/weilelele/putopia/pull/324)。

## 当前状态

代码、隔离接口联调、数据库权限回归及手机/桌面操作验收完成。**尚未正式上线，也尚未完成正式 Shopify 付款/退款验收。**

- `supabase/schema_v127.sql` **已于 2026-11-19 应用生产**，迁移名 `v127_voyager_membership_shopify_upgrades_refunds`。应用前后均为 90 个占用席位；新增三个 RPC 均仅供 service_role 执行，anon/authenticated 不可执行。未重放旧迁移或改写订单。
- Shopify 四个商品已从后台核对价格、SKU、非实物属性、组合组件和各 1 数量，保存为 **Unlisted**；现有 Headless 渠道已通过实际可售性核验。
- 四个新的 `SHOPIFY_LIVE_*_VARIANT_ID` **已写入生产配置**；公开 Membership 入口继续关闭。
- 现有 Shopify 密钥仅在已有 Vercel 生产运行环境内使用，未导出或保存。商品目录通过现有 Storefront 权限核验；无需扩大 Admin `read_products` 授权。
- 四个匿名购物车的实际 USD 总额为 12/26/476/460。数字会员无配送组，真实 Shopify 结账页面显示 $12、无配送步骤；银行卡付款仍要求账单地址。未提交付款，也未创建本地席位或客户订单。
- 已确认手动捕获；现有正式 `/api/shopify/webhook` 已订阅创建、付款、更新、取消订单及 `REFUNDS_CREATE`，查询无后续分页。
- 预览默认仍保持原有正式收款入口关闭新 Membership。`/dev/voyager-initiation?membership=choose&checkout=fixture` 使用真实购买界面的安全 fixture 回调，不会创建付款。

## 金额与权益

| 购买路径 | 本次付款 | 新增实物 | S26 席位 |
| --- | ---: | --- | --- |
| 新购 Membership | $12 | 无 | 1 |
| 新购 Initial | $38 | Packs 1–2 | 1 |
| 新购 Complete | $488 | Packs 1–4（含 Console） | 1 |
| Membership → Initial | $26 | Packs 1–2 | 复用 |
| Membership → Complete | $476 | Packs 1–4 | 复用 |
| Initial → Console + Pack 4 | $460 | Packs 3–4 | 复用 |

$12 为一次性 Membership，包含 Mission Briefings、Parallax Array、Classified Intel、Member Votes。执行任务仍须有效 Voyager 身份和已绑定 Console；会员不自动获得 Console claim 或发货记录。旧版 $12 Initial Pack 按真实产品/订单识别，保留原两包及 $460 升档资格。

退原始 Membership 付款即关闭该 Membership 的数字权限并释放席位；包含任何正额的原始会员费退款。只退升档差额（全退或部分退）保留独立的 $12 Membership 和席位。未发出的已退款 Packs 取消本地履约，Console 权益取决于剩余有效订单。已经发出的物流历史保留。

取消实物退款按**每笔付款所购 Pack 数等分**：26/2=13、476/4=119、38/2=19、488/4=122、460/2=230。Shopify 组件本身的原价比例不一定等于这个分摊；退款时须核对实际金额和选中的 Pack。无法对应的部分退款进入人工核对、暂停相关实体权益，独立有效 Membership 保留。退款先在 Shopify 针对正确付款处理，签名 webhook/队列再同步权限；系统不会自行发起未经要求的财务退款。

## Shopify 已核验商品

| 用途 | Product ID | ProductVariant ID | 价格 | 内容 |
| --- | --- | --- | ---: | --- |
| Voyager Membership | 15476488437951 | 68002385887423 | $12 | SKU `VOYAGER-MEMBERSHIP-S26`，非实物、不跟踪库存 |
| Initial Membership Upgrade | 15476492304575 | 68002503164095 | $26 | 原 Pack 1 + Pack 2，各 1 |
| Complete Membership Upgrade | 15476495548607 | 68002572173503 | $476 | 原 Pack 1–4，各 1 |
| Console + Pack 4 Initial Upgrade | 15476499251391 | 68002686042303 | $460 | 原 Pack 3 + Pack 4，各 1 |

清单位于 `scripts/shopify/membership-catalog.json`。Product ID 不是结账所需的 ProductVariant ID，禁止混用。

`scripts/shopify/check-membership-catalog.mjs` 只读核对 USD、订单读取能力、付款/退款通知、非订阅、准确 Variant ID、数字/实物属性、组件 SKU/数量及 Headless 可售性，不写配置文件。Unlisted 状态另在 Shopify 后台核对。商店 `taxesIncluded=false`，后台目前未开启额外税收或数字商品 VAT；保留现有税务配置，以实际购物车总额另行验价，不把未核验的含税假设当作已完成事项。

`SHOPIFY_CATALOG_VERIFY=shop|ready|checkout` 仅用于显式指定的 Vercel 生产候选构建；默认构建不连接 Shopify。`checkout` 才会另建四个匿名验价购物车，不传客户资料，不创建 Putopia 预约、付款、订单或退款，不输出带购物车密钥的链接。

使用现有 Shopify 应用权限；不创建新凭据，不扩大授权。目录采用 [Storefront ProductVariant 组件契约](https://shopify.dev/docs/api/storefront/latest/objects/productvariantcomponent)。现有应用读取 GraphQL `LineItem.variant` 会返回 ACCESS_DENIED，因此共享订单查询已移除此产品关系；数字会员改用 [Order 的只读历史快照](https://shopify.dev/docs/api/admin-rest/latest/resources/order) 中的 `variant_id`，用现有 read_orders 权限核对订单 ID、逐行 ID 和准确商品编号。已在现有生产权限内验证 HTTP 200，数据仅在内存处理。

## 服务端处理

- 买家只提交目标档位；金额、会员抵扣资格及来源订单由数据库计算并锁定。
- 订单引用 v2 签名包含金额、定价版本和来源付款；既有 v1 订单继续可恢复。
- Shopify 保持手动捕获；核对签名、买家、USD 总额、准确商品/组件、真实授权及捕获父子关系后激活。
- 席位登记、会员角色、升级、退款及履约更新在数据库事务中完成。重复通知不会重复登记；退款后迟到的成功通知不能恢复权限。
- 退款通知先于付款通知、原会员费退款与升档捕获竞态均有回归；付款需人工核对时不错误授予权益，队列保留，cron 返回失败状态供重试/运维检查。
- 收据和激活入口按订单幂等；PostHog 与 Meta 仅在已核验捕获后按本次实际付款金额归因，授权和像素事件不视为 Purchase。

## 验证记录

- Vitest：120 个文件，1056 项通过。
- TypeScript、design:check、lint（0 error / 26 现有 warning）、隔离配置下的生产构建通过。
- `supabase/tests/voyager-membership-v127.mjs`：12/26/476/460、旧 $12 Pack、满额升档、席位释放、v124 Parallax/Mission 触发器、service_role/客户端 ACL、部分/全额退款、先退款后确认、并发时序、重复通知及重新购买。
- `supabase/tests/voyager-membership-checkout.mjs`：实际 Next 路由和支付/对账代码 → PGlite；认证/同源检查、游客邮箱结账与抵扣确认、防伪造金额、预约复用、签名 webhook、授权/捕获、订单身份快照、退款及权限。供应商 fixture 不返回 GraphQL 商品变体，强制走与实际权限一致的订单快照读取。仅替换供应商/Auth/邮件/分析传输，全程禁止外网。
- 旧 v122/v123 Shopify 结账、v125 分析、v103 Stripe/历史订单回归通过。
- 浏览器 390×844、320×844、1440×1000：购买/升档回调与金额、游客 $26 确认、无横向溢出、无页面异常。浏览器所有外部请求及写入被拦截，不触碰生产数据。
- Shopify 后台价格截图与本机手机截图保存在本次工作区附件中；页面沿用此前确认的图案、图标尺寸、顺序和购买模块位置。

正式商品接口、目录权限、通知订阅和匿名结账总额已经核验。授权、捕获和退款的应用联动已在隔离环境完整回归，**未把这些结果宣称为真实扣款/退款**。最后的真实试单须由用户在 Shopify 页面完成付款，并针对该测试订单验收退款；公开入口在此之前保持关闭。

## 正式发布顺序

1. 已完成：v127、商品配置、Variant ID、渠道可售性、现有权限、手动捕获、付款/退款订阅及匿名购物车总额核验。
2. 全部本地检查和 CI 通过后，先部署兼容新订单的回调/对账代码，公开 `INITIATION_MEMBERSHIP_ENABLED` 保持关闭；既有 $38/$488 入口继续使用原 Variant ID 和凭据。
3. 准备受保护的验收页面，由用户选定未付费测试邮箱并亲自完成 $12 真实试单；核对捕获、会员、席位和无实体权益，再针对该测试订单退款核对关闭权限/释放席位。不得操作既有客户付款，不切换正在收款的商店到全店测试模式。
4. 真实试单完成后才正式开启 `INITIATION_MEMBERSHIP_ENABLED=true`，确认页面三档、支付链接和原有订单恢复；观察 webhook 队列/cron、退款权限及实际金额的 Purchase。无需修改原有 S26 容量或重开已在售的旧收款开关。

## 回退

先关闭 Membership 新购入口；保留兼容 v127 的支付回调与对账服务处理已创建的购物车、授权、付款与退款。不要删订单、席位、履约或迁移，不把数据库回退到不认识 Membership 的旧版本。必要时关闭总收款开关暂停新结账，待队列处理后前向修复。既有有效数字会员权限由数据库记录决定，不能因 UI 开关关闭而被清除。
