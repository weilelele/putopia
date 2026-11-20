# GEO 02 · 购物 Feed：Google Shopping / AI Mode 与 ChatGPT Shopping

> 2026-11-20 · 分支 `claude/geo-shopping-feeds-c2def0`，基于 `claude/geo-site-basics`（PR #337）。
> 规则依据只用官方一手文档，链接见每条事实后。文档没有写明的事项标为「未确认」，没有用推测补上。

## 1. 结论

| 产品 | 价格 | Google 免费商品信息 | ChatGPT Shopping | Feed 里的状态 |
| --- | --- | --- | --- | --- |
| Voyager Membership | $12 | **不上**：属于 Services（无实体商品的在线游戏访问） | **不上**：Feed 面向实体商品 | 不输出 |
| Initial Voyager Pack | $38 | 可上，但**缺真实产品照片** | 同左 | 暂不输出，补照片后改一行 |
| Complete Voyager Pack | $488 | 可上，按 `preorder` 处理到 Console 发货月 | 可上，`pre_order`，仅搜索不结账 | **已输出** |
| Console + Pack 4（老会员升级） | $460 | 不上：只卖给已有 Initial 会员 | 不上 | 不输出 |

新 Feed 路由（只读）：

- Google：`https://www.multiverseco.org/feeds/google.xml`（RSS 2.0，`g:` 命名空间）
- OpenAI：`https://www.multiverseco.org/feeds/openai.jsonl`（JSON Lines）

价格直接取 `INITIATION_PRICES`，库存取 `initiation_availability` RPC 和 `initiationConfigurationError`，与 `/voyager-initiation` 同源。读不到席位时返回 503（附 `Retry-After`），不输出猜测的库存。

## 2. 官方要求摘要

### 2.1 Google Merchant Center

