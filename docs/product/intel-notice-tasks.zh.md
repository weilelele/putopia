# Intel：NOTICE 任务与发布入口

2026-09-23。本次实现范围为 NOTICE 时效与移除 AI 情报生成；Device 页面关联属于后续迭代。

## 分类与权限

- NOTICE：统一的任务发布类型，必须指定截止时间。
- DEVICE：设备相关情报；ORG：组织相关情报。
- 内容类别与 PUBLIC / CLASSIFIED 权限独立，原有阅读权限保持有效。
- Intel 页的筛选仍为 ALL / PUBLIC / CLASSIFIED。

## 任务时效

以 `timestamp` 为发布/开始时间，`expires_at` 为截止时间；保存为带时区时间戳，表单按编辑者本地时间输入。

| 条件 | 状态 | 后续可关联为 Device 进行中任务 |
| --- | --- | --- |
| 当前时间早于 timestamp | TASK NOT STARTED | 否 |
| timestamp ≤ 当前时间 < expires_at | TASK ACTIVE | 是，且须满足阅读权限与项目关联条件 |
| 当前时间 ≥ expires_at | TASK ENDED | 否 |
| 旧 NOTICE 未设截止时间 | ARCHIVED NOTICE | 否 |

到期保留历史文章、图片和评论，不删除或隐藏。列表和详情标记状态；页面打开期间到达截止时间会自动更新。排序仍按 timestamp 倒序，截止时间不影响排序。设置未来 timestamp 不等于定时隐藏发布：文章仍可阅读，只是不算进行中任务。

截止时间必须严格晚于发布/开始时间。支持录入已结束的历史任务。旧 NOTICE 不自动补截止时间；编辑保存时必须补充截止时间或由 Architect 重新分类。非 NOTICE 不保存截止时间。

## 发布入口

保留 Intel 主页面的 Architect 发布入口，以及后台 `/admin/intel` 情报管理。创建、更新和删除的服务端操作均校验 Architect 身份。

移除 `/admin/create-news`、AI NEWS 菜单和 `news-gen.ts` 生成操作。其他模块共享的 AI SDK 保留。Dashboard Feed 是基于现有内容的模板汇总，不创建 Intel，保持原功能。

## 后续 Device 关联

Device 项目应显式选择关联的 NOTICE；有效候选必须同时满足：NOTICE 类型、明确截止时间、已经开始、尚未到期，以及当前用户的阅读权限。到期后应从进行中项目的关联展示移除，但历史 Intel 链接仍有效。

本次不新增 Device 关联字段或选择器，待确定关联对象是设备、批次还是具体项目后实施。共享的 `noticeStatus` 是时效判断依据，不替代服务端权限校验。

## 数据库上线顺序

先执行 `supabase/schema_v75.sql`，再部署应用。迁移增加可空的 expires_at 和 NOT VALID 约束：旧数据保留，新建/更新记录必须符合截止规则。无历史数据批量更新，无定时数据库写入需求。

2026-09-23 已应用到生产数据库 MC Home（oxwfnmcwovxnrvagxzdz），迁移名 intel_notice_task_expiry_v75。字段、约束和索引已核验；18 篇现有情报及 5 篇旧 NOTICE 保留。
