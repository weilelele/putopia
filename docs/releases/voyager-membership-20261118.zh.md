# S26 $12 Voyager Membership 发布候选 · 2026-11-18

分支 `codex/voyager-membership-12`，PR [#324](https://github.com/weilelele/putopia/pull/324)。

## 当前状态

代码、隔离接口联调、数据库权限回归及手机/桌面操作验收完成。**尚未正式上线，也尚未完成正式 Shopify 付款/退款验收。**

- 生产数据库最后确认到 v126；新增 `supabase/schema_v127.sql` **未应用生产**。
- Shopify 四个商品已创建并从后台重新读取价格，均为 **Draft**；三个实物组合已配置 Online Store + My Store Headless。
- 尚未写入四个新的 `SHOPIFY_LIVE_*_VARIANT_ID`；`INITIATION_MEMBERSHIP_ENABLED` 尚未开启。
- Vercel 生产配置可列出名称，但只读校验进程未获得现有 Shopify 应用凭据。商品 API、渠道可售性和正式结账总额尚待核验。没有导出生产密钥文件，没有运行真实扣款或退款。
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

## Shopify 商品草稿

| 用途 | Shopify Product ID | 价格 | 内容 |
| --- | --- | ---: | --- |
| Voyager Membership | 15476488437951 | $12 | SKU `VOYAGER-MEMBERSHIP-S26`，非实物、不跟踪库存 |
| Initial Membership Upgrade | 15476492304575 | $26 | 原 Pack 1 + Pack 2，各 1 |
| Complete Membership Upgrade | 15476495548607 | $476 | 原 Pack 1–4，各 1 |
| Console + Pack 4 Initial Upgrade | 15476499251391 | $460 | 原 Pack 3 + Pack 4，各 1 |

清单位于 `scripts/shopify/membership-catalog.json`。Product ID 不是结账所需的 ProductVariant ID，禁止混用。

现有凭据可在受信进程中使用后，先运行 `scripts/shopify/check-membership-catalog.mjs --allow-draft --write-env-file <path>` 核对价格、非订阅、数字/实物属性及组合组件，输出文件仅包含四个非敏感 Variant ID。去掉 `--allow-draft` 后还会要求 Unlisted 状态、USD/含税固定价，以及通过现有 Storefront 渠道可售；不会创建订单、购物车、扣款或退款。

使用现有 Shopify 应用权限；不创建新凭据，不扩大授权。校验脚本使用 [Shopify ProductVariant 组件契约](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariantComponent)。

## 服务端处理

- 买家只提交目标档位；金额、会员抵扣资格及来源订单由数据库计算并锁定。
- 订单引用 v2 签名包含金额、定价版本和来源付款；既有 v1 订单继续可恢复。
- Shopify 保持手动捕获；核对签名、买家、USD 总额、准确商品/组件、真实授权及捕获父子关系后激活。
- 席位登记、会员角色、升级、退款及履约更新在数据库事务中完成。重复通知不会重复登记；退款后迟到的成功通知不能恢复权限。
- 退款通知先于付款通知、原会员费退款与升档捕获竞态均有回归；付款需人工核对时不错误授予权益，队列保留，cron 返回失败状态供重试/运维检查。
- 收据和激活入口按订单幂等；PostHog 与 Meta 仅在已核验捕获后按本次实际付款金额归因，授权和像素事件不视为 Purchase。

## 验证记录

- Vitest：120 个文件，1051 项通过。
- TypeScript、design:check、lint（0 error / 26 现有 warning）、隔离配置下的生产构建通过。
- `supabase/tests/voyager-membership-v127.mjs`：12/26/476/460、旧 $12 Pack、满额升档、席位释放、v124 Parallax/Mission 触发器、service_role/客户端 ACL、部分/全额退款、先退款后确认、并发时序、重复通知及重新购买。
- `supabase/tests/voyager-membership-checkout.mjs`：实际 Next 路由和支付/对账代码 → PGlite；认证/同源检查、游客邮箱结账与抵扣确认、防伪造金额、预约复用、签名 webhook、授权/捕获、快照、退款及权限。仅替换供应商/Auth/邮件/分析传输，全程禁止外网。
- 旧 v122/v123 Shopify 结账、v125 分析、v103 Stripe/历史订单回归通过。
- 浏览器 390×844、320×844、1440×1000：购买/升档回调与金额、游客 $26 确认、无横向溢出、无页面异常。浏览器所有外部请求及写入被拦截，不触碰生产数据。
- Shopify 后台价格截图与本机手机截图保存在本次工作区附件中；页面沿用此前确认的图案、图标尺寸、顺序和购买模块位置。

这些结果证明隔离环境内的应用流程，不替代 Shopify 正式商品接口、支付渠道或真实财务验收。

## 正式发布顺序

1. 获得现有 Shopify 凭据的受信运行途径，完成草稿商品 API 核验，保存非敏感 Variant ID。
2. 应用 v127 并确认函数/约束与 service_role ACL；不重放旧迁移，不重置共享数据库。
3. 将四个商品改为 Unlisted，核对既有 Headless 渠道、USD/税费包含、手动捕获和退款事件订阅；运行不带 `--allow-draft` 的核验。
4. 配置四个新 Variant ID，保留原 $38/$488 Variant ID 和现有 Shopify 凭据；新功能开关继续关闭，部署已通过 CI 的候选版本。
5. 在合适的 Shopify 隔离支付环境验收真实供应商授权、捕获、失败、取消与退款；禁止从共享预览执行生产测试收费。若必须处理真实订单，单独取得具体金额及处理方式授权。
6. 正式开启 `INITIATION_MEMBERSHIP_ENABLED=true`，确认页面三档、支付链接和原有订单恢复；观察 webhook 队列/cron、退款权限及实际金额的 Purchase。无需修改原有 S26 容量或重开已在售的旧收款开关。

## 回退

先关闭 Membership 新购入口；保留兼容 v127 的支付回调与对账服务处理已创建的购物车、授权、付款与退款。不要删订单、席位、履约或迁移，不把数据库回退到不认识 Membership 的旧版本。必要时关闭总收款开关暂停新结账，待队列处理后前向修复。既有有效数字会员权限由数据库记录决定，不能因 UI 开关关闭而被清除。
