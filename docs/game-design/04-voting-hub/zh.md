# 04 · 投票中心（Voting Hub）

## 1. 定位

投票中心是经典的**社区民调系统**，用于"内部圈层共同决策 / 表态"。它是申请人曾经的任务源之一，
也是付费礼包文案里"Inner Circle Access（内圈话语权）"的兑现载体。页面 **`/vote`（VOTING HUB）**。

> 与 Signal Dispatch（03）区分：投票是**有明确选项、有结果、与具体世界无关**的一次性民调；
> Signal Dispatch 是围绕世界的连续辨认解谜。两者底层是不同的表。

## 2. 玩法

- Architect 在后台创建议题：标题、描述、**单选/多选**、选项列表、**作用域 scope**、是否激活、截止时间。
- 玩家在 `/vote` 或首页"ACTIVE VOTES"区块投票；**投票后展示各选项票数/占比**。
- 每人每议题一票（登录用户按 user_id、匿名公开投票按浏览器指纹 anon_token 去重）。

## 3. 角色作用域（谁能投）

`votes.scope` 是角色数组（`schema_v8` 起从单值升级为多值，旧值由 `normalizeScope` 兼容）：

| scope 含义 | 可参与角色 |
|---|---|
| public | applicant / voyager / architect（+匿名访客可投公开票） |
| applicant | applicant / voyager / architect |
| voyager | voyager / architect |
| architect | architect |

> 注意：**所有议题对所有人可见**（scope 控制的是"能否参与"，不是"能否看到"）。

## 4. 数据与权限

| 表 | 说明 |
|---|---|
| `votes` | 议题：title/description/type(single/multi)/scope/options(jsonb)/is_active/ends_at |
| `vote_responses` | 填报：vote_id + (user_id 或 anon_token) + selected_options[]；唯一约束防重复 |

- 结果统计 `getVoteResultsBulk`（缓存 20s）/ `getVoteResults`：按选项 id 累计计数。
- 投票成功会向 Status 流发 `vote_cast` 事件，并向 PostHog 上报 `vote_response_submitted`。
- 创建议题发 `vote_opened` 事件。

## 5. 当前状态与缺口

- ✅ 创建/参与/结果/角色作用域/匿名公开票/动态流与埋点均已上线。
- 🟡 首页 feed 当前**临时隐藏所有投票事件**（见 git 提交 "temporarily hide all vote events"）。
- ⬜ 投票与世界/信号无强联动（不像 Signal Dispatch 那样推进世界）。

## 6. 未来钩子

- 把"内圈投票结果"反哺到世界构筑决策（如众选下一个进入调谐的世界）。
- 议题与批次/标签绑定，做分层话语权。
