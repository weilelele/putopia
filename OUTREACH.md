# 高活用户外发 SOP

定期（每次 30–50 人）选出高活用户、分组发邀请邮件，**自动查重、绝不重发**。

## 数据与口径
活跃分 = 归一化加权：评论 **0.45** + 投票 **0.30** + 页面访问 **0.25**（访问用对数归一压长尾）。
- 评论：`comments`（`author_id`，排除 `posted_by_id` 代发）
- 投票：`vote_responses`（`user_id`）
- 访问：PostHog `$pageview`，按 `person.properties.email` 聚合（覆盖不全，是辅助信号）
- 口径：`voyager_profiles.registered_at IS NOT NULL`；**剔除 architect**（内部人）

## 触达记录 / 查重
- 表 `public.outreach_log`（`supabase/schema_v27.sql`）记录每次发送。
- `send-campaign.mjs` 默认查重：**发过的人（任何历史 campaign）自动跳过**，发送成功后才写库。

## 两封邮件（纯回信导向，无链接）
| 邮件 | 收件组 | 行为分组 |
|---|---|---|
| Email 1 — Inner Circle | A/B/C | 有评论和/或投票 |
| Email 2 — Explorers | D | 仅高强度浏览、未互动 |

文案/模板：`top30_invite_email_drafts.md`、`public/email-preview.html`。
发件：`architect@multiverseco.org`，回信进该收件箱（主信号）。

## 每次发送流程
```bash
cd /Users/will/Sites/putopia

# 1) 重新评分，更新 top30_active_users.csv（列：rank,email,display_name,score,
#    comments,votes,pageviews,active_days,utm_source,utm_content,behavior_group）
#    可扩到 50 人；behavior_group 首字母 A/B/C→Email1，D→Email2

# 2) dry-run：看分组人数 + 多少人被查重跳过
node scripts/send-campaign.mjs --campaign=high_activity_2026_07

# 3) 自己先测一封（不写库）
node scripts/send-campaign.mjs --to=你@邮箱.com --send

# 4) 真发（默认查重；发完写 outreach_log）
node scripts/send-campaign.mjs --campaign=high_activity_2026_07 --send
#   可选：--group=1 / --group=2 分批；--no-dedup 关查重（一般别用）
```

## 注意
- `RESEND_API_KEY` / `RESEND_FROM` 在 `.env.local`（gitignored）。
- 发信域名 `multiverseco.org` 须在 Resend 保持 SPF/DKIM 验证。
- 打开率看 Resend 控制台（Apple Mail 预加载会虚高，参考值）；点击无追踪（无链接）。
- 历史触达记录查询：`select * from outreach_log order by sent_at desc;`