- **必填属性**：`id`、`title`、`description`、`link`、`image_link`、`availability`、`price`；美国免费商品信息还需要 `shipping`（可在账户层设置），新品需要 `brand`。[Product data specification](https://support.google.com/merchants/answer/7052112)、[shipping](https://support.google.com/merchants/answer/6324484)、[Free listings](https://support.google.com/merchants/answer/13889434)
- **价格格式**：`15.00 USD`。美国、加拿大**价格不含税**。[7052112](https://support.google.com/merchants/answer/7052112)
- **availability**：`in_stock` / `out_of_stock` / `preorder` / `backorder`。`preorder` 用于尚未发布的新品，必须带 `availability_date`（ISO 8601，最多一年后），落地页也要显示预计发货日期。三处（落地页、结账、Feed）必须一致。[6324448](https://support.google.com/merchants/answer/6324448)
- **GTIN**：自有品牌、独家销售、定制商品一般没有 GTIN；既无 GTIN 又无 MPN+brand 组合时用 `identifier_exists=no`。不要猜 GTIN。[6324478](https://support.google.com/merchants/answer/6324478)、[6324461](https://support.google.com/merchants/answer/6324461)
- **捆绑**：商家自组、有主商品的捆绑要设 `is_bundle=yes`（免费商品信息也要求）。[6324449](https://support.google.com/merchants/answer/6324449)
- **Feed 文件**：XML 为 RSS 2.0，`<rss>` 上声明 `xmlns:g="http://base.google.com/ns/1.0"`，每个属性用 `g:` 前缀；每次抓取必须包含全部商品，漏掉即视为删除。[14987622](https://support.google.com/merchants/answer/14987622)、[160567](https://support.google.com/merchants/answer/160567)
- **定时抓取**：只支持每天、每周或每月；URL 必须直接指向数据文件，不能挡 Googlebot / AdsBot-Google。[14991445](https://support.google.com/merchants/answer/14991445)
- **不支持的内容（Services）**：不产生有形商品所有权的服务不允许，例子包括 streaming content、online gaming currency；与实体商品捆绑的服务也不允许。[6150006](https://support.google.com/merchants/answer/6150006)
- **周期计费**：周期性付款不支持（美国 Toys 类实体订阅除外）。我们是一次性付款，不受影响。[6150006](https://support.google.com/merchants/answer/6150006)
- **虚假陈述**：不能把履约时间藏在次要文字里，不能把无法履约的商品标为有货，不能隐瞒运费。[6150127](https://support.google.com/merchants/answer/6150127)
- **网站要求**：退换货政策必须清楚可见，不需要登录；即使不接受退货也要明确写出；要有联系方式；结账要有 SSL，价格在结账时不能上涨。[14011730](https://support.google.com/merchants/answer/14011730)、[6363310](https://support.google.com/merchants/answer/6363310)、[9158778](https://support.google.com/merchants/answer/9158778)
- **展示位置**：免费商品信息「可能出现在 Search、Images、Lens、YouTube、Gemini、Shopping 标签」。[13889434](https://support.google.com/merchants/answer/13889434) 我读到的支持文档**没有**写 AI Mode 或 Shopping Graph 与免费商品信息的关系，这点未确认。

### 2.2 OpenAI（ChatGPT Shopping）

- **Feed 规格**：[developers.openai.com/commerce/specs/feed](https://developers.openai.com/commerce/specs/feed)。必填 9 个基础字段 `item_id`、`title`（≤150 字符）、`description`（≤5000 字符）、`url`、`brand`、`seller_name`、`image_url`（直链 JPEG/PNG）、`availability`（`in_stock`/`out_of_stock`/`pre_order`/`backorder`/`unknown`）、`price`（`79.99 USD`），加上 `target_countries`（`["US"]`）和 `store_country`（`US`）。`gtin`、`mpn` 可选。
- **格式与交付**：示例为 JSONL，也提到 CSV/TSV。交付方式在商家后台三选一：手动上传、托管 HTTPS URL、SFTP，每次都是全量快照。[Submit product feeds](https://developers.openai.com/commerce/guides/submit-product-feeds)。刷新频率、文件大小上限文档没写。
- **仅搜索**：`is_eligible_search` 默认 true；`is_eligible_checkout` 关闭时不走 ChatGPT 内结账。商家页 FAQ 说正在「moving away from a standalone Instant Checkout」，购买在商家自己的网站完成，从 ChatGPT 开始的购买不收费。[chatgpt.com/merchants](https://chatgpt.com/merchants)
- **范围**：Partner Playbook 写的是「applicable if you sell physical goods」；`is_digital` 需要另行开通。会员、服务、限量商品是否允许，文档没有写，未确认。
- **准入**：在 [chatgpt.com/merchants#form](https://chatgpt.com/merchants#form) 申请，已申请即进入 waitlist；上传前要在 [Business Hub](https://chatgpt.com/business-hub/) 认领企业并完成身份验证。目前仅对美国 ChatGPT 用户开放。页面还写明：通过 **Shopify 或 Etsy** 销售的商家「catalog is already integrated」，无需另行申请。

## 3. Blocker 与待决事项

按影响排序。前 4 条决定能不能上，后面的影响审核通过率。

1. **Membership 不能进 Google 购物**（政策）。$12 Membership 是在线游戏的会员访问，没有实体商品，属于 Services。它也不能和 Pack 捆绑成「服务 + 实体」上架。OpenAI 侧同样按实体商品处理。处理：Feed 不输出 Membership；Membership 继续靠站点页面、JSON-LD 和内容 GEO 被发现。
2. **Initial Pack 没有可用的真实产品照片**。`pack-1-workbench.webp` 是 ImageGen 编辑图（README 有记录），而且是 WebP，OpenAI 只收 JPEG/PNG。Antenna 图是概念设计，README 写明「Final appearance and quantity remain unconfirmed」。用生成图当商品图属于虚假陈述风险。处理：`FEED_PRODUCTS` 里 Initial 的 `image` 为 `null`，Feed 自动跳过；有了 Pack 1–2 实物照（JPEG/PNG，≥500×500，2027-01-31 起强制）后放进 `public/assets/` 并填上路径即可。**需要你拍照或提供照片。**
3. **价格含税 vs. Google 美国价格不含税**。站点写「Shipping and taxes included」，Feed 按页面实付价报 `488.00 USD`。Google 规定美国价格不含税，如果 Merchant Center 在展示时另加估算税，用户看到的总价会高于实付价。处理：在 Merchant Center 的税费设置里确认美国不另加税；如果做不到，需要你决定是否改为提交不含税价，这会和页面显示的价格不一致。**未确认，需在账户里核对。**
4. **分批发货 / 预售**。Complete Pack 的 Console 计划 2026 年 12 月发货，Pack 4 计划 2027 年 1 月且内容待公布。Google 没有专门说明「一次付款、按月分批寄出」的商品。处理：Feed 把 Complete 标为 `preorder`，`availability_date=2026-12-01T00:00-0800`（Console 发货月第一天），描述里写清各 Pack 计划月份和「计划月份不保证送达」。12 月 1 日起自动变为 `in_stock`。**如果 Console 延期，必须同时改 FAQ 和 `S26_DISPATCHES`**（有测试保证两者一致）。审核若被拒，再向 Google 支持确认分批发货的处理方式。
5. **结构化数据与 Feed 可能不一致**。PR #337 的 `initiationProductJsonLd` 只看席位满不满，checkout 未开时也写 `InStock`，也不区分预售。Google 会比对落地页结构化数据和 Feed。建议后续让 JSON-LD 复用 `shoppingFeedItems` 的 availability（`PreOrder` / `OutOfStock`）。本 PR 按要求不改 `site-seo.ts`。
6. **退货政策要和账户设置一致**。站点政策：未发出的 Pack 可取消退款；已交付的 Pack 不接受无理由退货，损坏、错发、缺件、丢件可补发或退款（`/terms/initiation#refunds`，公开可访问）。Merchant Center 要按这个设置，不能写成「30 天无理由退货」。是否接受已交付商品的退货，由你决定，不由 Feed 决定。
7. **联系方式**。`architect@multiverseco.org` 只出现在条款和隐私页。Google 要求网站上有联系方式，建议在 `/voyager-initiation` 页脚或 FAQ 里放一个可见的联系入口。
8. **Shopify 目录重复**。站点结账走 Shopify。如果 Shopify 店铺的商品已对 Online Store / Google & YouTube 渠道发布，ChatGPT（Shopify 已集成）和 Google 可能再收录一份，价格、链接与本 Feed 不同。处理：每个平台只保留一个商品来源。建议以本 Feed 为准，并在 Shopify 后台关闭这些商品的对外渠道发布；关闭前先确认不会影响结账。**需要你在 Shopify 后台核对。**
9. **类目**。`google_product_category` 用的是文字路径 `Toys & Games > Games`，与 JSON-LD 一致。数字 ID 未从官方 taxonomy 文件核实，上线后看 Merchant Center 是否接受。
10. **席位上限**。100 席满或 checkout 关闭时，两个 Feed 自动变为 `out_of_stock`。S26 结束、不再销售时，应从 `FEED_PRODUCTS` 删掉对应商品（Google 建议停售商品直接删除，而不是长期缺货）。

## 4. 实现说明

- `src/lib/shopping-feed.ts`：纯映射。`FEED_PRODUCTS`（商品、标题、描述、图片、是否捆绑）、`S26_DISPATCHES`（计划发货月）、`shoppingFeedItems(state)`、`googleMerchantFeedXml`、`openAiFeedJsonl`。
- `src/lib/shopping-feed-server.ts`：读取 `initiation_availability` 和每个商品的 checkout 配置。失败返回 `null`。
- `src/app/feeds/google.xml/route.ts`、`src/app/feeds/openai.jsonl/route.ts`：`force-dynamic`，CDN 缓存 5 分钟（`s-maxage=300`），失败时返回 503。
- 运费、处理时间、退货不写在 Google Feed 里，按 Google 建议放在账户层设置。OpenAI 行写 `shipping_price: "0.00 USD"`、`return_policy`、`seller_tos`、`seller_privacy_policy`，`is_eligible_checkout: false`。
- `proxy.ts` 未修改：matcher 已排除 `.xml`；`/feeds/openai.jsonl` 会经过 proxy，但匿名请求不会被重定向，只多一次 Supabase auth 往返，抓取频率很低，不需要排除。
- `robots.ts` 未禁止 `/feeds/`，Googlebot 可以抓取。
- 测试：`src/lib/shopping-feed.test.ts`（价格与 `INITIATION_PRICES` 一致、不含 Membership 和升级包、无照片不输出、预售日期切换、售罄 / 未开放、XML 转义、JSONL 必填字段、发货月与 FAQ 一致）。

## 5. 需要你本人完成的步骤（清单）

我没有创建任何账户、没有接受任何条款、也没有提交任何申请。以下每一步都需要你本人登录操作。

### 5.0 合并前

- [ ] 合并 PR #337，再合并本 PR，等生产部署完成。
- [ ] 打开 `https://www.multiverseco.org/feeds/google.xml` 和 `/feeds/openai.jsonl`，确认能打开、价格是 488.00 USD、Complete 为 `preorder`。
- [ ] 决定 Initial Pack：提供 Pack 1–2 实物照片（JPEG/PNG），或者暂时只上 Complete。
- [ ] 在 Shopify 后台查看 Voyager 商品发布到了哪些销售渠道（见 Blocker 8）。

### 5.1 Google Merchant Center

1. [ ] 用公司 Google 账号登录 [merchants.google.com](https://merchants.google.com/mc)，创建 Merchant Center 账户。一个邮箱只能创建一个账户；**国家选美国，之后不能改**。商品导入方式选「手动 / 文件」，不要选从 Shopify 自动导入（避免与本 Feed 重复）。[12159157](https://support.google.com/merchants/answer/12159157)
2. [ ] 设置 → Business info → Online store，填 `https://www.multiverseco.org`，验证并认领。可选 HTML 标签、HTML 文件、Google Analytics、Google Tag Manager 或 Search Console；**任何需要改代码的方式，告诉我验证码，由我加到站点**。一个网址只能被一个账户认领。[176793](https://support.google.com/merchants/answer/176793)
3. [ ] Business info 填写客服联系方式（邮箱 architect@multiverseco.org 或专用客服邮箱）。
4. [ ] 运费：Shipping and returns → Shipping policies → Add shipping policy。[12577710](https://support.google.com/merchants/answer/12577710)
   - 国家：美国；运费：免费（0 USD，已含在价格里）。
   - 地区：**排除 Alaska、Hawaii、美国海外领地和军邮地址**，只保留 48 个本土州和 DC。
   - 处理时间、运输时间：按实际情况填写，不能比 FAQ 写的更乐观。
5. [ ] 退货：Shipping and returns → Return policies → Add return policy。政策 URL 填 `https://www.multiverseco.org/terms/initiation#refunds`，按站点实际政策选择（见 Blocker 6）。[14011730](https://support.google.com/merchants/answer/14011730)
6. [ ] 税费：确认美国商品不会在价格上另加估算税（见 Blocker 3）。
7. [ ] 产品 → 数据源 → 添加商品数据源 → 定时抓取（Scheduled fetch），文件名 `google.xml`，URL `https://www.multiverseco.org/feeds/google.xml`，频率每天，时区 America/Los_Angeles。[14991445](https://support.google.com/merchants/answer/14991445)
8. [ ] 确认「免费商品信息」处于开启状态（新账户默认开启）。[13889434](https://support.google.com/merchants/answer/13889434)
9. [ ] 首次抓取后看 Diagnostics。如果出现「Unsupported shopping content」「Misrepresentation」或价格 / 库存不一致，把截图发给我。
10. [ ] 每 14 个月至少登录一次，避免账户被停用。[6363310](https://support.google.com/merchants/answer/6363310)

### 5.2 OpenAI / ChatGPT Shopping

1. [ ] 打开 [chatgpt.com/merchants](https://chatgpt.com/merchants)，在表单 `#form` 提交申请。
   - 商家网站：`https://www.multiverseco.org`
   - 主类目：Toys & Games
   - 用途：选「integrating my product feed ... show up in search results on ChatGPT」
   - Feed 规模：0–1M
   - 已申请会进入 waitlist。
2. [ ] 获批或收到邀请后，进入 [Business Hub](https://chatgpt.com/business-hub/)，认领企业并完成身份验证（上传商品前必须完成）。
3. [ ] 选择国家 / 币种：美国 / USD。
4. [ ] 交付方式选「hosted HTTPS URL」，填 `https://www.multiverseco.org/feeds/openai.jsonl`。只开启搜索，不开启 checkout。
5. [ ] 如果 Shopify 商品已自动出现在 ChatGPT（见 Blocker 8），先决定保留哪一个来源，再提交本 Feed。

### 5.3 上线后

- [ ] Console 实际发货日期如有变化，告诉我，同时改 FAQ 和 `S26_DISPATCHES`。
- [ ] 补到 Initial Pack 实物照后，告诉我，我来把它加进 Feed。
- [ ] 在 ChatGPT 和 Google AI Mode 中用目标查询（novelty gift、sci-fi game 等）观察展示情况，交给 geo-measurement 跟踪。
