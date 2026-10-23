# 历史 Initial 买家统一登记 S26

2026-10-23 用户确认：有效历史 $12 Initial Voyager Pack 买家统一认定为 Voyager，纳入 S26，每个账户占一个名额。原付款记录与实物权益保持不变。

## 实现

- 新增 `supabase/schema_v108.sql`，依赖 v103 的套餐模型与 v105 的付款后校准流程；不编辑旧迁移。**已于 2026-10-23 应用生产 MC Home（`oxwfnmcwovxnrvagxzdz`），迁移版本 `20261023073628`。**
- 成员登记可引用原 `voyager_orders` 付款。只有现有历史资格函数核验通过的真人、正式付款、有效订单进入补登记；退款、争议、测试订单、NPC 不由角色推断资格。
- `initiation_members.user_id` 主键和既有按账户 UNION 的席位计数保证重复购买、既有 Initial、Complete、升级和成员登记只占一个名额。有效成员进入同一公开 S26 名单和 INITIATED 统计；历史收入仍来自原订单。
- 登记只写成员和资料，不生成订单、设备权益、包裹、邮件或付款事件。测试逐表比较迁移前后的原订单、Initiation 订单、设备权益和两套包裹记录。
- 保留既有成员编号、加入时间和 Architect 身份，补齐 S26。跨批次冲突或总占位超过 100 时，迁移事务失败并整体回滚，需先核对容量，不截断名单。
- 后续历史支付回调按原付款资格同步登记；退款和争议同步停用对应资格。独立有效的历史 Initial 保留成员身份，不因另一次 Initial 或升级退款被撤销。退款席位继续沿用原人工复核保留规则。
- 已占席的历史 Initial 可以在满额时购买升级；付款完成更新同一条登记。升级仍走原付款及履约规则，不重复占席；原在途订单继续使用已保存报价。

内部 `legacy_pack` 状态继续表示 Initial 套餐展示，不表示临时成员；S26 归属来自真实成员登记，Console 来自独立的有效付款权益。

## 验证与上线

隔离 PostgreSQL/WASM 回归：

```sh
node supabase/tests/legacy-s26-v108.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js
```

涵盖真实迁移、重复购买、已升级者、旧包已寄出、不合格订单、不改原付款和包裹、重复同步、晚到回调、独立付款退款、来源争议、满额升级、容量保护和 RPC 权限；不读环境变量、不联网、不连接生产。

全仓 `npm test` 96 个文件、814 项通过；`npx tsc --noEmit`、`npm run design:check`、`npm run lint` 通过（lint 0 errors、26 个既有 warnings）。生产构建通过；首次遇到 Webpack WasmHash 缓存异常，将旧 Webpack 缓存保留到 `/private/tmp/putopia-s26-webpack.*` 后重新构建成功。

用户随后明确授权生产迁移与部署。正式 Supabase 迁移已完成并读回确认：59 位有效历史买家全部登记 S26，加上原有 13 位获赠成员，共 72 位 INITIATED，剩余 28 席；重复账户、漏登、资料批次与正式成员权限不一致均为 0。未改 Stripe、收款开关或历史付款金额。

迁移前后整表校验完全一致：`voyager_orders` 413 行、`initiation_orders` 11 行、`device_order_packs` 6 行、`initiation_shipments` 0 行、`initiation_entitlements` 0 行。同步 RPC 仍仅 service_role 可调用。

发布内容从最新 main 独立整理，保留已上线的 Antenna 文案，只包含本次成员登记和满额升级调整。该独立发布树的 92 个测试文件、793 项测试、隔离 SQL 回归、类型检查、design check、lint 和生产构建通过；此前原工作区的 814 项包含其他尚未合入 main 的工作，不随本次发布。
