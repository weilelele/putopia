# Initiation briefing · 2026-10-28

用户确认：移除旧第 6 页 Member votes；首屏除独立控件外的内容区域点按均进入下一页；显示 `Tap to continue`；记录点按位置和实际翻页结果。保留原品牌资产、其余页面视觉、套餐和结账路由。投票权益收拢为 Collective 页的一句说明。

## 内容和交互

- 8 页顺序：Device → Collective → Members → Recruiting → Classified → Console / regions → Packs → Join。
- 保留稳定的 `page_id`，仅 `page_index` 随新顺序更新；`briefing_version=2026-10-v2`、`page_count=8` 区分历史数据和存储记录。
- 首屏点按左、中、右、画面和留白均可前进；关闭、声音、Skip、NEXT 各自处理，拖动、选字和滑动不重复触发点按。后续页保留原左右区域、滑动、键盘、NEXT 和 Skip。
- 初始焦点落在静态内容，避免 native dialog 自动聚焦关闭按钮；Tab 仍在按钮上显示原有键盘焦点框。
- `Tap to continue` 使用 Courier Prime、`--fs-caption`（12px）、品牌正文色，放在底部 NEXT 左侧。其余原排版保持。

## 事件

- `initiation_brief_tapped`：首屏点按的 `x_ratio` / `y_ratio`（0–1，三位小数）、内容宽高、输入类型、目标类别（media / copy / background / control）、是否请求翻页及忽略原因。不采集用户文本。
- `initiation_brief_navigation_requested`：所有翻页方式的起止索引、稳定页面 ID、via 和 `navigation_id`。
- `initiation_brief_navigation_succeeded`：React 提交目标页 active 状态后的确认事件，携带相同编号及提交耗时；表示目标页已渲染，不代表用户读完或媒体已加载。
- NEXT / Skip 的首屏位置事件也关联其实际翻页编号；声音和关闭不会误记为内容翻页。

## 浏览器验证

使用临时本地夹具直接加载正式组件，将事件写入可见的调试记录，不连接数据库、登录、邮件和支付服务。夹具验证后已移除。人工交互检查与纯 Vitest 测试分开。

1. 390×844：首屏无横向溢出，显示提示，关闭按钮不自动获得焦点框。[截图](01-first-page.png)。
2. 中央画面与左侧点按均进入第 2 页；位置、请求、成功事件编号一致。声音按钮与纵向拖动保持首屏；Tab 到关闭按钮时焦点框仍可见。
3. 顺序检查第 5 页后直接进入 Console，读屏进度为 `Page 6 of 8`，Skip 到 Join 为 `Page 8 of 8`。[新第 6 页](02-new-page-six.png)。
4. NEXT 的位置事件与 `via=next` 请求、渲染成功一致；后续页面 ID 及表单、套餐未调整。[夹具事件记录](interaction-events.json)。

截图与上一轮真实页面参考（聊天中用户已确认）对照：只更改提示、默认焦点、页面数量及投票权益短句，其余媒体与配色保持。手机截图中的地区和席位为明确夹具数据，不是线上库存记录。
